import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

interface PartialPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Pick<Tables<'invoices'>, 'id' | 'invoice_number' | 'total'>;
  paidAmount: number;
  onPaymentComplete: () => void;
}

export default function PartialPaymentDialog({ 
  open, 
  onOpenChange, 
  invoice, 
  paidAmount,
  onPaymentComplete 
}: PartialPaymentDialogProps) {
  const { toast } = useToast();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const remainingAmount = Number(invoice.total) - paidAmount;
  const maxAmount = remainingAmount;

  const handlePayment = async () => {
    const amount = Number(paymentAmount);
    
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid payment amount." });
      return;
    }

    if (amount > maxAmount) {
      toast({ title: "Amount too high", description: `Payment cannot exceed remaining balance of $${maxAmount.toFixed(2)}.` });
      return;
    }

    try {
      setLoading(true);
      const amountCents = Math.round(amount * 100);

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          invoiceId: invoice.id,
          amount: amountCents,
          currency: 'usd',
          description: `Partial Payment - Invoice ${invoice.invoice_number || invoice.id.slice(0,8)}`,
          successPath: '/payment-success',
          cancelPath: '/payment-canceled'
        }
      });

      if (error) throw error;
      if (data?.url) {
        // Mock payment - directly redirect to success page
        window.location.href = data.url;
        onOpenChange(false);
        onPaymentComplete();
      } else {
        toast({ title: "Payment error", description: "No checkout URL returned." });
      }
    } catch (e: any) {
      toast({ title: "Payment failed", description: e.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Enter the amount you want to pay for this invoice.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Invoice Total</Label>
              <p className="font-medium">${Number(invoice.total).toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Already Paid</Label>
              <p className="font-medium text-success">${paidAmount.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Remaining</Label>
              <p className="font-medium text-warning">${remainingAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-amount">Payment Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min="0.01"
              max={maxAmount}
              step="0.01"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPaymentAmount(remainingAmount.toFixed(2))}
              >
                Pay Full Amount
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPaymentAmount((remainingAmount / 2).toFixed(2))}
              >
                Pay Half
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={loading || !paymentAmount}>
            {loading ? 'Processing...' : `Pay $${Number(paymentAmount || 0).toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}