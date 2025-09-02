import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "next-themes";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Profile
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Company
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Theme / Notifications
  const [prefTheme, setPrefTheme] = useState<"light" | "dark" | "system">("system");
  const { setTheme: applyTheme } = useTheme();
  const [emailOptIn, setEmailOptIn] = useState(true);

  const canSave = useMemo(() => !!user && !loading, [user, loading]);

  useEffect(() => {
    document.title = "Settings — Biz Invoice Nexus";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Manage profile, company, theme, and notification settings.");
  }, []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: profile }, { data: company }] = await Promise.all([
          supabase.from("profiles").select("full_name, avatar_url, theme, email_opt_in").eq("id", user.id).maybeSingle(),
          supabase
            .from("company_settings")
            .select("company_name, phone, address, logo_url")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (profile) {
          setFullName(profile.full_name ?? "");
          setAvatarUrl(profile.avatar_url ?? null);
          setPrefTheme((profile as any).theme ?? "system");
          applyTheme((profile as any).theme ?? "system");
          setEmailOptIn((profile as any).email_opt_in ?? true);
        }
        if (company) {
          setCompanyName(company.company_name ?? "");
          setCompanyPhone(company.phone ?? "");
          setCompanyAddress(company.address ?? "");
          setLogoUrl(company.logo_url ?? null);
        }
      } catch (e: any) {
        toast({ title: "Failed to load settings", description: e.message });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, toast]);

  const saveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: fullName, avatar_url: avatarUrl, theme: prefTheme, email_opt_in: emailOptIn });
      if (error) throw error;
      toast({ title: "Profile saved" });
    } catch (e: any) {
      toast({ title: "Profile save failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const saveCompany = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("company_settings")
        .upsert({ user_id: user.id, company_name: companyName || "", phone: companyPhone || null, address: companyAddress || null, logo_url: logoUrl });
      if (error) throw error;
      toast({ title: "Company settings saved" });
    } catch (e: any) {
      toast({ title: "Company save failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const onLogoChange = async (file?: File) => {
    if (!user || !file) return;
    try {
      const path = `${user.id}/logo-${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast({ title: "Logo uploaded" });
    } catch (e: any) {
      toast({ title: "Logo upload failed", description: e.message });
    }
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile, company, theme, and notifications.</p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList className="mb-2 w-full flex-wrap h-auto p-1">
          <TabsTrigger value="profile" className="flex-1 min-w-0">Profile</TabsTrigger>
          <TabsTrigger value="company" className="flex-1 min-w-0">Company</TabsTrigger>
          <TabsTrigger value="theme" className="flex-1 min-w-0">Theme</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 min-w-0">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div>
                <Button onClick={saveProfile} disabled={!canSave}>
                  Save Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyPhone">Phone</Label>
                <Input id="companyPhone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyAddress">Address</Label>
                <Textarea id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="123 Main St, City, Country" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="logo">Company logo</Label>
                <Input id="logo" type="file" accept="image/*" onChange={(e) => onLogoChange(e.target.files?.[0])} />
                {logoUrl && (
                  <img src={logoUrl} alt="Company logo preview" className="h-12 w-auto mt-2 rounded border" />
                )}
              </div>
              <div>
                <Button onClick={saveCompany} disabled={!canSave}>
                  Save Company
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Preferred theme</Label>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <Button key={t} variant={prefTheme === t ? "default" : "outline"} size="sm" onClick={() => { setPrefTheme(t as any); applyTheme(t as any); }}>
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Button onClick={() => { applyTheme(prefTheme); saveProfile(); }} disabled={!canSave}>
                  Save Theme
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-3">
                <input id="emailOptIn" type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
                <Label htmlFor="emailOptIn">Email me important updates</Label>
              </div>
              <div>
                <Button onClick={saveProfile} disabled={!canSave}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
