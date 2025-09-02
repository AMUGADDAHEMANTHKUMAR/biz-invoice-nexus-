import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { toast } = useToast();
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Login — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Secure login to your invoicing dashboard.");
  }, []);

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [session, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (error) {
      toast({ title: "Login failed", description: error.message });
      return;
    }

    toast({ title: "Welcome back", description: "You are now signed in." });
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to continue</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={submitting}>{submitting ? "Logging in..." : "Login"}</Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4">
          New here? <Link to="/auth/register" className="underline">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
