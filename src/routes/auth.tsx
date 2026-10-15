import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Lock, Mail, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log Masuk / Daftar — RinggitFlex" },
      { name: "description", content: "Log masuk atau daftar akaun RinggitFlex untuk memohon pinjaman." },
      { property: "og:title", content: "Log Masuk / Daftar — RinggitFlex" },
      { property: "og:description", content: "Akses akaun pinjaman RinggitFlex anda." },
     { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, ],
  }),
  component: Auth,
});

const skemaDaftar = z.object({
  nama: z.string().trim().min(3, "Nama sekurang-kurangnya 3 aksara").max(120),
  telefon: z.string().trim().regex(/^\+?[0-9]{9,15}$/, "No. telefon tidak sah"),
  emel: z.string().trim().email("Emel tidak sah").max(255),
  kata: z.string().min(8, "Kata laluan minimum 8 aksara").max(72),
});

function Auth() {
  const [mod, setMod] = useState<"masuk" | "daftar">("masuk");
  const [f, setF] = useState({ nama: "", telefon: "", emel: "", kata: "" });
  const [sibuk, setSibuk] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/dashboard", replace: true }));
  }, [navigate]);

  const hantar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSibuk(true);
    try {
      if (mod === "daftar") {
        const v = skemaDaftar.safeParse(f);
        if (!v.success) throw new Error(v.error.issues[0].message);
        const { data, error } = await supabase.auth.signUp({
          email: v.data.emel,
          password: v.data.kata,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { nama_penuh: v.data.nama, no_telefon: v.data.telefon } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Pendaftaran berjaya! Sila semak emel anda untuk pengesahan akaun.");
          setMod("masuk");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.emel.trim(), password: f.kata });
        if (error) throw new Error(error.message.includes("Invalid") ? "Emel atau kata laluan salah." : error.message);
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ralat");
    } finally {
      setSibuk(false);
    }
  };

  const medan = (k: keyof typeof f, label: string, ikon: React.ReactNode, type = "text", ac?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">{ikon}</span>
        <Input id={k} type={type} autoComplete={ac} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="h-11 rounded-xl pl-10" required />
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-grad p-12 text-navy-foreground md:flex md:flex-col md:justify-between">
        <div className="absolute inset-0 grid-glow" />
        <Link to="/" className="relative"><Logo terang /></Link>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight">Kewangan anda,<br /><span className="text-accent">di hujung jari.</span></h2>
          <p className="mt-4 max-w-sm text-navy-foreground/70">Pantau permohonan, had kredit, pencairan dan bayaran ansuran dalam satu tempat.</p>
        </div>
        <p className="relative text-xs text-navy-foreground/50">© RinggitFlex</p>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm animate-rise">
          <Link to="/" className="md:hidden"><Logo /></Link>
          <h1 className="mt-8 text-3xl font-bold">{mod === "masuk" ? "Selamat kembali" : "Cipta akaun"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mod === "masuk" ? "Log masuk untuk meneruskan." : "Daftar dalam kurang seminit."}</p>
          <div className="mt-6 grid grid-cols-2 rounded-xl bg-secondary p-1">
            {(["masuk", "daftar"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMod(m)} className={cn("rounded-lg py-2 text-sm font-semibold transition", mod === m ? "bg-card text-primary shadow-soft" : "text-muted-foreground")}>
                {m === "masuk" ? "Log Masuk" : "Daftar"}
              </button>
            ))}
          </div>
          <form onSubmit={hantar} className="mt-6 space-y-4">
            {mod === "daftar" && medan("nama", "Nama penuh", <User />, "text", "name")}
            {mod === "daftar" && medan("telefon", "No. telefon", <Phone />, "tel", "tel")}
            {medan("emel", "Emel", <Mail />, "email", "email")}
            {medan("kata", "Kata laluan", <Lock />, "password", mod === "masuk" ? "current-password" : "new-password")}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={sibuk}>
              {sibuk && <Loader2 className="animate-spin" />} {mod === "masuk" ? "Log Masuk" : "Daftar Akaun"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
