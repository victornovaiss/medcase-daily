import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MED-${s}`;
}

/**
 * Mercado Pago webhook.
 * MP sends signature in `x-signature` header: `ts=...,v1=<hmac>`.
 * Manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 */
function verifyMPSignature(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;
  const sigHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id") || "";
  if (!sigHeader) return false;

  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), (v || "").trim()];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const body = await request.text();
        let payload: any = {};
        try {
          payload = body ? JSON.parse(body) : {};
        } catch {
          /* ignore */
        }

        // Resource id can come from query (?data.id=...) or body
        const dataId =
          url.searchParams.get("data.id") ||
          payload?.data?.id?.toString() ||
          payload?.id?.toString() ||
          "";

        if (!dataId) return new Response("ok", { status: 200 });

        /*if (!verifyMPSignature(request, dataId)) {
          console.warn("MP webhook: invalid signature", { dataId });
          return new Response("Invalid signature", { status: 401 });
        }*/

        console.warn("Webhook recebido (sem validação)", { dataId });

        const type =
          url.searchParams.get("type") || payload?.type || payload?.action || "";

        if (!type.includes("payment")) {
          return new Response("ignored", { status: 200 });
        }

        const token = process.env.MP_ACCESS_TOKEN;
        if (!token) return new Response("server misconfig", { status: 500 });

        // Fetch payment from MP
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.error("MP webhook: payment fetch failed", res.status);
          return new Response("payment fetch failed", { status: 200 });
        }
        const payment = await res.json();

        if (payment.status !== "approved") {
          return new Response("ok", { status: 200 });
        }

        // Idempotency: already processed?
        const { data: existing } = await supabaseAdmin
          .from("premium_purchases")
          .select("id, premium_code")
          .eq("payment_id", String(payment.id))
          .maybeSingle();
        if (existing?.premium_code) {
          return new Response("ok", { status: 200 });
        }

        const code = randomCode();
        await supabaseAdmin.from("premium_codes").insert({
          code,
          active: true,
          type: "full_access",
        });

        await supabaseAdmin.from("premium_purchases").upsert(
          {
            payment_id: String(payment.id),
            preference_id: payment.preference_id ?? null,
            status: "approved",
            amount: payment.transaction_amount,
            //payer_email: payment.payer?.email ?? null,
            premium_code: code,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "payment_id" }
        );

        return new Response("ok", { status: 200 });
      },
    },
  },
});
