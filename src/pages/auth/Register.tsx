import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const { toast } = useToast();
  const { signUp, session, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Create account — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Create your account to start invoicing in minutes.");
  }, []);

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUp(email.trim(), password, name.trim());
    setSubmitting(false);

    if (error) {
      toast({ title: "Sign up failed", description: error.message });
      return;
    }

    toast({
      title: "Check your email",
      description: "We've sent a confirmation link to complete your registration.",
    });
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Start with a free account</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={submitting}>{submitting ? "Creating..." : "Create account"}</Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4">
          Already have an account? <Link to="/auth/login" className="underline">Login</Link>
        </p>
      </section>
    </main>
  );
}
