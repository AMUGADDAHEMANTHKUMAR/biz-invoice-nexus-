interface InvoiceStatusChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export default function InvoiceStatusChart({ data }: InvoiceStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No invoice data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{item.value}</span>
              <span>({percentage.toFixed(0)}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}