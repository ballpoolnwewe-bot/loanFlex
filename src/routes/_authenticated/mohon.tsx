import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Upload, ShieldCheck, Ban, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Memuatkan } from "@/components/app/ui-bits";
import { useKelayakan, useProduk, useSaya } from "@/lib/data";
import { ralatMesej, rm, tarikh } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/mohon")({
  head: () => ({ meta: [{ title: "Mohon Pinjaman — RinggitFlex" }, { name: "description", content: "Borang permohonan pinjaman RinggitFlex." }] }),
  component: Mohon,
});

const skema = z.object({
  nama: z.string().trim().min(3, "Nama penuh wajib diisi").max(120),
  kp: z.string().regex(/^\d{6}-?\d{2}-?\d{4}$/, "No. KP mesti 12 digit (cth: 900101-14-5678)"),
  telefon: z.string().trim().regex(/^\+?[0-9]{9,15}$/, "No. telefon tidak sah"),
  alamat: z.string().trim().min(10, "Alamat tidak lengkap").max(500),
  pekerjaan: z.string().trim().min(2, "Pekerjaan wajib diisi").max(100),
  majikan: z.string().trim().max(150),
  pengalaman: z.coerce.number().min(0).max(60),
  gaji: z.coerce.number().positive("Gaji tidak sah").max(1_000_000),
  jumlah: z.coerce.number().positive(),
  tujuan: z.string().trim().min(3, "Tujuan wajib diisi").max(300),
});

const JENIS_FAIL = ["image/jpeg", "image/png", "image/webp"];

