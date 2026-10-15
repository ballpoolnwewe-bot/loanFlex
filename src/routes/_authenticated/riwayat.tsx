import { createFileRoute } from "@tanstack/react-router";
import { Kosong, Lencana, Memuatkan } from "@/components/app/ui-bits";
import { usePermohonanSaya, usePinjamanSaya, useSaya } from "@/lib/data";
import { STATUS_PERMOHONAN, STATUS_PINJAMAN, STATUS_TRANSAKSI, masa, rm, tarikh } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/riwayat")({
  head: () => ({ meta: [{ title: "Riwayat — RinggitFlex" }, { name: "description", content: "Riwayat permohonan, pinjaman dan transaksi." }] }),
  component: Riwayat,
});

function Riwayat() {
  const perm = usePermohonanSaya();
  const pin = usePinjamanSaya();
  const saya = useSaya();
  if (perm.isLoading || pin.isLoading) return <Memuatkan />;
  return (
    <div className="space-y-6 animate-rise">
      <h1 className="text-3xl font-bold">Riwayat & akaun</h1>
      <div className="surface grid gap-4 p-6 text-sm sm:grid-cols-3">
        <div><p className="text-muted-foreground">Nama</p><p className="font-semibold">{saya.data?.profil?.nama_penuh ?? "-"}</p></div>
        <div><p className="text-muted-foreground">Emel</p><p className="font-semibold">{saya.data?.user.email}</p></div>
        <div><p className="text-muted-foreground">Telefon</p><p className="font-semibold">{saya.data?.profil?.no_telefon ?? "-"}</p></div>
      </div>
      <section className="surface p-6">
        <h2 className="font-bold">Permohonan</h2>
        {!perm.data?.length ? <div className="mt-4"><Kosong tajuk="Tiada permohonan" /></div> : (
          <div className="mt-3 divide-y divide-border">
            {perm.data.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-semibold">{rm(p.jumlah_dipohon)} · {p.tujuan}</p><p className="text-xs text-muted-foreground">{masa(p.created_at)}{p.had_kredit ? ` · Had ${rm(p.had_kredit)}` : ""}</p></div>
                <Lencana peta={STATUS_PERMOHONAN} status={p.status} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="surface p-6">
        <h2 className="font-bold">Pinjaman</h2>
        {!pin.data?.pinjaman.length ? <p className="mt-3 text-sm text-muted-foreground">Tiada pinjaman.</p> : (
          <div className="mt-3 divide-y divide-border">
            {pin.data.pinjaman.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-semibold">{rm(p.jumlah_pokok)} · {p.tenor_bulan} hari</p><p className="text-xs text-muted-foreground">Dimohon {tarikh(p.created_at)} · Kewajipan {rm(p.jumlah_kewajipan)}</p></div>
                <Lencana peta={STATUS_PINJAMAN} status={p.status} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="surface p-6">
        <h2 className="font-bold">Transaksi</h2>
        {!pin.data?.transaksi.length ? <p className="mt-3 text-sm text-muted-foreground">Tiada transaksi.</p> : (
          <div className="mt-3 divide-y divide-border">
            {pin.data.transaksi.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-semibold">{rm(t.jumlah)}{t.mode === "simulasi" ? " (simulasi)" : ""}</p><p className="text-xs text-muted-foreground">{masa(t.created_at)}</p></div>
                <Lencana peta={STATUS_TRANSAKSI} status={t.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
