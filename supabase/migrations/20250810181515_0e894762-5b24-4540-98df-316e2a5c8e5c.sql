-- Enable required extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'theme_mode') then
    create type public.theme_mode as enum ('light','dark','system');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum ('draft','sent','paid','overdue');
  end if;
end $$;

-- Updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Invoice numbering sequence and trigger
create sequence if not exists public.invoice_number_seq;

create or replace function public.set_invoice_number()
returns trigger as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

-- 1) profiles (Users table)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  theme public.theme_mode not null default 'system',
  email_opt_in boolean not null default true,
  notification_preferences jsonb not null default '{}'::jsonb,
  default_currency text not null default 'USD',
  default_tax_rate numeric(5,2) not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
for select to authenticated using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
for insert to authenticated with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
for update to authenticated using (auth.uid() = id);

-- 2) user_sessions
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  user_agent text,
  ip_address text
);

alter table public.user_sessions enable row level security;

create policy "Users can manage own sessions" on public.user_sessions
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  company text,
  address text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "Users can select own clients" on public.clients
for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert own clients" on public.clients
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own clients" on public.clients
for update to authenticated using (auth.uid() = user_id);

create policy "Users can delete own clients" on public.clients
for delete to authenticated using (auth.uid() = user_id);

create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_clients_email on public.clients(email);
create index if not exists idx_clients_name on public.clients(name);

-- 4) invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_number text unique,
  status public.invoice_status not null default 'draft',
  issue_date timestamptz not null default now(),
  due_date timestamptz not null,
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_invoice_number_before_insert
before insert on public.invoices
for each row execute function public.set_invoice_number();

alter table public.invoices enable row level security;

create policy "Users can select own invoices" on public.invoices
for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert own invoices" on public.invoices
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own invoices" on public.invoices
for update to authenticated using (auth.uid() = user_id);

create policy "Users can delete own invoices" on public.invoices
for delete to authenticated using (auth.uid() = user_id);

create index if not exists idx_invoices_user_id on public.invoices(user_id);
create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_due_date on public.invoices(due_date);

-- 5) invoice_line_items
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity integer not null default 1,
  rate numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  position integer,
  created_at timestamptz not null default now()
);

alter table public.invoice_line_items enable row level security;

create policy "Users can select own line items" on public.invoice_line_items
for select to authenticated using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.user_id = auth.uid()
  )
);

create policy "Users can insert own line items" on public.invoice_line_items
for insert to authenticated with check (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.user_id = auth.uid()
  )
);

create policy "Users can update own line items" on public.invoice_line_items
for update to authenticated using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.user_id = auth.uid()
  )
);

create policy "Users can delete own line items" on public.invoice_line_items
for delete to authenticated using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.user_id = auth.uid()
  )
);

create index if not exists idx_line_items_invoice_id on public.invoice_line_items(invoice_id);

-- 6) invoice_payments
create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  method text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.invoice_payments enable row level security;

create policy "Users can select own payments" on public.invoice_payments
for select to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()
  )
);

create policy "Users can insert own payments" on public.invoice_payments
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()
  )
);

create policy "Users can update own payments" on public.invoice_payments
for update to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()
  )
);

create policy "Users can delete own payments" on public.invoice_payments
for delete to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()
  )
);

create index if not exists idx_invoice_payments_invoice_id on public.invoice_payments(invoice_id);
create index if not exists idx_invoice_payments_user_id on public.invoice_payments(user_id);

-- 7) company_settings
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text not null,
  address text,
  phone text,
  website text,
  logo_url text,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_settings enable row level security;

create policy "Users can select own company settings" on public.company_settings
for select to authenticated using (auth.uid() = user_id);

create policy "Users can upsert own company settings" on public.company_settings
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8) invoice_templates
create table if not exists public.invoice_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  template_json jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoice_templates enable row level security;

create policy "Users can select own templates" on public.invoice_templates
for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert own templates" on public.invoice_templates
for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own templates" on public.invoice_templates
for update to authenticated using (auth.uid() = user_id);

create policy "Users can delete own templates" on public.invoice_templates
for delete to authenticated using (auth.uid() = user_id);

create index if not exists idx_invoice_templates_user_id on public.invoice_templates(user_id);

-- 9) activity_logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create policy "Users can select own activity logs" on public.activity_logs
for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert own activity logs" on public.activity_logs
for insert to authenticated with check (auth.uid() = user_id);

-- Triggers for updated_at
create or replace function public.apply_updated_at_trigger(_table regclass) returns void as $$
begin
  execute format('create or replace trigger set_updated_at before update on %s for each row execute function public.update_updated_at_column();', _table);
end; $$ language plpgsql;

select public.apply_updated_at_trigger('public.profiles');
select public.apply_updated_at_trigger('public.clients');
select public.apply_updated_at_trigger('public.invoices');
select public.apply_updated_at_trigger('public.company_settings');
select public.apply_updated_at_trigger('public.invoice_templates');

-- Storage: company-logos bucket and policies
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

-- Allow public read of company logos
create policy "Public can view company logos"
  on storage.objects for select
  using (bucket_id = 'company-logos');

-- Users can manage their own logo files inside a folder named with their user id
create policy "Users can upload their own logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own logos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'company-logos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own logos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos' and auth.uid()::text = (storage.foldername(name))[1]
  );
