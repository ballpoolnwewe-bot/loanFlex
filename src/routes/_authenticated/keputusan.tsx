import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, CalendarDays, Info, ArrowRight, FileText, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Baris, Kosong, Memuatkan } from "@/components/app/ui-bits";
import { useKelayakan, usePermohonanSaya, useProduk } from "@/lib/data";
import { rm, tarikh, masa } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/keputusan")({
  head: () => ({ meta: [{ title: "Keputusan Permohonan — RinggitFlex" }, { name: "description", content: "Keputusan permohonan pinjaman anda." }] }),
  component: Keputusan,
});

const WARNA = ["bg-primary", "bg-accent", "bg-warning", "bg-navy"];

function Keputusan() {
  const perm = usePermohonanSaya();
  const produk = useProduk();
  const kel = useKelayakan();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [syarat, setSyarat] = useState(false);

  if (perm.isLoading) return <Memuatkan />;
  const p = perm.data?.find((x) => x.tarikh_keputusan && (x.status === "lulus" || x.status === "ditolak" || x.status === "selesai"));
  if (!p) return <Kosong tajuk="Belum ada keputusan" mesej="Keputusan akan dipaparkan di sini sebaik sahaja permohonan anda diputuskan." aksi={<Button asChild variant="outline"><Link to="/dashboard">Papan pemuka</Link></Button>} />;

  const teruskan = async (ke: "/dashboard" | "/pinjaman" | "/mohon") => {
    if (!p.keputusan_dilihat) await supabase.rpc("tanda_keputusan_dilihat", { _id: p.id });
    await qc.invalidateQueries({ queryKey: ["permohonan-saya"] });
    navigate({ to: ke });
  };

  const lulus = p.status !== "ditolak";

  if (lulus) {
    return (
      <div className="relative mx-auto max-w-2xl">
        {!p.keputusan_dilihat && (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i} className={`absolute top-0 h-3 w-2 rounded-sm animate-confetti ${WARNA[i % 4]}`} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.12}s` }} />
            ))}
          </div>
        )}
        <div className="relative overflow-hidden rounded-3xl bg-navy-grad p-8 text-center text-navy-foreground md:p-12 animate-rise">
          <div className="absolute inset-0 grid-glow" />
          <div className="relative mx-auto flex size-24 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-accent/40 animate-ring" />
            <span className="relative flex size-24 items-center justify-center rounded-full bg-success-grad shadow-glow animate-pop"><Check className="size-12" strokeWidth={3} /></span>
          </div>
          <p className="relative mt-6 text-sm font-semibold uppercase tracking-widest text-accent">Tahniah!</p>
          <h1 className="relative mt-2 text-3xl font-bold md:text-4xl">Permohonan anda diluluskan</h1>
          <p className="relative mt-6 text-sm text-navy-foreground/70">Had kredit yang diluluskan</p>
          <p className="relative mt-1 font-display text-5xl font-extrabold tracking-tight md:text-6xl animate-pop [animation-delay:250ms]">{rm(p.had_kredit)}</p>
          <p className="relative mx-auto mt-4 max-w-md text-sm text-navy-foreground/70">Had kredit bukan pencairan dana. Dana hanya akan dipindahkan selepas anda membuat permintaan pencairan dan ia diproses oleh pasukan kami.</p>
        </div>

        <div className="surface mt-6 p-6 animate-rise [animation-delay:150ms]">
          <h2 className="font-bold">Butiran keputusan</h2>
          <div className="mt-2 divide-y divide-border">
            <Baris label="Tarikh kelulusan" nilai={masa(p.tarikh_keputusan)} />
            <Baris label="Jumlah dipohon" nilai={(p.jumlah_dipohon == null ? "Had ditentukan selepas semakan" : rm(p.jumlah_dipohon))} />
            <Baris label="Had diluluskan" nilai={rm(p.had_kredit)} />
            {produk.data && <Baris label="Kadar faedah" nilai={`${Number(produk.data.kadar_faedah_bulanan)}% seminggu (flat)`} />}
            {produk.data && <Baris label="Pilihan tenor" nilai={`${produk.data.pilihan_tenor.join(", ")} hari`} />}
            {p.catatan_admin && <Baris label="Catatan" nilai={p.catatan_admin} />}
          </div>
          <h3 className="mt-6 text-sm font-bold">Langkah seterusnya</h3>
          <ol className="mt-3 space-y-3 text-sm">
            {["Semak syarat pinjaman dan kos.", "Pilih jumlah dan tenor, kemudian masukkan akaun bank penerima.", "Tunggu pengesahan pencairan — anda akan menerima notifikasi."].map((l, i) => (
              <li key={l} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">{i + 1}</span>{l}</li>
            ))}
          </ol>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {p.status === "lulus" && <Button variant="hero" size="lg" onClick={() => teruskan("/pinjaman")}><Banknote /> Mohon pencairan</Button>}
            <Button variant="outline" size="lg" onClick={() => teruskan("/pinjaman")}>Detail had</Button>
            <Button variant="outline" size="lg" onClick={() => setSyarat(true)}><FileText /> Syarat</Button>
          </div>
          <button onClick={() => teruskan("/dashboard")} className="mx-auto mt-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">Ke papan pemuka <ArrowRight className="size-4" /></button>
        </div>
        <Dialog open={syarat} onOpenChange={setSyarat}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Syarat pinjaman</DialogTitle></DialogHeader>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{produk.data?.syarat}</p>
            {produk.data && (
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Faedah: {Number(produk.data.kadar_faedah_bulanan)}% seminggu atas pokok</li>
                <li>• Yuran pemprosesan: {Number(produk.data.yuran_pemprosesan)}% sekali</li>
                {Number(produk.data.denda_lewat) > 0 && <li>• Caj lewat: {rm(produk.data.denda_lewat)} setiap ansuran lewat</li>}
              </ul>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="surface p-8 text-center md:p-12 animate-rise">
        <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive animate-pop"><X className="size-10" strokeWidth={2.5} /></span>
        <h1 className="mt-6 text-3xl font-bold">Permohonan tidak berjaya</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Terima kasih atas permohonan anda. Selepas semakan teliti, kami tidak dapat meluluskan permohonan ini buat masa sekarang.</p>
        <div className="mt-8 space-y-3 text-left">
          <div className="flex gap-3 rounded-2xl bg-secondary/60 p-4">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <div><p className="text-sm font-semibold">Sebab penolakan</p><p className="text-sm text-muted-foreground">{p.sebab_tolak ?? "Tiada sebab khusus dinyatakan oleh pentadbir."}</p></div>
          </div>
          <div className="flex gap-3 rounded-2xl bg-secondary/60 p-4">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Bila boleh memohon semula?</p>
              <p className="text-sm text-muted-foreground">
                {kel.data?.boleh ? "Anda boleh memohon semula sekarang." : kel.data?.boleh_mohon_pada ? `Pada ${tarikh(kel.data.boleh_mohon_pada, true)}.` : kel.data?.sebab}
              </p>
            </div>
          </div>
          <p className="pt-2 text-xs text-muted-foreground">Diputuskan pada {masa(p.tarikh_keputusan)}</p>
        </div>
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {kel.data?.boleh && <Button variant="hero" size="lg" onClick={() => teruskan("/mohon")}>Mohon semula</Button>}
          <Button variant="outline" size="lg" onClick={() => teruskan("/dashboard")}>Ke papan pemuka</Button>
        </div>
      </div>
    </div>
  );
}
