import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    document.title = "Payment Success — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Your payment was successful. Thank you!");
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your payment has been processed successfully.
          </p>
          
          {invoiceId && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Invoice ID</p>
              <p className="font-mono text-sm">{invoiceId}</p>
            </div>
          )}

          {sessionId?.includes('mock') && (
            <div className="rounded-lg bg-accent/20 p-3">
              <p className="text-sm text-accent-foreground">
                🎭 Mock Payment Mode
              </p>
              <p className="text-xs text-muted-foreground">
                This was a simulated payment for testing purposes
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button asChild>
              <Link to="/invoices">View Invoices</Link>
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
