-- Soft delete support for clients and invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_is_deleted ON public.invoices(is_deleted);
CREATE INDEX IF NOT EXISTS idx_clients_is_deleted ON public.clients(is_deleted);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON public.invoices(deleted_at);
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON public.clients(deleted_at);

-- Keep updated_at fresh if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'updated_at'
  ) THEN
    PERFORM public.apply_updated_at_trigger('public.invoices');
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'updated_at'
  ) THEN
    PERFORM public.apply_updated_at_trigger('public.clients');
  END IF;
END $$;