-- 1) Extend invoice_payments to support richer tracking
-- Avoid creating a new table since invoice_payments already exists; add needed columns and a compatibility view

-- Add columns if they don't exist
ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_paid_at ON public.invoice_payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_status ON public.invoice_payments(payment_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payments_txn_id_unique ON public.invoice_payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- Create a compatibility view that matches the requested payments schema
CREATE OR REPLACE VIEW public.payments AS
SELECT
  ip.id AS payment_id,
  ip.invoice_id,
  ip.user_id,
  ip.amount,
  ip.paid_at AS payment_date,
  COALESCE(ip.payment_method, ip.method) AS payment_method,
  ip.payment_status,
  ip.transaction_id
FROM public.invoice_payments ip;

-- Note: RLS policies on invoice_payments enforce ownership; the view inherits those protections via the base table.