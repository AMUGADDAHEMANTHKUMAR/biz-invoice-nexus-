import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-invoice.jpg";

const Index = () => {
  useEffect(() => {
    document.title = "Biz Invoice Nexus — Modern Invoicing & Analytics";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Create, manage, and track invoices with beautiful analytics.");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold tracking-tight">Biz Invoice Nexus</Link>
        <nav className="flex items-center gap-3">
          <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
          <Link to="/auth/register">
            <Button variant="hero" size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="container py-16 grid lg:grid-cols-2 gap-8 items-center">
          <article>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">Invoicing done right for modern businesses</h1>
            <p className="mt-4 text-lg text-muted-foreground">Build professional invoices, manage clients, and track revenue — all in one elegant, fast app.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth/register">
                <Button variant="hero" className="">Create your account</Button>
              </Link>
              <Link to="/auth/login">
                <Button variant="secondary">View Dashboard</Button>
              </Link>
            </div>
          </article>

          <aside className="relative">
            <img
              src={heroImage}
              alt="Modern invoicing dashboard with charts and invoice list"
              loading="lazy"
              className="w-full rounded-xl border shadow-[var(--shadow-elevated)] animate-float"
            />
          </aside>
        </section>
      </main>

      <footer className="container py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Biz Invoice Nexus
      </footer>
    </div>
  );
};

export default Index;
