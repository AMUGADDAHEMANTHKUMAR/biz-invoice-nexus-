import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, LineChart, PlusCircle, Calendar } from "lucide-react";

interface MonthStat {
  key: string;
  label: string;
  total: number;
  invoices: number;
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [revenueAllTime, setRevenueAllTime] = useState(0);
  const [invoiceCounts, setInvoiceCounts] = useState({ total: 0, paid: 0, pending: 0, overdue: 0, draft: 0 });
  const [clientCount, setClientCount] = useState(0);
  const [months, setMonths] = useState<MonthStat[]>([]);

  useEffect(() => {
    document.title = "Analytics — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Analytics: revenue trends, status breakdown, and top clients.");
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1); // last 6 months
      const { data: payments } = await supabase
        .from('invoice_payments')
        .select('amount, paid_at, user_id');

      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, total, created_at, due_date, is_deleted')
        .eq('is_deleted', false);

      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('is_deleted', false);

      const allPaid = (payments || []).filter(p => !!p.paid_at);
      const revenue = allPaid.reduce((s, p: any) => s + Number(p.amount || 0), 0);
      setRevenueAllTime(revenue);

      const counts = { total: 0, paid: 0, pending: 0, overdue: 0, draft: 0 };
      const inv = (invoices || []);
      counts.total = inv.length;
      for (const i of inv as any[]) {
        const status = String(i.status);
        if (status === 'paid') counts.paid++;
        else if (status === 'draft') counts.draft++;
        else {
          const due = i.due_date ? new Date(i.due_date) : null;
          if (due && due < new Date() && status !== 'paid') counts.overdue++; else counts.pending++;
        }
      }
      setInvoiceCounts(counts);
      setClientCount(clients?.length || 0);

      const labels = ['Mar','Apr','May','Jun','Jul','Aug'];
      const calcMonths: MonthStat[] = Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(start.getFullYear(), start.getMonth() + idx, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label = labels[idx] || d.toLocaleString('en', { month: 'short' });
        const mPays = allPaid.filter((p: any) => p.paid_at && new Date(p.paid_at).getMonth() === d.getMonth() && new Date(p.paid_at).getFullYear() === d.getFullYear());
        const total = mPays.reduce((s: number, p: any) => s + Number(p.amount||0), 0);
        const invoicesCount = (invoices||[]).filter((i: any) => i.status === 'paid' && new Date(i.created_at).getMonth() === d.getMonth() && new Date(i.created_at).getFullYear() === d.getFullYear()).length;
        return { key, label, total, invoices: invoicesCount };
      });
      setMonths(calcMonths);
      setLoading(false);
    };
    load();
  }, []);

  const avgInvoice = useMemo(() => invoiceCounts.total ? revenueAllTime / invoiceCounts.total : 0, [invoiceCounts.total, revenueAllTime]);
  const paidRate = useMemo(() => invoiceCounts.total ? (invoiceCounts.paid / invoiceCounts.total) * 100 : 0, [invoiceCounts]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Revenue, activity, and client insights.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <PlusCircle style={{ color: 'hsl(var(--success))' }} className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">${revenueAllTime.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{invoiceCounts.total}</div>
                <p className="text-xs text-muted-foreground">{invoiceCounts.paid} paid, {invoiceCounts.pending} pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{clientCount}</div>
                <p className="text-xs text-muted-foreground">Active clients</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Invoice Value</CardTitle>
                <LineChart className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">${avgInvoice.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{paidRate.toFixed(1)}% paid rate</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="space-y-3">
                {months.map((m) => (
                  <div key={m.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{m.label}</span>
                      <span>${m.total.toFixed(2)} • {m.invoices} invoices</span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted overflow-hidden">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${Math.min(100, m.total === 0 ? 0 : 20 + Math.log10(m.total + 1) * 20)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <StatusRow label="Paid" value={invoiceCounts.paid} percent={pct(invoiceCounts.paid, invoiceCounts.total)} colorVar="--success" />
            <StatusRow label="Pending" value={invoiceCounts.pending} percent={pct(invoiceCounts.pending, invoiceCounts.total)} colorVar="--warning" />
            <StatusRow label="Overdue" value={invoiceCounts.overdue} percent={pct(invoiceCounts.overdue, invoiceCounts.total)} colorVar="--destructive" />
            <StatusRow label="Draft" value={invoiceCounts.draft} percent={pct(invoiceCounts.draft, invoiceCounts.total)} colorVar="--muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <Empty text="No clients yet. Add clients to see analytics." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Empty text="No invoices yet. Create your first invoice to see activity." />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function pct(part: number, total: number) { return total ? Math.round((part / total) * 100) : 0; }

function StatusRow({ label, value, percent, colorVar }: { label: string; value: number; percent: number; colorVar: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(var(${colorVar}))` }} />
        <span>{label}</span>
      </div>
      <div className="text-muted-foreground">{value} ({percent}%)</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground">{text}</div>;
}
