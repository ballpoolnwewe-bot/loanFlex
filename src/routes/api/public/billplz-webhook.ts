import { createFileRoute } from "@tanstack/react-router";

async function hmacHex(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function samaMasa(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Callback Billplz (server-to-server). Status bayaran HANYA dikemas kini selepas tandatangan X-Signature disahkan.
export const Route = createFileRoute("/api/public/billplz-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["BILLPLZ_X_SIGNATURE_KEY"];
        if (!key) return new Response("Not configured", { status: 503 });
        const form = await request.formData();
        const medan: Record<string, string> = {};
        form.forEach((v, k) => (medan[k] = String(v)));
        const diberi = medan["x_signature"] ?? "";
        const sumber = Object.keys(medan)
          .filter((k) => k !== "x_signature")
          .sort()
          .map((k) => `${k}${medan[k]}`)
          .join("|");
        if (!samaMasa(await hmacHex(key, sumber), diberi)) return new Response("Invalid signature", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: t } = await supabaseAdmin.from("transaksi").select("id").eq("rujukan_gateway", medan["id"] ?? "").maybeSingle();
        if (!t) return new Response("Unknown bill", { status: 404 });
        const berjaya = medan["paid"] === "true";
        const { error } = await supabaseAdmin.rpc("sahkan_transaksi", {
          _id: t.id,
          _berjaya: berjaya,
          _rujukan: medan["id"]!,
          _jumlah_diterima: Number(medan["paid_amount"] ?? medan["amount"] ?? 0) / 100,
        });
        if (error) return new Response("Error", { status: 500 });
        return new Response("OK");
      },
    },
  },
});
