-- Ensure payments view uses SECURITY INVOKER semantics so it runs with the permissions of the querying user
-- and respects RLS of underlying tables for that user.
CREATE OR REPLACE VIEW public.payments
WITH (security_invoker = on)
AS
SELECT 
  id AS payment_id,
  invoice_id,
  user_id,
  amount,
  paid_at AS payment_date,
  COALESCE(payment_method, method) AS payment_method,
  payment_status,
  transaction_id
FROM public.invoice_payments ip;