function Mohon() {
  const kel = useKelayakan();
  const produk = useProduk();
  const saya = useSaya();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState<Record<string, string>>({});
  const [kp, setKp] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [sibuk, setSibuk] = useState(false);

  if (kel.isLoading || produk.isLoading || saya.isLoading) return <Memuatkan />;

  if (!kel.data?.boleh) {
    return (
      <div className="surface mx-auto max-w-lg p-8 text-center animate-rise">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-warning/20 text-warning-foreground"><Ban className="size-6" /></span>
        <h1 className="mt-4 text-2xl font-bold">Permohonan tidak tersedia</h1>
        <p className="mt-2 text-muted-foreground">{kel.data?.sebab}</p>
        {kel.data?.boleh_mohon_pada && <p className="mt-3 text-sm">Boleh memohon semula pada <b>{tarikh(kel.data.boleh_mohon_pada, true)}</b>.</p>}
        <Button asChild variant="outline" className="mt-6 rounded-full"><Link to="/dashboard">Kembali ke papan pemuka</Link></Button>
      </div>
    );
  }

  const p = produk.data!;
  const nilai = (k: string, lalai = "") => f[k] ?? lalai;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const muatNaik = async (fail: File, jenis: string, uid: string) => {
    if (!JENIS_FAIL.includes(fail.type)) throw new Error("Dokumen mesti JPG, PNG atau WEBP.");
    if (fail.size > 5 * 1024 * 1024) throw new Error("Saiz dokumen maksimum 5MB.");
    const ext = fail.name.split(".").pop()?.toLowerCase().replace(/[^a-z]/g, "") || "jpg";
    const path = `${uid}/${jenis}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("dokumen-permohonan").upload(path, fail, { contentType: fail.type });
    if (error) throw error;
    return path;
  };

  const hantar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sibuk) return;
    const data = {
      nama: nilai("nama", saya.data?.profil?.nama_penuh ?? ""), kp: nilai("kp"), telefon: nilai("telefon", saya.data?.profil?.no_telefon ?? ""),
      alamat: nilai("alamat"), pekerjaan: nilai("pekerjaan"), majikan: nilai("majikan"), pengalaman: nilai("pengalaman", "0"),
      gaji: nilai("gaji"), jumlah: nilai("jumlah"), tujuan: nilai("tujuan"),
    };
    const v = skema.safeParse(data);
    if (!v.success) return toast.error(v.error.issues[0].message);
    if (v.data.jumlah < Number(p.jumlah_minimum) || v.data.jumlah > Number(p.jumlah_maksimum))
      return toast.error(`Jumlah mesti antara ${rm(p.jumlah_minimum)} dan ${rm(p.jumlah_maksimum)}.`);
    if (!kp || !selfie) return toast.error("Sila muat naik gambar kad pengenalan dan swafoto.");
    setSibuk(true);
    try {
      const uid = saya.data!.user.id;
      const [pathKp, pathSelfie] = await Promise.all([muatNaik(kp, "kp", uid), muatNaik(selfie, "selfie", uid)]);
      const { error } = await supabase.rpc("hantar_permohonan", {
        _nama_penuh: v.data.nama, _no_kp: v.data.kp, _no_telefon: v.data.telefon, _alamat: v.data.alamat,
        _pekerjaan: v.data.pekerjaan, _majikan: v.data.majikan, _pengalaman: v.data.pengalaman, _gaji: v.data.gaji,
        _jumlah: v.data.jumlah, _tujuan: v.data.tujuan, _foto_kp: pathKp, _foto_selfie: pathSelfie,
      });
      if (error) throw error;
      toast.success("Permohonan berjaya dihantar!");
      await qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(ralatMesej(err));
    } finally {
      setSibuk(false);
    }
  };

  const Medan = ({ k, label, type = "text", lalai = "", ph }: { k: string; label: string; type?: string; lalai?: string; ph?: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} placeholder={ph} value={nilai(k, lalai)} onChange={set(k)} className="h-11 rounded-xl" />
    </div>
  );

  const Fail = ({ label, fail, setFail }: { label: string; fail: File | null; setFail: (f: File | null) => void }) => (
    <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${fail ? "border-success bg-success/5" : "border-border hover:border-primary hover:bg-secondary/50"}`}>
      {fail ? <CheckCircle2 className="size-6 text-success" /> : <Upload className="size-6 text-primary" />}
      <span className="text-sm font-semibold">{label}</span>
      <span className="max-w-full truncate text-xs text-muted-foreground">{fail ? fail.name : "JPG/PNG/WEBP, maks 5MB"}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFail(e.target.files?.[0] ?? null)} />
    </label>
  );

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <h1 className="text-3xl font-bold">Permohonan pinjaman</h1>
      <p className="mt-1 text-muted-foreground">Lengkapkan maklumat di bawah. Had kredit akan ditentukan oleh pasukan kami selepas semakan.</p>
      <form onSubmit={hantar} className="mt-6 space-y-6">
        <section className="surface space-y-4 p-6">
          <h2 className="font-bold">Maklumat peribadi</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {Medan({ k: "nama", label: "Nama penuh (seperti dalam KP)", lalai: saya.data?.profil?.nama_penuh ?? "" })}
            {Medan({ k: "kp", label: "No. kad pengenalan", ph: "900101-14-5678" })}
            {Medan({ k: "telefon", label: "No. telefon", type: "tel", lalai: saya.data?.profil?.no_telefon ?? "" })}
          </div>
          <div className="space-y-1.5"><Label htmlFor="alamat">Alamat kediaman</Label><Textarea id="alamat" value={nilai("alamat")} onChange={set("alamat")} className="rounded-xl" rows={3} /></div>
        </section>
        <section className="surface space-y-4 p-6">
          <h2 className="font-bold">Pekerjaan & kewangan</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {Medan({ k: "pekerjaan", label: "Jawatan / pekerjaan" })}
            {Medan({ k: "majikan", label: "Nama majikan (pilihan)" })}
            {Medan({ k: "pengalaman", label: "Pengalaman kerja (tahun)", type: "number", lalai: "0" })}
            {Medan({ k: "gaji", label: "Gaji bulanan (RM)", type: "number" })}
            {Medan({ k: "jumlah", label: `Jumlah dipohon (RM ${Number(p.jumlah_minimum)}–${Number(p.jumlah_maksimum)})`, type: "number" })}
            {Medan({ k: "tujuan", label: "Tujuan pinjaman" })}
          </div>
        </section>
        <section className="surface space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5 text-accent" /> Dokumen pengenalan</h2>
          <p className="text-sm text-muted-foreground">Disimpan secara peribadi; hanya anda dan pentadbir boleh melihatnya.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Fail label="Gambar kad pengenalan" fail={kp} setFail={setKp} />
            <Fail label="Swafoto bersama KP" fail={selfie} setFail={setSelfie} />
          </div>
        </section>
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={sibuk}>
          {sibuk && <Loader2 className="animate-spin" />} {sibuk ? "Menghantar..." : "Hantar permohonan"}
        </Button>
      </form>
    </div>
  );
}
