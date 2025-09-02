import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCanceled() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');

  useEffect(() => {
    document.title = "Payment Canceled — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Your payment was canceled. You can try again.");
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Payment Canceled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your payment was canceled and no charges were made.
          </p>
          
          {invoiceId && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Invoice ID</p>
              <p className="font-mono text-sm">{invoiceId}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button asChild>
              <Link to="/invoices">Try Again</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
