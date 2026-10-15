import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet, CalendarClock, PiggyBank, FileText, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bar, Kosong, Lencana, Memuatkan, Stat } from "@/components/app/ui-bits";
import { ringkasPinjaman, useKelayakan, useNotifikasi, usePermohonanSaya, usePinjamanSaya, useSaya } from "@/lib/data";
import { STATUS_PERMOHONAN, STATUS_PINJAMAN, masa, rm, tarikh } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Papan Pemuka — RinggitFlex" }, { name: "description", content: "Ringkasan akaun pinjaman anda." }] }),
  component: Dashboard,
});

const LANGKAH = ["menunggu", "disemak", "lulus"];

function Dashboard() {
  const saya = useSaya();
  const perm = usePermohonanSaya();
  const pin = usePinjamanSaya();
  const kel = useKelayakan();
  const notis = useNotifikasi();
  if (saya.isLoading || perm.isLoading || pin.isLoading) return <Memuatkan />;

  const terkini = perm.data?.[0];
  const lulus = perm.data?.find((p) => p.status === "lulus");
  const { semasa, seterusnya, baki, peratus } = ringkasPinjaman(pin.data);
  const lewat = seterusnya && new Date(seterusnya.tarikh_jatuh_tempo) < new Date(new Date().toDateString());
  const hampir = seterusnya && !lewat && (new Date(seterusnya.tarikh_jatuh_tempo).getTime() - Date.now()) / 864e5 <= 5;
  const hadTersedia = lulus && !semasa ? Number(lulus.had_kredit) : 0;
  const nama = saya.data?.profil?.nama_penuh?.split(" ")[0] ?? "Pengguna";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-navy-grad p-6 text-navy-foreground md:p-8 animate-rise">
        <div className="absolute inset-0 grid-glow" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-navy-foreground/70">Selamat datang kembali,</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">{nama} 👋</h1>
            <p className="mt-2 max-w-md text-sm text-navy-foreground/70">{saya.data?.user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {kel.data?.boleh ? (
              <Button asChild variant="hero" size="lg"><Link to="/mohon">Mohon pinjaman <ArrowRight /></Link></Button>
            ) : lulus && !semasa ? (
              <Button asChild variant="hero" size="lg"><Link to="/pinjaman">Cairkan dana <ArrowRight /></Link></Button>
            ) : semasa?.status === "aktif" ? (
              <Button asChild variant="hero" size="lg"><Link to="/pembayaran">Bayar ansuran <ArrowRight /></Link></Button>
            ) : null}
          </div>
        </div>
      </div>

      {(lewat || hampir) && seterusnya && (
        <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${lewat ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/15 text-warning-foreground"}`}>
          <AlertTriangle className="size-5 shrink-0" />
          <p className="flex-1"><b>{lewat ? "Ansuran tertunggak!" : "Jatuh tempo tidak lama lagi."}</b> Ansuran #{seterusnya.bil} sebanyak {rm(seterusnya.jumlah)} perlu dibayar sebelum {tarikh(seterusnya.tarikh_jatuh_tempo)}.</p>
          <Link to="/pembayaran" className="font-semibold underline">Bayar</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Had tersedia" nilai={rm(hadTersedia)} ikon={<PiggyBank />} tone="accent" nota={lulus ? `Had diluluskan ${rm(lulus.had_kredit)}` : "Belum ada had diluluskan"} />
        <Stat label="Baki kewajipan" nilai={rm(baki)} ikon={<Wallet />} nota={semasa ? `Daripada ${rm(semasa.jumlah_kewajipan)}` : "Tiada pinjaman aktif"} />
        <Stat label="Bayaran seterusnya" nilai={seterusnya ? rm(seterusnya.jumlah) : "-"} ikon={<CalendarClock />} tone="warning" nota={seterusnya ? `Jatuh tempo ${tarikh(seterusnya.tarikh_jatuh_tempo)}` : "Tiada jadual"} />
        <Stat label="Jumlah permohonan" nilai={perm.data?.length ?? 0} ikon={<FileText />} tone="navy" nota={terkini ? `Terkini: ${tarikh(terkini.created_at)}` : "Belum memohon"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="surface p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Status permohonan terkini</h2>
            {terkini && <Lencana peta={STATUS_PERMOHONAN} status={terkini.status} />}
          </div>
          {!terkini ? (
            <div className="mt-4"><Kosong tajuk="Belum ada permohonan" mesej="Mulakan permohonan pertama anda untuk mendapatkan had kredit." aksi={kel.data?.boleh && <Button asChild variant="hero"><Link to="/mohon">Mohon sekarang</Link></Button>} /></div>
          ) : (
            <>
              <div className="mt-6 flex items-center">
                {LANGKAH.map((l, i) => {
                  const idx = terkini.status === "ditolak" ? 2 : terkini.status === "selesai" ? 3 : LANGKAH.indexOf(terkini.status);
                  const aktif = i <= idx;
                  const label = i === 2 && terkini.status === "ditolak" ? "Ditolak" : ["Dihantar", "Disemak", "Keputusan"][i];
                  return (
                    <div key={l} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`flex size-9 items-center justify-center rounded-full text-sm font-bold transition ${aktif ? (terkini.status === "ditolak" && i === 2 ? "bg-destructive text-destructive-foreground" : "bg-brand text-primary-foreground") : "bg-secondary text-muted-foreground"}`}>{i + 1}</span>
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                      </div>
                      {i < 2 && <div className={`mx-2 mb-5 h-1 flex-1 rounded-full ${i < idx ? "bg-primary" : "bg-secondary"}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Jumlah dipohon</p><p className="font-semibold">{rm(terkini.jumlah_dipohon)}</p></div>
                <div><p className="text-muted-foreground">Tarikh hantar</p><p className="font-semibold">{tarikh(terkini.created_at)}</p></div>
              </div>
              {(terkini.status === "lulus" || terkini.status === "ditolak") && (
                <Button asChild variant="outline" className="mt-5 rounded-full"><Link to="/keputusan">Lihat keputusan penuh</Link></Button>
              )}
              {!kel.data?.boleh && kel.data?.boleh_mohon_pada && (
                <p className="mt-4 text-sm text-muted-foreground">Anda boleh memohon semula pada <b>{tarikh(kel.data.boleh_mohon_pada, true)}</b>.</p>
              )}
            </>
          )}
        </div>

        <div className="surface p-6 lg:col-span-2">
          <h2 className="text-lg font-bold">Pinjaman semasa</h2>
          {!semasa ? (
            <p className="mt-4 text-sm text-muted-foreground">Tiada pinjaman aktif buat masa ini.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between"><p className="font-display text-2xl font-bold">{rm(semasa.jumlah_pokok)}</p><Lencana peta={STATUS_PINJAMAN} status={semasa.status} /></div>
              <Bar nilai={peratus} />
              <p className="text-xs text-muted-foreground">{peratus.toFixed(0)}% dijelaskan · {rm(semasa.jumlah_dibayar)} / {rm(semasa.jumlah_kewajipan)}</p>
              <Button asChild variant="outline" className="w-full rounded-full"><Link to="/pinjaman">Butiran pinjaman</Link></Button>
            </div>
          )}
          <h3 className="mt-8 text-sm font-bold">Notifikasi terkini</h3>
          <ul className="mt-3 space-y-3">
            {(notis.data ?? []).slice(0, 4).map((n) => (
              <li key={n.id} className="text-sm"><p className="font-semibold">{n.tajuk}</p><p className="text-xs text-muted-foreground">{masa(n.created_at)}</p></li>
            ))}
            {notis.data?.length === 0 && <li className="text-sm text-muted-foreground">Tiada notifikasi.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
