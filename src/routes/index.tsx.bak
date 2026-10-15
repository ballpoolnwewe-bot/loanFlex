import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Zap, BadgePercent, ArrowRight, FileCheck2, Banknote, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/ui-bits";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RinggitFlex — Pinjaman Peribadi Dalam Talian" },
      { name: "description", content: "Mohon pinjaman peribadi dalam talian dengan RinggitFlex. Keputusan jelas, kos telus, bayaran ansuran mudah." },
      { property: "og:title", content: "RinggitFlex — Pinjaman Peribadi Dalam Talian" },
      { property: "og:description", content: "Keputusan jelas, kos telus, bayaran ansuran mudah." },
     { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, ],
  }),
  component: Laman,
});

function Laman() {
  const [log, setLog] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLog(!!data.session));
  }, []);
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-navy-grad text-navy-foreground">
        <div className="absolute inset-0 grid-glow" />
        <header className="relative mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <Logo terang />
          <Button asChild variant="glass" size="sm" className="h-10 px-5">
            <Link to={log ? "/dashboard" : "/auth"}>{log ? "Papan Pemuka" : "Log Masuk"}</Link>
          </Button>
        </header>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-8 md:grid-cols-2 md:pb-28 md:pt-14">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-navy-foreground/20 bg-navy-foreground/10 px-3 py-1 text-xs font-semibold">
              <ShieldCheck className="size-3.5 text-accent" /> Data dilindungi & disulitkan
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] md:text-6xl">
              Pinjaman mudah, <span className="text-accent">hidup lebih fleksibel.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-navy-foreground/75">
              Mohon dalam beberapa minit. Pasukan kami menilai setiap permohonan secara manual dan memberikan had kredit yang sesuai dengan anda.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to={log ? "/mohon" : "/auth"}>Mohon sekarang <ArrowRight /></Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
              {[["RM50", "minimum"], ["RM10k", "maksimum"], ["14-30", "hari tenor"]].map(([a, b]) => (
                <div key={b}><p className="font-display text-2xl font-bold">{a}</p><p className="text-navy-foreground/60">{b}</p></div>
              ))}
            </div>
          </div>
          <div className="relative animate-rise [animation-delay:150ms]">
            <img src={heroImg} alt="Pengguna menguruskan kewangan" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-glow" />
            <div className="surface absolute -bottom-6 left-4 flex items-center gap-3 p-4 text-foreground md:-left-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-success-grad text-success-foreground"><FileCheck2 className="size-5" /></span>
              <div><p className="text-xs text-muted-foreground">Status permohonan</p><p className="font-display font-bold">Diluluskan</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Tiga langkah, tanpa kerumitan</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { i: FileCheck2, t: "Hantar permohonan", d: "Isi maklumat dan muat naik dokumen pengenalan secara selamat." },
            { i: Banknote, t: "Terima keputusan & had", d: "Admin menilai dan menetapkan had kredit. Keputusan dipaparkan sebaik anda membuka aplikasi." },
            { i: CalendarCheck, t: "Cairkan & bayar ansuran", d: "Pilih jumlah dan tenor, kemudian bayar melalui WhatsApp." },
          ].map((s, n) => (
            <div key={s.t} className="surface p-6 animate-rise" style={{ animationDelay: `${n * 100}ms` }}>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-primary-foreground"><s.i className="size-5" /></span>
              <h3 className="mt-5 text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {[
            { i: BadgePercent, t: "Kos telus", d: "Faedah, yuran dan jumlah bayaran dipaparkan sebelum anda mengesahkan." },
            { i: Zap, t: "Notifikasi segera", d: "Dapatkan makluman untuk setiap kelulusan, pencairan dan pembayaran." },
            { i: ShieldCheck, t: "Keselamatan", d: "Dokumen disimpan secara peribadi dan hanya boleh diakses oleh anda dan pentadbir." },
          ].map((s) => (
            <div key={s.t} className="flex gap-4 rounded-2xl p-2">
              <s.i className="mt-1 size-6 shrink-0 text-accent" />
              <div><p className="font-display font-semibold">{s.t}</p><p className="text-sm text-muted-foreground">{s.d}</p></div>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} RinggitFlex. Hak cipta terpelihara.</footer>
    </div>
  );
}
