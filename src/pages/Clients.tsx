import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

export default function Clients() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Tables<'clients'>[]>([]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  // Delete state
  const [deletingClient, setDeletingClient] = useState<Tables<'clients'> | null>(null);
  const [clientInvoiceCount, setClientInvoiceCount] = useState<number | null>(null);
  const [lastDeletedClientId, setLastDeletedClientId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Clients — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Manage your clients and view their invoice history.");
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load clients', description: error.message });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const addClient = async () => {
    if (!user) return;
    if (!name || !email) {
      toast({ title: 'Name and email are required' });
      return;
    }
    const { error } = await supabase.from('clients').insert({
      name,
      email,
      company: company || null,
      phone: phone || null,
      address: address || null,
      user_id: user.id,
    });
    if (error) {
      toast({ title: 'Failed to add client', description: error.message });
    } else {
      toast({ title: 'Client added' });
      setOpen(false);
      setName(""); setEmail(""); setCompany(""); setPhone(""); setAddress("");
      loadClients();
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Directory of all your clients.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">Add Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Client</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State 12345" />
              </div>
                <div className="pt-2 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={addClient}>Add Client</Button>
                </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="rounded-lg border">
        {loading ? (
          <div className="p-4"><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-6 w-1/2" /></div>
        ) : clients.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No clients yet. Use "Add Client" to get started.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.company ?? '-'}</TableCell>
                      <TableCell>{c.phone ?? '-'}</TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Delete client"
                          onClick={async () => {
                            setDeletingClient(c);
                            const { count } = await supabase
                              .from('invoices')
                              .select('id', { count: 'exact', head: true })
                              .eq('client_id', c.id)
                              .eq('is_deleted', false);
                            setClientInvoiceCount(count ?? 0);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {clients.map((c) => (
                <div key={c.id} className="bg-card border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{c.name}</h3>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Delete client"
                      onClick={async () => {
                        setDeletingClient(c);
                        const { count } = await supabase
                          .from('invoices')
                          .select('id', { count: 'exact', head: true })
                          .eq('client_id', c.id)
                          .eq('is_deleted', false);
                        setClientInvoiceCount(count ?? 0);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.email}</p>
                  {c.company && <p className="text-sm"><span className="font-medium">Company:</span> {c.company}</p>}
                  {c.phone && <p className="text-sm"><span className="font-medium">Phone:</span> {c.phone}</p>}
                  <p className="text-xs text-muted-foreground">Created: {new Date(c.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!deletingClient} onOpenChange={(open) => { if (!open) { setDeletingClient(null); setClientInvoiceCount(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              {clientInvoiceCount && clientInvoiceCount > 0
                ? `This client has ${clientInvoiceCount} invoices. Deleting will also remove all associated invoices.`
                : 'Are you sure you want to delete this client? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingClient) return;
                const clientId = deletingClient.id;
                const now = new Date().toISOString();
                const { error: clientErr } = await supabase
                  .from('clients')
                  .update({ is_deleted: true, deleted_at: now })
                  .eq('id', clientId);
                if (clientErr) {
                  toast({ title: 'Failed to delete client', description: clientErr.message });
                  return;
                }
                // Soft delete associated invoices
                await supabase
                  .from('invoices')
                  .update({ is_deleted: true, deleted_at: now })
                  .eq('client_id', clientId);

                setLastDeletedClientId(clientId);
                setClients((prev) => prev.filter((x) => x.id !== clientId));
                setDeletingClient(null);
                setClientInvoiceCount(null);
                toast({
                  title: 'Client deleted successfully',
                  action: (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!lastDeletedClientId) return;
                        const { error: undoClientErr } = await supabase
                          .from('clients')
                          .update({ is_deleted: false, deleted_at: null })
                          .eq('id', lastDeletedClientId);
                        if (undoClientErr) {
                          toast({ title: 'Undo failed', description: undoClientErr.message });
                          return;
                        }
                        await supabase
                          .from('invoices')
                          .update({ is_deleted: false, deleted_at: null })
                          .eq('client_id', lastDeletedClientId);
                        loadClients();
                        toast({ title: 'Client restored' });
                      }}
                    >
                      Undo
                    </Button>
                  ),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
