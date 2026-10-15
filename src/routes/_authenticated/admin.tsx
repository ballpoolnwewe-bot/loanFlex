import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Users, FileText, Banknote, Receipt, Settings, ScrollText, Loader2, ShieldAlert, Clock, CheckCircle2, Send, Wallet } from "lucide-react";
import { janaIdTransaksi } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Baris, Kosong, Lencana, Memuatkan, Stat } from "@/components/app/ui-bits";
import { useProduk, useSaya, type Permohonan, type Pinjaman } from "@/lib/data";
import { STATUS_PERMOHONAN, STATUS_PINJAMAN, STATUS_TRANSAKSI, masa, ralatMesej, rm } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Panel Admin — RinggitFlex" }, { name: "description", content: "Panel pentadbir RinggitFlex." }, { property: "og:title", content: "Panel Admin — RinggitFlex" }, { property: "og:description", content: "Panel pentadbir RinggitFlex." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Admin,
});

function useAdminData() {
  return useQuery({
    queryKey: ["admin"],
    queryFn: async () => {
      const [perm, pin, tr, prof, roles, audit] = await Promise.all([
        supabase.from("permohonan").select("*").order("created_at", { ascending: false }),
        supabase.from("pinjaman").select("*").order("created_at", { ascending: false }),
        supabase.from("transaksi").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("log_audit").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      if (perm.error) throw perm.error;
      return { perm: perm.data, pin: pin.data ?? [], tr: tr.data ?? [], prof: prof.data ?? [], roles: roles.data ?? [], audit: audit.data ?? [] };
    },
  });
}

function Admin() {
  const saya = useSaya();
  const d = useAdminData();
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel("admin-perm").on("postgres_changes", { event: "*", schema: "public", table: "permohonan" }, () => qc.invalidateQueries({ queryKey: ["admin"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  if (saya.isLoading) return <Memuatkan />;
  if (!saya.data?.admin) return <Kosong tajuk="Akses ditolak" mesej="Halaman ini hanya untuk pentadbir." aksi={<Button asChild variant="outline"><Link to="/dashboard">Kembali</Link></Button>} />;
  if (d.isLoading || !d.data) return <Memuatkan />;
  const x = d.data;
  const nama = (id: string) => x.prof.find((p) => p.id === id)?.nama_penuh ?? x.prof.find((p) => p.id === id)?.emel ?? id.slice(0, 8);

  return (
    <div className="space-y-6 animate-rise">
      <div className="rounded-3xl bg-navy-grad p-6 text-navy-foreground"><p className="text-sm opacity-70">Panel pentadbir</p><h1 className="text-3xl font-bold">Pusat kawalan</h1></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Menunggu semakan" nilai={x.perm.filter((p) => p.status === "menunggu" || p.status === "disemak").length} ikon={<Clock />} tone="warning" />
        <Stat label="Menunggu pencairan" nilai={x.pin.filter((p) => p.status === "menunggu_pencairan").length} ikon={<Banknote />} />
        <Stat label="Pinjaman aktif" nilai={rm(x.pin.filter((p) => p.status === "aktif").reduce((s, p) => s + Number(p.jumlah_kewajipan) - Number(p.jumlah_dibayar), 0))} ikon={<CheckCircle2 />} tone="accent" nota="Baki tertunggak keseluruhan" />
        <Stat label="Pengguna" nilai={x.prof.length} ikon={<Users />} tone="navy" />
      </div>
      <Tabs defaultValue="perm">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-secondary p-1">
          <TabsTrigger value="perm" className="rounded-xl"><FileText className="size-4" /> Permohonan</TabsTrigger>
          <TabsTrigger value="pin" className="rounded-xl"><Banknote className="size-4" /> Pencairan</TabsTrigger>
          <TabsTrigger value="bayar" className="rounded-xl"><Wallet className="size-4" /> Pembayaran</TabsTrigger>
          <TabsTrigger value="tr" className="rounded-xl"><Receipt className="size-4" /> Transaksi</TabsTrigger>
          <TabsTrigger value="produk" className="rounded-xl"><Settings className="size-4" /> Produk</TabsTrigger>
          <TabsTrigger value="user" className="rounded-xl"><Users className="size-4" /> Pengguna</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl"><ScrollText className="size-4" /> Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="perm"><TabPermohonan senarai={x.perm} /></TabsContent>
        <TabsContent value="pin"><TabPencairan senarai={x.pin} nama={nama} /></TabsContent>
        <TabsContent value="bayar"><TabBayaran senarai={x.pin} nama={nama} /></TabsContent>
        <TabsContent value="tr">
          <div className="surface divide-y divide-border p-4">
            {x.tr.length === 0 && <p className="p-4 text-sm text-muted-foreground">Tiada transaksi.</p>}
            {x.tr.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-semibold">{rm(t.jumlah)} · {nama(t.user_id)} {t.mode === "whatsapp" && <span className="rounded bg-success/15 px-1.5 text-[10px] font-bold uppercase text-success">whatsapp</span>}</p><p className="text-xs text-muted-foreground">{masa(t.created_at)} · {t.penyedia} · {t.rujukan_gateway ?? "-"}</p></div>
                <Lencana peta={STATUS_TRANSAKSI} status={t.status} />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="produk"><TabProduk /></TabsContent>
        <TabsContent value="user"><TabPengguna prof={x.prof} roles={x.roles} sayaId={saya.data.user.id} /></TabsContent>
        <TabsContent value="audit">
          <div className="surface divide-y divide-border p-4">
            {x.audit.map((a) => (
              <div key={a.id} className="py-3 text-sm">
                <p className="font-semibold">{a.tindakan} <span className="font-normal text-muted-foreground">· {a.entiti}</span></p>
                <p className="text-xs text-muted-foreground">{masa(a.created_at)} · oleh {a.pelaku ? nama(a.pelaku) : "sistem/gateway"}</p>
                <code className="mt-1 block truncate text-[11px] text-muted-foreground">{JSON.stringify(a.butiran)}</code>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabPermohonan({ senarai }: { senarai: Permohonan[] }) {
  const [cari, setCari] = useState("");
  const [tapis, setTapis] = useState("semua");
  const [pilih, setPilih] = useState<Permohonan | null>(null);
  const hasil = useMemo(() => senarai.filter((p) =>
    (tapis === "semua" || p.status === tapis) &&
    [p.nama_penuh, p.emel, p.no_kad_pengenalan, p.no_telefon].join(" ").toLowerCase().includes(cari.toLowerCase())), [senarai, cari, tapis]);
  return (
    <div className="surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Cari nama, emel, KP, telefon" value={cari} onChange={(e) => setCari(e.target.value)} className="h-10 rounded-xl pl-9" /></div>
        <div className="flex flex-wrap gap-1">
          {["semua", "menunggu", "disemak", "lulus", "ditolak", "selesai", "disekat"].map((s) => (
            <button key={s} onClick={() => setTapis(s)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tapis === s ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{s === "semua" ? "Semua" : STATUS_PERMOHONAN[s].label}</button>
          ))}
        </div>
      </div>
      <div className="mt-3 divide-y divide-border">
        {hasil.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Tiada permohonan sepadan.</p>}
        {hasil.map((p) => (
          <button key={p.id} onClick={() => setPilih(p)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-3 text-left text-sm transition hover:bg-secondary/60">
            <div><p className="font-semibold">{p.nama_penuh}</p><p className="text-xs text-muted-foreground">{p.emel} · {masa(p.created_at)}</p></div>
            <Lencana peta={STATUS_PERMOHONAN} status={p.status} />
          </button>
        ))}
      </div>
      {pilih && <DetailPermohonan p={pilih} tutup={() => setPilih(null)} />}
    </div>
  );
}

function DetailPermohonan({ p, tutup }: { p: Permohonan; tutup: () => void }) {
  const qc = useQueryClient();
  const produk = useProduk();
  const [had, setHad] = useState("");
  const [sebab, setSebab] = useState("");
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [gambar, setGambar] = useState<{ kp?: string; selfie?: string; slip?: string }>({});
  useEffect(() => {
    Promise.all([
      supabase.storage.from("dokumen-permohonan").createSignedUrl(p.foto_kp_path, 300),
      supabase.storage.from("dokumen-permohonan").createSignedUrl(p.foto_selfie_path, 300),
      p.foto_slip_gaji_path ? supabase.storage.from("dokumen-permohonan").createSignedUrl(p.foto_slip_gaji_path, 300) : Promise.resolve(null),
    ]).then(([a, b, c]) => setGambar({ kp: a.data?.signedUrl, selfie: b.data?.signedUrl, slip: c?.data?.signedUrl }));
  }, [p]);
  const boleh = p.status === "menunggu" || p.status === "disemak";

  const putus = async (status: "disemak" | "lulus" | "ditolak") => {
    if (status === "lulus" && !(Number(had) > 0)) return toast.error("Masukkan had kredit.");
    if (status !== "disemak" && !confirm(`Sahkan keputusan: ${status === "lulus" ? "LULUS dengan had " + rm(had) : "TOLAK"}?`)) return;
    setSibuk(true);
    const { error } = await supabase.rpc("admin_keputusan", { _id: p.id, _status: status, _had: status === "lulus" ? Number(had) : null as unknown as number, _sebab: sebab, _catatan: catatan || null as unknown as string });
    setSibuk(false);
    if (error) return toast.error(ralatMesej(error));
    toast.success("Keputusan disimpan.");
    qc.invalidateQueries();
    tutup();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && tutup()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-3">{p.nama_penuh} <Lencana peta={STATUS_PERMOHONAN} status={p.status} /></DialogTitle></DialogHeader>
        <div className="grid gap-x-6 sm:grid-cols-2">
          {[["No. KP", p.no_kad_pengenalan], ["Telefon", p.no_telefon], ["Emel", p.emel], ["Pekerjaan", p.pekerjaan], ["Industri pekerjaan / bidang", p.industri || "-"], ["Pengalaman", `${p.pengalaman_tahun} tahun`], ["Gaji bulanan", rm(p.gaji_bulanan)], ["Tujuan", p.tujuan], ["Dihantar", masa(p.created_at)]].map(([l, v]) => <Baris key={l} label={l} nilai={v} />)}
        </div>
        <Baris label="Alamat" nilai={p.alamat} />
        <Baris label="Alamat pekerjaan" nilai={p.alamat_pekerjaan || "-"} />
        {Array.isArray(p.kontak_darurat) && p.kontak_darurat.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-bold">Kontak darurat</h3>
            {p.kontak_darurat.map((c, i) => c && typeof c === "object" && !Array.isArray(c) ? (
              <Baris key={i} label={`Kontak ${i + 1}`} nilai={`${String(c.nama ?? "")} · ${String(c.telefon ?? "")} · ${String(c.hubungan ?? "")}`} />
            ) : null)}
          </section>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(["kp", "selfie", ...(p.foto_slip_gaji_path ? ["slip" as const] : [])] as const).map((k) => (
            <a key={k} href={gambar[k]} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-border bg-secondary">
              {gambar[k] ? <img src={gambar[k]} alt={k === "kp" ? "Kad pengenalan" : k === "slip" ? "Slip gaji" : "Swafoto"} className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center"><Loader2 className="animate-spin" /></div>}
            </a>
          ))}
        </div>
        {p.had_kredit && <Baris label="Had diluluskan" nilai={rm(p.had_kredit)} />}
        {p.sebab_tolak && <Baris label="Sebab tolak" nilai={p.sebab_tolak} />}
        {p.sebab_edit && <Baris label="Alasan edit kredit" nilai={p.sebab_edit} />}
        {p.sebab_sekat && <Baris label="Alasan sekat" nilai={p.sebab_sekat} />}
        {boleh ? (
          <div className="space-y-3 rounded-2xl bg-secondary/60 p-4">
            <div className="space-y-1.5"><Label>Had kredit (RM {produk.data ? `${Number(produk.data.jumlah_minimum)}–${Number(produk.data.jumlah_maksimum)}` : ""})</Label><Input type="number" value={had} onChange={(e) => setHad(e.target.value)} className="rounded-xl bg-card" /></div>
            <div className="space-y-1.5"><Label>Sebab penolakan (dipaparkan kepada pengguna)</Label><Textarea value={sebab} onChange={(e) => setSebab(e.target.value)} maxLength={500} className="rounded-xl bg-card" /></div>
            <div className="space-y-1.5"><Label>Catatan</Label><Input value={catatan} onChange={(e) => setCatatan(e.target.value)} className="rounded-xl bg-card" /></div>
            <div className="grid grid-cols-3 gap-2">
              {p.status === "menunggu" && <Button variant="outline" disabled={sibuk} onClick={() => putus("disemak")}>Tanda disemak</Button>}
              <Button variant="success" disabled={sibuk} onClick={() => putus("lulus")}>Luluskan</Button>
              <Button variant="destructive" disabled={sibuk} onClick={() => putus("ditolak")}>Tolak</Button>
            </div>
          </div>
        ) : <UrusKredit p={p} tutup={tutup} />}
      </DialogContent>
    </Dialog>
  );
}

function UrusKredit({ p, tutup }: { p: Permohonan; tutup: () => void }) {
  const qc = useQueryClient();
  const [had, setHad] = useState(p.had_kredit == null ? "" : String(p.had_kredit));
  const [alasan, setAlasan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const bolehEdit = ["lulus", "selesai", "disekat"].includes(p.status);
  const bolehSekat = p.status !== "dibatalkan";
  const jalan = async (fn: () => PromiseLike<{ error: unknown }>, msg: string) => {
    if (alasan.trim().length < 3) return toast.error("Alasan wajib diisi.");
    setSibuk(true);
    const { error } = await fn();
    setSibuk(false);
    if (error) return toast.error(ralatMesej(error as never));
    toast.success(msg);
    qc.invalidateQueries();
    tutup();
  };
  return (
    <div className="space-y-3 rounded-2xl bg-secondary/60 p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="size-4" /> Diputuskan pada {masa(p.tarikh_keputusan)}.</p>
      {bolehEdit && <div className="space-y-1.5"><Label>Had kredit baharu</Label><Input type="number" value={had} onChange={(e) => setHad(e.target.value)} className="rounded-xl bg-card" /></div>}
      <div className="space-y-1.5"><Label>Alasan (wajib, dipaparkan kepada pengguna)</Label><Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={500} className="rounded-xl bg-card" /></div>
      <div className="grid grid-cols-2 gap-2">
        {bolehEdit && <Button variant="success" disabled={sibuk} onClick={() => jalan(() => supabase.rpc("admin_edit_kredit", { _id: p.id, _had: Number(had), _alasan: alasan }), "Had kredit dikemas kini.")}>Simpan edit kredit</Button>}
        {bolehSekat && (p.status === "disekat"
          ? <Button variant="outline" disabled={sibuk} onClick={() => jalan(() => supabase.rpc("admin_sekat", { _id: p.id, _sekat: false, _alasan: alasan }), "Sekatan dibuka.")}>Buka sekatan</Button>
          : <Button variant="destructive" disabled={sibuk} onClick={() => confirm("Sekat pengguna ini?") && jalan(() => supabase.rpc("admin_sekat", { _id: p.id, _sekat: true, _alasan: alasan }), "Pengguna disekat.")}>Sekat</Button>)}
      </div>
    </div>
  );
}

function TabPencairan({ senarai, nama }: { senarai: Pinjaman[]; nama: (id: string) => string }) {
  const qc = useQueryClient();
  const [rujukan, setRujukan] = useState<Record<string, string>>({});
  const proses = async (p: Pinjaman, lulus: boolean) => {
    const catatan = lulus ? "" : prompt("Sebab pencairan ditolak:") ?? "";
    const { error } = await supabase.rpc("admin_proses_pencairan", { _id: p.id, _lulus: lulus, _rujukan: lulus ? janaIdTransaksi() : "", _catatan: catatan });
    if (error) return toast.error(ralatMesej(error));
    toast.success(lulus ? "Dana ditanda dicairkan & jadual dijana." : "Pencairan ditolak.");
    qc.invalidateQueries();
  };
  if (!senarai.length) return <Kosong tajuk="Tiada pinjaman" />;
  return (
    <div className="space-y-3">
      {senarai.map((p) => (
        <div key={p.id} className="surface p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-semibold">{nama(p.user_id)} · {rm(p.jumlah_pokok)} / {p.tenor_bulan} hari</p><p className="text-xs text-muted-foreground">{p.nama_bank} · {p.nama_pemegang_akaun} · {p.no_akaun} · Kewajipan {rm(p.jumlah_kewajipan)} · Dibayar {rm(p.jumlah_dibayar)}</p></div>
            <Lencana peta={STATUS_PINJAMAN} status={p.status} />
          </div>
          {p.status === "menunggu_pencairan" && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <p className="flex-1 self-center text-xs text-muted-foreground">ID transaksi (TRX…) dijana automatik.</p>
              <Button variant="success" onClick={() => proses(p, true)}>Sahkan dicairkan</Button>
              <Button variant="outline" onClick={() => proses(p, false)}>Tolak</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TabProduk() {
  const produk = useProduk();
  const qc = useQueryClient();
  const [f, setF] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (produk.data && !f) {
      const p = produk.data;
      setF({ kadar: String(p.kadar_faedah_bulanan), yuran: String(p.yuran_pemprosesan), denda: String(p.denda_lewat), tenor: p.pilihan_tenor.join(","), min: String(p.jumlah_minimum), max: String(p.jumlah_maksimum), syarat: p.syarat });
    }
  }, [produk.data, f]);
  if (!f) return <Memuatkan />;
  const simpan = async () => {
    const tenor = f.tenor.split(",").map((t) => parseInt(t.trim(), 10)).filter((n) => !isNaN(n));
    const { error } = await supabase.rpc("admin_kemaskini_produk", { _kadar: Number(f.kadar), _yuran: Number(f.yuran), _denda: Number(f.denda), _tenor: tenor, _min: Number(f.min), _max: Number(f.max), _syarat: f.syarat });
    if (error) return toast.error(ralatMesej(error));
    toast.success("Tetapan produk dikemas kini. Berlaku untuk pencairan baharu.");
    qc.invalidateQueries({ queryKey: ["produk"] });
  };
  const M = (k: string, l: string) => <div className="space-y-1.5"><Label>{l}</Label><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="rounded-xl" /></div>;
  return (
    <div className="surface space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {M("kadar", "Faedah (% seminggu, flat)")}{M("yuran", "Yuran pemprosesan (%)")}{M("denda", "Caj lewat (RM)")}
        {M("tenor", "Pilihan tenor (hari, koma)")}{M("min", "Jumlah minimum (RM)")}{M("max", "Jumlah maksimum (RM)")}
      </div>
      <div className="space-y-1.5"><Label>Syarat pinjaman</Label><Textarea rows={5} value={f.syarat} onChange={(e) => setF({ ...f, syarat: e.target.value })} className="rounded-xl" /></div>
      <Button variant="hero" onClick={simpan}>Simpan tetapan</Button>
    </div>
  );
}

function TabPengguna({ prof, roles, sayaId }: { prof: { id: string; nama_penuh: string | null; emel: string | null; no_telefon: string | null; created_at: string }[]; roles: { user_id: string; role: string }[]; sayaId: string }) {
  const qc = useQueryClient();
  const [cari, setCari] = useState("");
  const [notis, setNotis] = useState<{ user: string | null; tajuk: string; mesej: string } | null>(null);
  const admin = (id: string) => roles.some((r) => r.user_id === id && r.role === "admin");
  const tukar = async (id: string, jadi: boolean) => {
    const { error } = await supabase.rpc("admin_tetap_admin", { _user: id, _admin: jadi });
    if (error) return toast.error(ralatMesej(error));
    toast.success("Peranan dikemas kini.");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const hantar = async () => {
    if (!notis) return;
    const { error } = await supabase.rpc("admin_hantar_notifikasi", { _user: notis.user as string, _tajuk: notis.tajuk, _mesej: notis.mesej });
    if (error) return toast.error(ralatMesej(error));
    toast.success("Notifikasi dihantar.");
    setNotis(null);
  };
  return (
    <div className="surface p-4">
      <div className="flex gap-2">
        <Input placeholder="Cari pengguna" value={cari} onChange={(e) => setCari(e.target.value)} className="rounded-xl" />
        <Button variant="outline" onClick={() => setNotis({ user: null, tajuk: "", mesej: "" })}><Send /> Hebahan</Button>
      </div>
      <div className="mt-3 divide-y divide-border">
        {prof.filter((p) => `${p.nama_penuh} ${p.emel}`.toLowerCase().includes(cari.toLowerCase())).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div><p className="font-semibold">{p.nama_penuh ?? "-"} {admin(p.id) && <span className="ml-1 rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-navy-foreground">ADMIN</span>}</p><p className="text-xs text-muted-foreground">{p.emel} · {p.no_telefon ?? "-"} · daftar {masa(p.created_at)}</p></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setNotis({ user: p.id, tajuk: "", mesej: "" })}>Notifikasi</Button>
              {p.id !== sayaId && <Button size="sm" variant="ghost" onClick={() => tukar(p.id, !admin(p.id))}>{admin(p.id) ? "Tarik admin" : "Jadikan admin"}</Button>}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!notis} onOpenChange={(o) => !o && setNotis(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>{notis?.user ? "Hantar notifikasi" : "Hebahan kepada semua pengguna"}</DialogTitle></DialogHeader>
          {notis && (
            <div className="space-y-3">
              <Input placeholder="Tajuk" value={notis.tajuk} maxLength={120} onChange={(e) => setNotis({ ...notis, tajuk: e.target.value })} />
              <Textarea placeholder="Mesej" value={notis.mesej} maxLength={1000} onChange={(e) => setNotis({ ...notis, mesej: e.target.value })} />
              <Button variant="hero" className="w-full" onClick={hantar}>Hantar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabBayaran({ senarai, nama }: { senarai: Pinjaman[]; nama: (id: string) => string }) {
  const qc = useQueryClient();
  const aktif = senarai.filter((p) => p.status === "aktif");
  const [pilih, setPilih] = useState<Pinjaman | null>(null);
  const [jumlah, setJumlah] = useState("");
  const [rujukan, setRujukan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const baki = (p: Pinjaman) => Math.max(0, Number(p.jumlah_kewajipan) - Number(p.jumlah_dibayar));
  const buka = (p: Pinjaman) => { setPilih(p); setJumlah(baki(p).toFixed(2)); setRujukan(""); setCatatan(""); };
  const simpan = async () => {
    if (!pilih) return;
    const n = Number(jumlah);
    if (!(n > 0)) return toast.error("Masukkan jumlah bayaran.");
    if (!confirm(`Rekod bayaran ${rm(n)} untuk ${nama(pilih.user_id)}?`)) return;
    setSibuk(true);
    const { error } = await supabase.rpc("admin_rekod_bayaran", { _pinjaman_id: pilih.id, _jumlah: n, _rujukan: rujukan, _catatan: catatan });
    setSibuk(false);
    if (error) return toast.error(ralatMesej(error));
    toast.success("Bayaran direkodkan.");
    setPilih(null);
    qc.invalidateQueries();
  };
  if (!aktif.length) return <Kosong tajuk="Tiada pinjaman aktif" mesej="Pinjaman yang sedang berjalan akan muncul di sini untuk direkodkan bayarannya." />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Rekod bayaran yang diterima daripada pelanggan melalui WhatsApp.</p>
      {aktif.map((p) => (
        <div key={p.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-semibold">{nama(p.user_id)}</p>
            <p className="text-xs text-muted-foreground">Kewajipan {rm(p.jumlah_kewajipan)} · Dibayar {rm(p.jumlah_dibayar)} · <b className="text-foreground">Baki {rm(baki(p))}</b></p>
          </div>
          <Button variant="success" onClick={() => buka(p)}><Wallet /> Rekod bayaran</Button>
        </div>
      ))}
      <Dialog open={!!pilih} onOpenChange={(o) => !o && setPilih(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Rekod bayaran WhatsApp</DialogTitle></DialogHeader>
          {pilih && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{nama(pilih.user_id)} · Baki {rm(baki(pilih))}</p>
              <div className="space-y-1.5"><Label>Jumlah diterima (RM)</Label><Input type="number" inputMode="decimal" value={jumlah} onChange={(e) => setJumlah(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-1.5"><Label>No. rujukan / resit (pilihan)</Label><Input value={rujukan} maxLength={80} onChange={(e) => setRujukan(e.target.value)} className="rounded-xl" /></div>
              <div className="space-y-1.5"><Label>Catatan (pilihan)</Label><Textarea value={catatan} maxLength={500} onChange={(e) => setCatatan(e.target.value)} className="rounded-xl" /></div>
              <Button variant="hero" className="w-full" onClick={simpan} disabled={sibuk}>{sibuk && <Loader2 className="animate-spin" />} Simpan bayaran</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
