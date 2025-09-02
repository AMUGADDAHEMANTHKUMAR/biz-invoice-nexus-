import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader as AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import InvoiceRow from "@/components/invoices/InvoiceRow";

export default function Invoices() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Tables<'invoices'>[]>([]);
  const [clients, setClients] = useState<Array<Pick<Tables<'clients'>, 'id' | 'name'>>>([]);

  // Quick create
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string | undefined>();
  const [dueDate, setDueDate] = useState<string>("");
  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Tables<'invoices'> | null>(null);
  const [lastDeletedInvoiceId, setLastDeletedInvoiceId] = useState<string | null>(null);
  useEffect(() => {
    document.title = "Invoices — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Create, send, and track invoices.");
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: inv, error: invErr }, { data: cls, error: clsErr }] = await Promise.all([
        supabase.from('invoices').select('*').eq('is_deleted', false).order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name').order('name'),
      ]);
      if (invErr) toast({ title: 'Failed to load invoices', description: invErr.message });
      if (clsErr) toast({ title: 'Failed to load clients', description: clsErr.message });
      setInvoices(inv || []);
      setClients(cls || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const createInvoice = async () => {
    if (!clientId || !dueDate) {
      toast({ title: 'Client and due date are required' });
      return;
    }
    const { data, error } = await supabase.from('invoices').insert({
      client_id: clientId,
      due_date: new Date(dueDate).toISOString(),
      status: 'draft',
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      total: 0,
      notes: null,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    }).select('*').maybeSingle();
    if (error) {
      toast({ title: 'Failed to create invoice', description: error.message });
    } else {
      toast({ title: 'Invoice created', description: data?.invoice_number || data?.id });
      setOpen(false);
      setClientId(undefined);
      setDueDate("");
      loadData();
    }
  };

  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    if (!dueDate) setDueDate(defaultDueDate);
  }, [defaultDueDate, dueDate]);

  const confirmDeleteInvoice = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('invoices')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Failed to delete invoice', description: error.message });
      return;
    }
    setLastDeletedInvoiceId(deleteTarget.id);
    setInvoices((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({
      title: 'Invoice deleted',
      action: (
        <Button
          size="sm"
          onClick={async () => {
            if (!lastDeletedInvoiceId) return;
            const { error: undoErr } = await supabase
              .from('invoices')
              .update({ is_deleted: false, deleted_at: null })
              .eq('id', lastDeletedInvoiceId);
            if (undoErr) {
              toast({ title: 'Undo failed', description: undoErr.message });
            } else {
              loadData();
              toast({ title: 'Invoice restored' });
            }
          }}
        >
          Undo
        </Button>
      ),
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of all invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/invoices/new">Create Invoice</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">Quick Create</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Quick Create Invoice</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Client</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Due date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="pt-2 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={createInvoice}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-6 w-1/3 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">No invoices yet. Create your first invoice to get started.</p>
            <Button asChild>
              <Link to="/invoices/new">Create Your First Invoice</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Pending Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <InvoiceRow 
                      key={inv.id} 
                      invoice={inv} 
                      onPaymentUpdate={loadData}
                      onDelete={() => setDeleteTarget(inv)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {invoices.map((inv) => (
                <div key={inv.id} className="bg-background border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{inv.invoice_number || `INV-${inv.id.slice(0,8)}`}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === 'paid' ? 'bg-success/20 text-success border border-success/30' :
                          inv.status === 'draft' ? 'bg-muted text-muted-foreground border border-border' :
                          (inv.due_date && new Date(inv.due_date) < new Date()) ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                          'bg-warning/20 text-warning border border-warning/30'
                        }`}>
                          {inv.status === 'paid' ? 'Paid' : 
                           inv.status === 'draft' ? 'Draft' : 
                           (inv.due_date && new Date(inv.due_date) < new Date()) ? 'Overdue' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteTarget(inv)}
                      aria-label="Delete invoice"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-medium">Total:</span> ${Number(inv.total || 0).toFixed(2)}</div>
                    <div><span className="font-medium">Due:</span> {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</div>
                    <div><span className="font-medium">Created:</span> {new Date(inv.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? You can undo shortly after deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
