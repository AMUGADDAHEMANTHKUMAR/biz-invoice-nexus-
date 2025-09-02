import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalRevenue: number;
  pendingCount: number;
  monthlyRevenue: number;
  overdueAmount: number;
  revenueChartData: Array<{month: string; revenue: number}>;
  statusChartData: Array<{name: string; value: number; color: string}>;
  loading: boolean;
}

let dashboardCache: { data: DashboardStats; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute

export function useDashboardData() {
  const [data, setData] = useState<DashboardStats>({
    totalRevenue: 0,
    pendingCount: 0,
    monthlyRevenue: 0,
    overdueAmount: 0,
    revenueChartData: [],
    statusChartData: [],
    loading: true
  });

  const loadData = useCallback(async (useCache = true) => {
    if (useCache && dashboardCache && Date.now() - dashboardCache.timestamp < CACHE_DURATION) {
      setData(dashboardCache.data);
      return;
    }

    setData(prev => ({ ...prev, loading: true }));

    const [{ data: payments }, { data: invoices }] = await Promise.all([
      supabase.from('invoice_payments').select('amount, paid_at'),
      supabase.from('invoices').select('status, due_date, total').eq('is_deleted', false)
    ]);

    const total = (payments || []).reduce((sum, p: any) => sum + Number(p.amount || 0), 0);

    // Monthly revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTotal = (payments || []).filter((p: any) => p.paid_at && new Date(p.paid_at) >= startOfMonth)
      .reduce((sum, p: any) => sum + Number(p.amount || 0), 0);

    // Pending invoices
    const pending = (invoices || []).filter((i: any) => String(i.status) !== 'paid');
    
    // Overdue amount
    const overdue = pending.filter((i: any) => i.due_date && new Date(i.due_date) < new Date())
      .reduce((sum, i: any) => sum + Number(i.total || 0), 0);

    // Chart data
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return date;
    });

    const chartData = last6Months.map(date => {
      const monthPayments = (payments || []).filter((p: any) => {
        if (!p.paid_at) return false;
        const paymentDate = new Date(p.paid_at);
        return paymentDate.getMonth() === date.getMonth() && 
               paymentDate.getFullYear() === date.getFullYear();
      });
      const monthRevenue = monthPayments.reduce((sum, p: any) => sum + Number(p.amount || 0), 0);
      
      return {
        month: date.toLocaleDateString('en', { month: 'short' }),
        revenue: monthRevenue
      };
    });

    // Status chart data
    const statusData = [
      { name: 'Paid', value: (invoices || []).filter((i: any) => i.status === 'paid').length, color: 'hsl(var(--success))' },
      { name: 'Pending', value: pending.filter((i: any) => i.due_date && new Date(i.due_date) >= new Date()).length, color: 'hsl(var(--warning))' },
      { name: 'Overdue', value: pending.filter((i: any) => i.due_date && new Date(i.due_date) < new Date()).length, color: 'hsl(var(--destructive))' },
      { name: 'Draft', value: (invoices || []).filter((i: any) => i.status === 'draft').length, color: 'hsl(var(--muted-foreground))' }
    ].filter(item => item.value > 0);

    const dashboardData = {
      totalRevenue: total,
      pendingCount: pending.length,
      monthlyRevenue: monthTotal,
      overdueAmount: overdue,
      revenueChartData: chartData,
      statusChartData: statusData,
      loading: false
    };

    // Cache the result
    dashboardCache = { data: dashboardData, timestamp: Date.now() };
    setData(dashboardData);
  }, []);

  const refreshData = useCallback(() => {
    return loadData(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { ...data, refreshData };
}