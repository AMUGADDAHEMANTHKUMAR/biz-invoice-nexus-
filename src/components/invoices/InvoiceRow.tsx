import React, { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

import { Tables } from "@/integrations/supabase/types";
import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentData } from "@/hooks/usePaymentData";

interface InvoiceRowProps {
  invoice: Tables<'invoices'>;
  onPaymentUpdate: () => void;
  onDelete: () => void;
}

function InvoiceRow({ invoice, onPaymentUpdate, onDelete }: InvoiceRowProps) {
  const { totalPaid, loading: paymentLoading } = usePaymentData(invoice.id);


  const confirmDeleteInvoice = useCallback(() => {
    onDelete();
  }, [onDelete]);

  const { totalAmount, pendingAmount, isFullyPaid, status, statusColor } = useMemo(() => {
    const total = Number(invoice.total || 0);
    const pending = total - totalPaid;
    const fullyPaid = pending <= 0;
    
    let statusText = String(invoice.status);
    let colorClass = '';
    
    if (statusText === 'paid' || fullyPaid) {
      statusText = 'Paid';
      colorClass = 'bg-success/20 text-success border border-success/30';
    } else if (statusText === 'draft') {
      statusText = 'Draft';
      colorClass = 'bg-muted text-muted-foreground border border-border';
    } else if (invoice.due_date && new Date(invoice.due_date) < new Date()) {
      statusText = 'Overdue';
      colorClass = 'bg-destructive/20 text-destructive border border-destructive/30';
    } else {
      statusText = 'Pending';
      colorClass = 'bg-warning/20 text-warning border border-warning/30';
    }
    
    return {
      totalAmount: total,
      pendingAmount: pending,
      isFullyPaid: fullyPaid,
      status: statusText,
      statusColor: colorClass
    };
  }, [invoice.total, invoice.status, invoice.due_date, totalPaid]);

  return (
    <TableRow>
      <TableCell className="font-medium">{invoice.invoice_number || `INV-${invoice.id.slice(0,8)}`}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${statusColor}`}>
          {status}
        </span>
      </TableCell>
      <TableCell className="font-medium">${totalAmount.toFixed(2)}</TableCell>
      <TableCell className="font-medium text-success">
        {paymentLoading ? <Skeleton className="h-4 w-12" /> : `$${totalPaid.toFixed(2)}`}
      </TableCell>
      <TableCell className="font-medium text-warning">
        {paymentLoading ? <Skeleton className="h-4 w-12" /> : (isFullyPaid ? '-' : `$${pendingAmount.toFixed(2)}`)}
      </TableCell>
      <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</TableCell>
      <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          
          <Button variant="outline" size="icon" onClick={confirmDeleteInvoice} aria-label="Delete invoice">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default React.memo(InvoiceRow);