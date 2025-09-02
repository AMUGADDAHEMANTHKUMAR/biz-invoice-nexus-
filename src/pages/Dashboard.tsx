import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RevenueChart from "@/components/dashboard/RevenueChart";
import InvoiceStatusChart from "@/components/dashboard/InvoiceStatusChart";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Dashboard() {
  useEffect(() => {
    document.title = "Dashboard — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Key revenue, invoices, and overdue insights at a glance.");
  }, []);

  const {
    totalRevenue,
    pendingCount,
    monthlyRevenue,
    overdueAmount,
    revenueChartData,
    statusChartData,
    loading,
    refreshData
  } = useDashboardData();

  const Stat = useMemo(() => ({ label, value, isLoading }: { label: string; value: string; isLoading?: boolean }) => (
    <Card className="transition-all hover:shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
        )}
      </CardContent>
    </Card>
  ), []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your business pulse: revenue, invoices, and trends.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} isLoading={loading} />
        <Stat label="Pending Invoices" value={`${pendingCount}`} isLoading={loading} />
        <Stat label="Monthly Revenue" value={`$${monthlyRevenue.toFixed(2)}`} isLoading={loading} />
        <Stat label="Overdue" value={`$${overdueAmount.toFixed(2)}`} isLoading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="transition-all hover:shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-4" />
                    <Skeleton className="flex-1 h-6" />
                    <Skeleton className="w-16 h-4" />
                  </div>
                ))}
              </div>
            ) : revenueChartData.length > 0 ? (
              <RevenueChart data={revenueChartData} />
            ) : (
              <div className="h-48 rounded-md bg-muted flex items-center justify-center text-sm text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="transition-all hover:shadow-sm">
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-3 h-3 rounded-full" />
                      <Skeleton className="w-16 h-4" />
                    </div>
                    <Skeleton className="w-12 h-4" />
                  </div>
                ))}
              </div>
            ) : statusChartData.length > 0 ? (
              <InvoiceStatusChart data={statusChartData} />
            ) : (
              <div className="h-48 rounded-md bg-muted flex items-center justify-center text-sm text-muted-foreground">
                No invoice data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
