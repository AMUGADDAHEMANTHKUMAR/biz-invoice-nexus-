import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SimpleBarChartProps {
  data: Array<{
    month: string;
    revenue: number;
  }>;
}

export default function RevenueChart({ data }: SimpleBarChartProps) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  
  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div className="w-8 text-xs text-muted-foreground font-medium">
            {item.month}
          </div>
          <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
            <div 
              className="bg-accent h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
            />
          </div>
          <div className="w-16 text-xs text-right font-medium">
            ${item.revenue.toFixed(0)}
          </div>
        </div>
      ))}
    </div>
  );
}