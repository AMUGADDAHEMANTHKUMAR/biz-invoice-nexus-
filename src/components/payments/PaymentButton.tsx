import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useState, useEffect } from "react";
import PartialPaymentDialog from "./PartialPaymentDialog";

interface PaymentButtonProps {
  invoice: Pick<Tables<'invoices'>, 'id' | 'invoice_number' | 'total' | 'status'>;
  onPaymentUpdate?: () => void;
}

export default function PaymentButton({ invoice, onPaymentUpdate }: PaymentButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Load existing payments for this invoice
  useEffect(() => {
    const loadPayments = async () => {
      const { data: payments } = await supabase
        .from('invoice_payments')
        .select('amount')
        .eq('invoice_id', invoice.id)
        .eq('payment_status', 'paid');
      
      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setPaidAmount(totalPaid);
    };
    loadPayments();
  }, [invoice.id]);

  const remainingAmount = Number(invoice.total) - paidAmount;
  const isFullyPaid = remainingAmount <= 0;

  const handlePaymentClick = () => {
    if (remainingAmount <= 0) return;
    setShowPaymentDialog(true);
  };

  const handlePaymentComplete = () => {
    // Refresh payment data
    const loadPayments = async () => {
      const { data: payments } = await supabase
        .from('invoice_payments')
        .select('amount')
        .eq('invoice_id', invoice.id)
        .eq('payment_status', 'paid');
      
      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setPaidAmount(totalPaid);
      onPaymentUpdate?.();
    };
    loadPayments();
  };

  const getButtonText = () => {
    if (isFullyPaid) return 'Paid';
    if (paidAmount > 0) return 'Pending';
    return 'Pending';
  };

  const getButtonVariant = () => {
    if (isFullyPaid) return 'default';
    return 'secondary';
  };

  return (
    <>
      <Button 
        size="sm" 
        onClick={handlePaymentClick} 
        disabled={isFullyPaid} 
        variant={getButtonVariant()}
      >
        {getButtonText()}
      </Button>

      <PartialPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        invoice={invoice}
        paidAmount={paidAmount}
        onPaymentComplete={handlePaymentComplete}
      />
    </>
  );
}
