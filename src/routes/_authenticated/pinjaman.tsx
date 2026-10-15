import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Banknote, Landmark, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bar, Baris, Kosong, Lencana, Memuatkan } from "@/components/app/ui-bits";
import { kiraPinjaman, ringkasPinjaman, usePermohonanSaya, usePinjamanSaya, useProduk } from "@/lib/data";
import { BANK, STATUS_PINJAMAN, masa, ralatMesej, rm, tarikh } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pinjaman")({
  head: () => ({ meta: [{ title: "Pinjaman Saya — RinggitFlex" }, { name: "description", content: "Had kredit, pencairan dan jadual ansuran." }] }),
  component: Pinjaman,
});

function Pinjaman() {
  const perm = usePermohonanSaya();
  const pin = usePinjamanSaya();
  const produk = useProduk();
  if (perm.isLoading || pin.isLoading || produk.isLoading) return <Memuatkan />;
  const lulus = perm.data?.find((p) => p.status === "lulus");
  const { semasa, ans, peratus, baki } = ringkasPinjaman(pin.data);
  const ditolakTerakhir = pin.data?.pinjaman.find((p) => p.permohonan_id === lulus?.id && p.status === "ditolak");

  return (
    <div className="space-y-6 animate-rise">
      <h1 className="text-3xl font-bold">Pinjaman saya</h1>
      {lulus && (
        <div className="relative overflow-hidden rounded-3xl bg-brand p-6 text-primary-foreground shadow-glow">
          <p className="text-sm opacity-80">Had kredit diluluskan</p>
          <p className="font-display text-4xl font-extrabold">{rm(lulus.had_kredit)}</p>
          <p className="mt-2 text-sm opacity-80">Diluluskan pada {tarikh(lulus.tarikh_keputusan, true)}</p>
        </div>
      )}
      {!lulus && !semasa && (
        <Kosong tajuk="Tiada had kredit aktif" mesej="Anda perlu mendapatkan kelulusan permohonan sebelum membuat pencairan." aksi={<Button asChild variant="hero"><Link to="/mohon">Mohon pinjaman</Link></Button>} />
      )}
      {lulus && !semasa && (
        <>
          {ditolakTerakhir && <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">Permintaan pencairan sebelum ini tidak dapat diproses: {ditolakTerakhir.catatan_admin ?? "sila semak butiran bank."}</p>}
          <BorangPencairan had={Number(lulus.had_kredit)} produk={produk.data!} />
        </>
      )}
      {semasa && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="surface p-6 lg:col-span-2">
            <div className="flex items-center justify-between"><h2 className="font-bold">Butiran pinjaman</h2><Lencana peta={STATUS_PINJAMAN} status={semasa.status} /></div>
            {semasa.status === "menunggu_pencairan" && (
              <div className="mt-4 flex gap-3 rounded-2xl bg-warning/15 p-4 text-sm text-warning-foreground"><Clock className="size-5 shrink-0" /> Permintaan anda sedang diproses. Dana belum dicairkan.</div>
            )}
            {semasa.status === "aktif" && (
              <div className="mt-4 space-y-2"><Bar nilai={peratus} /><p className="text-xs text-muted-foreground">{peratus.toFixed(0)}% dijelaskan · baki {rm(baki)}</p></div>
            )}
            <div className="mt-4 divide-y divide-border">
              <Baris label="Pokok" nilai={rm(semasa.jumlah_pokok)} />
              <Baris label={`Faedah (${Number(semasa.kadar_faedah_bulanan)}%/minggu × ${semasa.tenor_bulan}/7 hari)`} nilai={rm(semasa.jumlah_faedah)} />
              <Baris label={`Yuran pemprosesan (${Number(semasa.yuran_pemprosesan)}%)`} nilai={rm(semasa.jumlah_yuran)} />
              <Baris label="Jumlah kewajipan" nilai={<span className="text-primary">{rm(semasa.jumlah_kewajipan)}</span>} />
              <Baris label="Tenor" nilai={`${semasa.tenor_bulan} hari`} />
              <Baris label="Akaun penerima" nilai={`${semasa.nama_bank} ••••${semasa.no_akaun.slice(-4)}`} />
              <Baris label="Tarikh dicairkan" nilai={masa(semasa.tarikh_dicairkan)} />
              {semasa.rujukan_pencairan && <Baris label="Rujukan pindahan" nilai={semasa.rujukan_pencairan} />}
            </div>
          </div>
          <div className="surface p-6 lg:col-span-3">
            <h2 className="font-bold">Jadual ansuran</h2>
            {ans.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Jadual akan dijana selepas dana dicairkan.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {ans.map((a) => {
                  const lewat = a.status !== "dibayar" && new Date(a.tarikh_jatuh_tempo) < new Date(new Date().toDateString());
                  return (
                    <li key={a.id} className={cn("flex items-center gap-3 rounded-xl border p-3", a.status === "dibayar" ? "border-success/30 bg-success/5" : lewat ? "border-destructive/30 bg-destructive/5" : "border-border")}>
                      <span className={cn("flex size-9 items-center justify-center rounded-full text-sm font-bold", a.status === "dibayar" ? "bg-success text-success-foreground" : "bg-secondary text-primary")}>
                        {a.status === "dibayar" ? <CheckCircle2 className="size-4" /> : a.bil}
                      </span>
                      <div className="flex-1"><p className="text-sm font-semibold">{rm(a.jumlah)}</p><p className="text-xs text-muted-foreground">Jatuh tempo {tarikh(a.tarikh_jatuh_tempo)}</p></div>
                      <span className={cn("text-xs font-semibold", a.status === "dibayar" ? "text-success" : lewat ? "text-destructive" : "text-muted-foreground")}>
                        {a.status === "dibayar" ? "Dibayar" : lewat ? "Tertunggak" : "Belum bayar"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {semasa.status === "aktif" && <Button asChild variant="hero" className="mt-5 w-full"><Link to="/pembayaran">Bayar ansuran</Link></Button>}
          </div>
        </div>
      )}
    </div>
  );
}

function BorangPencairan({ had, produk }: { had: number; produk: NonNullable<ReturnType<typeof useProduk>["data"]> }) {
  const qc = useQueryClient();
  const [jumlah, setJumlah] = useState(Math.floor(had));
  const [tenor, setTenor] = useState(produk.pilihan_tenor[produk.pilihan_tenor.length - 1]);
  const [bank, setBank] = useState("");
  const [pemegang, setPemegang] = useState("");
  const [akaun, setAkaun] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const k = kiraPinjaman(jumlah, tenor, produk);

  const hantar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    if (!bank) return toast.error("Sila pilih bank.");
    if (pemegang.trim().length < 3) return toast.error("Nama pemegang akaun tidak sah.");
    if (!/^\d{8,20}$/.test(akaun.replace(/\D/g, ""))) return toast.error("No. akaun mesti 8-20 digit.");
    setSibuk(true);
    const { error } = await supabase.rpc("mohon_pencairan", { _jumlah: jumlah, _tenor: tenor, _bank: bank, _pemegang: pemegang, _akaun: akaun });
    setSibuk(false);
    if (error) return toast.error(ralatMesej(error));
    toast.success("Permintaan pencairan dihantar.");
    qc.invalidateQueries();
  };

  return (
    <form onSubmit={hantar} className="grid gap-6 lg:grid-cols-5">
      <div className="surface space-y-6 p-6 lg:col-span-3">
        <h2 className="flex items-center gap-2 font-bold"><Banknote className="size-5 text-primary" /> Permintaan pencairan</h2>
        <div>
          <div className="flex items-end justify-between"><Label>Jumlah pencairan</Label><span className="font-display text-2xl font-bold">{rm(jumlah)}</span></div>
          <Slider className="mt-4" min={Number(produk.jumlah_minimum)} max={Math.floor(had)} step={50} value={[jumlah]} onValueChange={(v) => setJumlah(v[0])} />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{rm(produk.jumlah_minimum)}</span><span>{rm(had)}</span></div>
        </div>
        <div>
          <Label>Tenor</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {produk.pilihan_tenor.map((t) => (
              <button type="button" key={t} onClick={() => setTenor(t)} className={cn("rounded-xl border px-4 py-2 text-sm font-semibold transition", tenor === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary")}>
                {t} hari
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4 border-t border-border pt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold"><Landmark className="size-4" /> Akaun bank penerima</h3>
          <Select value={bank} onValueChange={setBank}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pilih bank" /></SelectTrigger>
            <SelectContent>{BANK.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="pem">Nama pemegang akaun</Label><Input id="pem" value={pemegang} onChange={(e) => setPemegang(e.target.value)} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label htmlFor="ak">No. akaun</Label><Input id="ak" inputMode="numeric" value={akaun} onChange={(e) => setAkaun(e.target.value)} className="h-11 rounded-xl" /></div>
          </div>
        </div>
      </div>
      <div className="surface h-fit p-6 lg:col-span-2 lg:sticky lg:top-24">
        <h2 className="font-bold">Ringkasan kos</h2>
        <div className="mt-3 divide-y divide-border">
          <Baris label="Pokok" nilai={rm(jumlah)} />
          <Baris label={`Faedah (${Number(produk.kadar_faedah_bulanan)}%/minggu × ${tenor}/7 hari)`} nilai={rm(k.faedah)} />
          <Baris label={`Yuran (${Number(produk.yuran_pemprosesan)}%)`} nilai={rm(k.yuran)} />
          <Baris label="Jumlah kewajipan" nilai={<span className="text-primary">{rm(k.jumlah)}</span>} />
        </div>
        <div className="mt-4 rounded-2xl bg-secondary p-4 text-center">
          <p className="text-xs text-muted-foreground">Bayaran penuh dalam {tenor} hari</p>
          <p className="font-display text-3xl font-bold text-primary">{rm(k.bulanan)}</p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Jumlah muktamad dikira dan disahkan oleh sistem semasa permintaan diproses.</p>
        <Button type="submit" variant="hero" size="lg" className="mt-5 w-full" disabled={sibuk}>{sibuk && <Loader2 className="animate-spin" />} Hantar permintaan</Button>
      </div>
    </form>
  );
}
