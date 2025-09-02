-- Fix linter: set explicit search_path and security definer on functions
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create or replace function public.apply_updated_at_trigger(_table regclass)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('create or replace trigger set_updated_at before update on %s for each row execute function public.update_updated_at_column();', _table);
end;
$$;