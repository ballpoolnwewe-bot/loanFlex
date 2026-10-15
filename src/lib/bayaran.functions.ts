import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function gatewayAktif() {
  return !!(process.env["BILLPLZ_API_KEY"] && process.env["BILLPLZ_COLLECTION_ID"] && process.env["BILLPLZ_X_SIGNATURE_KEY"]);
}
function simulasiDibenarkan() {
  return !gatewayAktif() && process.env["PAYMENT_SIMULATION"] !== "off";
}

export const statusGateway = createServerFn({ method: "GET" }).handler(async () => ({
  gateway: gatewayAktif(),
  simulasi: simulasiDibenarkan(),
}));

export const mulaBayaran = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ansuranId: z.string().uuid(), origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const gateway = gatewayAktif();
    if (!gateway && !simulasiDibenarkan()) throw new Error("Gerbang pembayaran belum dikonfigurasi.");
    const { data: t, error } = await context.supabase.rpc("cipta_transaksi", {
      _ansuran_id: data.ansuranId,
      _mode: gateway ? "gateway" : "simulasi",
    });
    if (error || !t) throw new Error(error?.message ?? "Gagal mencipta transaksi.");
    if (!gateway) return { mode: "simulasi" as const, transaksiId: t.id, url: null };

    const base = (process.env["BILLPLZ_SANDBOX"] === "true" ? "https://www.billplz-sandbox.com" : "https://www.billplz.com") + "/api/v3/bills";
    const { data: profil } = await context.supabase.from("profiles").select("nama_penuh, emel").eq("id", context.userId).maybeSingle();
    const origin = new URL(data.origin).origin;
    const body = new URLSearchParams({
      collection_id: process.env["BILLPLZ_COLLECTION_ID"]!,
      email: profil?.emel ?? "",
      name: (profil?.nama_penuh || "Pelanggan RinggitFlex").slice(0, 255),
      amount: String(Math.round(Number(t.jumlah) * 100)),
      description: `Bayaran ansuran RinggitFlex`.slice(0, 200),
      callback_url: `${origin}/api/public/billplz-webhook`,
      redirect_url: `${origin}/pembayaran`,
      reference_1_label: "Transaksi",
      reference_1: t.id,
    });
    const res = await fetch(base, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(process.env["BILLPLZ_API_KEY"] + ":") },
      body,
    });
    const bil = (await res.json()) as { id?: string; url?: string; error?: { message?: unknown } };
    if (!res.ok || !bil.id || !bil.url) throw new Error("Gerbang pembayaran menolak permintaan.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("transaksi").update({ rujukan_gateway: bil.id, url_bayaran: bil.url }).eq("id", t.id);
    return { mode: "gateway" as const, transaksiId: t.id, url: bil.url };
  });

/** MOD SIMULASI (development sahaja): hanya berfungsi apabila gateway sebenar TIDAK dikonfigurasi. */
export const sahkanSimulasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ transaksiId: z.string().uuid(), berjaya: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!simulasiDibenarkan()) throw new Error("Mod simulasi dimatikan.");
    const { data: t } = await context.supabase.from("transaksi").select("*").eq("id", data.transaksiId).eq("user_id", context.userId).maybeSingle();
    if (!t || t.mode !== "simulasi") throw new Error("Transaksi tidak sah.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("sahkan_transaksi", {
      _id: t.id,
      _berjaya: data.berjaya,
      _rujukan: `SIM-${t.id.slice(0, 8).toUpperCase()}`,
      _jumlah_diterima: Number(t.jumlah),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
