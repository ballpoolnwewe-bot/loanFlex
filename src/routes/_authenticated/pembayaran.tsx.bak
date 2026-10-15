import { waLink, salamMasa } from "@/lib/whatsapp";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CreditCard, Loader2, FlaskConical, ShieldCheck, Receipt, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bar, Kosong, Lencana, Memuatkan } from "@/components/app/ui-bits";
import { ringkasPinjaman, usePinjamanSaya } from "@/lib/data";
import { STATUS_TRANSAKSI, masa, ralatMesej, rm, tarikh } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { mulaBayaran, sahkanSimulasi, statusGateway } from "@/lib/bayaran.functions";

export const Route = createFileRoute("/_authenticated/pembayaran")({
  head: () => ({ meta: [{ title: "Pembayaran — RinggitFlex" }, { name: "description", content: "Bayar ansuran dan lihat sejarah transaksi." }, { property: "og:title", content: "Pembayaran — RinggitFlex" }, { property: "og:description", content: "Bayar ansuran dan lihat sejarah transaksi." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Pembayaran,
});

function Pembayaran() {
  const pin = usePinjamanSaya();
  const qc = useQueryClient();
  const gw = useQuery({ queryKey: ["gateway"], queryFn: () => statusGateway() });
  const mula = useServerFn(mulaBayaran);
  const sahkan = useServerFn(sahkanSimulasi);
  const [sibuk, setSibuk] = useState(false);
  const [sim, setSim] = useState<string | null>(null);

  if (pin.isLoading) return <Memuatkan />;
  const { semasa, seterusnya, baki, peratus } = ringkasPinjaman(pin.data);
  const transaksi = pin.data?.transaksi ?? [];

  const bayar = async () => {
    if (!seterusnya || sibuk) return;
    setSibuk(true);
    try {
      const r = await mula({ data: { ansuranId: seterusnya.id, origin: window.location.origin } });
      if (r.mode === "gateway" && r.url) {
        window.location.href = r.url;
        return;
      }
      setSim(r.transaksiId);
      qc.invalidateQueries({ queryKey: ["pinjaman-saya"] });
    } catch (e) {
      toast.error(ralatMesej(e));
    } finally {
      setSibuk(false);
    }
  };

  const tamatSim = async (berjaya: boolean) => {
    if (!sim) return;
    setSibuk(true);
    try {
      await sahkan({ data: { transaksiId: sim, berjaya } });
      toast[berjaya ? "success" : "error"](berjaya ? "Simulasi: pembayaran disahkan (bukan transaksi sebenar)." : "Simulasi: pembayaran gagal.");
      setSim(null);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(ralatMesej(e));
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div className="space-y-6 animate-rise">
      <h1 className="text-3xl font-bold">Pembayaran</h1>
      {!semasa || semasa.status !== "aktif" ? (
        <Kosong tajuk="Tiada tagihan aktif" mesej="Tagihan akan muncul selepas dana pinjaman anda dicairkan." aksi={<Button asChild variant="outline"><Link to="/pinjaman">Lihat pinjaman</Link></Button>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="relative overflow-hidden rounded-3xl bg-navy-grad p-6 text-navy-foreground lg:col-span-3 md:p-8">
            <div className="absolute inset-0 grid-glow" />
            <div className="relative">
              <p className="text-sm text-navy-foreground/70">Tagihan seterusnya {seterusnya && `· Ansuran #${seterusnya.bil}`}</p>
              <p className="mt-1 font-display text-5xl font-extrabold">{seterusnya ? rm(seterusnya.jumlah) : rm(0)}</p>
              {seterusnya && <p className="mt-2 text-sm text-navy-foreground/70">Jatuh tempo {tarikh(seterusnya.tarikh_jatuh_tempo, true)}</p>}
              <div className="mt-6 space-y-2"><Bar nilai={peratus} /><p className="text-xs text-navy-foreground/70">Baki keseluruhan {rm(baki)} · {peratus.toFixed(0)}% selesai</p></div>
              <Button asChild variant="hero" size="xl" className="mt-6 w-full sm:w-auto" disabled={!seterusnya}>
                <a
  href={waLink()}
  onClick={(e) => {
    e.currentTarget.href = waLink(
      `${salamMasa()}, saya ingin membayar ansuran${seterusnya ? ` #${seterusnya.bil} sebanyak ${rm(seterusnya.jumlah)}` : ""}.` +
      (semasa.rujukan_pencairan ? `\nID Transaksi: ${semasa.rujukan_pencairan}` : "")
    );
  }}
  target="_blank"
  rel="noopener noreferrer"
>
  <MessageCircle /> Bayar via WhatsApp
</a>
              </Button>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-navy-foreground/60"><ShieldCheck className="size-3.5" /> Pembayaran diuruskan oleh khidmat pelanggan kami melalui WhatsApp.</p>
            </div>
          </div>
          <div className="surface p-6 lg:col-span-2">
            <h2 className="font-bold">Ringkasan</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Jumlah kewajipan</dt><dd className="font-semibold">{rm(semasa.jumlah_kewajipan)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Telah dibayar</dt><dd className="font-semibold text-success">{rm(semasa.jumlah_dibayar)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Baki</dt><dd className="font-semibold">{rm(baki)}</dd></div>
            </dl>
          </div>
        </div>
      )}

      <div className="surface p-6">
        <h2 className="flex items-center gap-2 font-bold"><Receipt className="size-5 text-primary" /> Sejarah transaksi</h2>
        {transaksi.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Belum ada transaksi.</p> : (
          <div className="mt-4 divide-y divide-border">
            {transaksi.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{rm(t.jumlah)} {t.mode === "simulasi" && <span className="ml-1 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning-foreground">Simulasi</span>}</p>
                  <p className="text-xs text-muted-foreground">{masa(t.created_at)} · {t.rujukan_gateway ?? t.id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {t.status === "menunggu" && t.url_bayaran && <a href={t.url_bayaran} className="text-xs font-semibold text-primary underline">Teruskan</a>}
                  <Lencana peta={STATUS_TRANSAKSI} status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!sim} onOpenChange={(o) => !o && setSim(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FlaskConical className="size-5 text-warning-foreground" /> Gerbang pembayaran simulasi</DialogTitle>
            <DialogDescription>Ini hanya untuk ujian pembangunan. Tiada wang sebenar dipindahkan. Pilih keputusan yang ingin disimulasikan oleh "gerbang".</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="success" onClick={() => tamatSim(true)} disabled={sibuk}>Simulasi berjaya</Button>
            <Button variant="outline" onClick={() => tamatSim(false)} disabled={sibuk}>Simulasi gagal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
