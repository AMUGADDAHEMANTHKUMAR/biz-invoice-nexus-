import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentData {
  totalPaid: number;
  paymentCount: number;
  loading: boolean;
}

const paymentCache = new Map<string, { data: PaymentData; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export function usePaymentData(invoiceId: string) {
  const [data, setData] = useState<PaymentData>({ totalPaid: 0, paymentCount: 0, loading: true });

  const loadPayments = useCallback(async (useCache = true) => {
    if (useCache) {
      const cached = paymentCache.get(invoiceId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        return cached.data;
      }
    }

    setData(prev => ({ ...prev, loading: true }));
    
    const { data: payments } = await supabase
      .from('invoice_payments')
      .select('amount')
      .eq('invoice_id', invoiceId)
      .eq('payment_status', 'paid');
    
    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paymentData = { totalPaid, paymentCount: payments?.length || 0, loading: false };
    
    // Cache the result
    paymentCache.set(invoiceId, { data: paymentData, timestamp: Date.now() });
    setData(paymentData);
    return paymentData;
  }, [invoiceId]);

  const refreshPayments = useCallback(() => {
    return loadPayments(false);
  }, [loadPayments]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  return { ...data, refreshPayments };
}