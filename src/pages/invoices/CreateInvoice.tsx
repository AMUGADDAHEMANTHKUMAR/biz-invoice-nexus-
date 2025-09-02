import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LineItem { id: string; description: string; quantity: number; rate: number; }

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clients, setClients] = useState<Array<Pick<Tables<'clients'>, 'id' | 'name'>>>([]);
  const [clientId, setClientId] = useState<string | undefined>();
  const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "Web development services", quantity: 1, rate: 0 },
  ]);

  useEffect(() => {
    document.title = "Create Invoice — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Create a new invoice with line items, taxes, and notes.");
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('clients').select('id, name').eq('is_deleted', false).order('name');
      setClients(data || []);
    };
    load();

    // Load draft
    const draft = localStorage.getItem('invoice_draft');
    if (draft) {
      try {
        const d = JSON.parse(draft);
        setClientId(d.clientId ?? undefined);
        setIssueDate(d.issueDate ? new Date(d.issueDate) : new Date());
        setDueDate(d.dueDate ? new Date(d.dueDate) : new Date());
        setTaxRate(d.taxRate ?? 0);
        setNotes(d.notes ?? "");
        setItems(d.items?.length ? d.items : items);
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const draft = { clientId, issueDate, dueDate, taxRate, notes, items };
    localStorage.setItem('invoice_draft', JSON.stringify(draft));
  }, [clientId, issueDate, dueDate, taxRate, notes, items]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + Math.max(0, Number(it.quantity || 0)) * Math.max(0, Number(it.rate || 0)), 0), [items]);
  const taxAmount = useMemo(() => subtotal * (Math.max(0, taxRate) / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const previewNumber = useMemo(() => {
    const d = issueDate ?? new Date();
    const r1 = String(d.getFullYear());
    const r2 = String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
    const r3 = String(d.getHours()).padStart(2,'0');
    return `INV.${r1}.${r2}.${r3}`;
  }, [issueDate]);

  const create = async () => {
    if (!clientId || !issueDate || !dueDate) {
      toast({ title: 'Client, dates are required' });
      return;
    }
    if (items.length === 0 || subtotal < 0) {
      toast({ title: 'Add at least one valid line item' });
      return;
    }
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({
        client_id: clientId,
        issue_date: issueDate.toISOString(),
        due_date: dueDate.toISOString(),
        status: 'draft',
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: notes || null,
        user_id: userId,
      })
      .select('id, invoice_number')
      .maybeSingle();
    if (error || !inv) {
      toast({ title: 'Failed to create invoice', description: error?.message });
      return;
    }

    // Insert line items
    const rows = items.map(it => ({
      invoice_id: inv.id,
      description: it.description.substring(0, 500),
      quantity: Math.max(0, Math.floor(Number(it.quantity || 0))),
      rate: Math.max(0, Number(it.rate || 0)),
      amount: Math.max(0, Number(it.quantity || 0)) * Math.max(0, Number(it.rate || 0)),
      position: 0,
    }));
    const { error: liErr } = await supabase.from('invoice_line_items').insert(rows);
    if (liErr) {
      toast({ title: 'Invoice saved but items failed', description: liErr.message });
    }

    localStorage.removeItem('invoice_draft');
    toast({ title: 'Invoice created', description: inv.invoice_number || previewNumber });
    navigate('/invoices');
  };

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));

  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const addItem = () => setItems(prev => [...prev, { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0 }]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Create Invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">Fill in details, add line items, and create your invoice.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Invoice Number</Label>
                  <Input value={previewNumber} readOnly />
                </div>

                <div className="grid gap-2">
                  <Label>Invoice Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start font-normal", !issueDate && "text-muted-foreground")}> 
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {issueDate ? issueDate.toLocaleDateString() : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={issueDate} onSelect={setIssueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start font-normal", !dueDate && "text-muted-foreground")}> 
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? dueDate.toLocaleDateString() : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-12 text-xs text-muted-foreground">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Quantity</div>
                <div className="col-span-2 text-right">Rate ($)</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {items.map((it) => (
                <div key={it.id} className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-6"><Input value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} placeholder="Item description" /></div>
                  <div className="col-span-2"><Input type="number" min={0} value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: Number(e.target.value) })} className="text-right" /></div>
                  <div className="col-span-2"><Input type="number" min={0} value={it.rate} onChange={(e) => updateItem(it.id, { rate: Number(e.target.value) })} className="text-right" /></div>
                  <div className="col-span-2 text-right font-medium">${(Math.max(0,it.quantity)*Math.max(0,it.rate)).toFixed(2)}</div>
                  <div className="col-span-12 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => removeItem(it.id)} aria-label="Remove item">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button onClick={addItem} variant="secondary"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Additional</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" min={0} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes (Optional)</Label>
                <Textarea placeholder="Additional notes or payment terms..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Row label="Subtotal" value={subtotal} />
              <Row label={`Tax (${taxRate}%)`} value={taxAmount} />
              <div className="flex items-center justify-between pt-2 border-t font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button onClick={create}>Create Invoice</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>${value.toFixed(2)}</span>
    </div>
  );
}
