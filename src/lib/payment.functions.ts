import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PRODUCT_NAME = "MedCase Daily — Acesso Premium";
const PRODUCT_PRICE = 19.9;

function getBaseUrl() {
  try {
    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  } catch {
    return "";
  }
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MED-${s}`;
}

function getTokenMode(token: string) {
  if (token.startsWith("TEST-")) return "test" as const;
  if (token.startsWith("APP_USR-")) return "live" as const;
  return "unknown" as const;
}

/** Create a Mercado Pago Checkout Pro preference and return its init_point. */
export const createMPPreference = createServerFn({ method: "POST" })
  .inputValidator((d: { payerEmail?: string }) => d)
  .handler(async ({ data }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("Mercado Pago não configurado");

    const base = getBaseUrl();
    const mode = getTokenMode(token);

    if (mode === "unknown") {
      throw new Error("Credencial do Mercado Pago inválida");
    }

    if (mode === "live" && base.includes("-preview--")) {
      throw new Error(
        "O preview está usando credencial live do Mercado Pago. Para testar com cartão de teste, troque a chave para TEST- ou publique o app para usar pagamentos reais."
      );
    }

    const body: any = {
      items: [
        {
          id: "medcase-premium",
          title: PRODUCT_NAME,
          description: "Acesso vitalício aos modos premium",
          quantity: 1,
          currency_id: "BRL",
          unit_price: PRODUCT_PRICE,
        },
      ],
      back_urls: {
        success: `${base}/premium/sucesso`,
        failure: `${base}/premium?status=failure`,
        pending: `${base}/premium/sucesso?status=pending`,
      },
      auto_return: "approved",
      notification_url: `${base}/api/public/mp-webhook`,
      statement_descriptor: "MEDCASE",
    };
    if (data.payerEmail) body.payer = { email: data.payerEmail };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("MP preference error:", json);
      throw new Error(json?.message || "Erro ao criar preferência");
    }

    // Persist pending purchase
    await supabaseAdmin.from("premium_purchases").insert({
      preference_id: json.id,
      status: "pending",
      amount: PRODUCT_PRICE,
      payer_email: data.payerEmail ?? null,
    });

    const initPoint = mode === "test" ? json.sandbox_init_point : json.init_point;
    return { initPoint, preferenceId: json.id as string, sandbox: mode === "test" };
  });

/** Check the status of a payment (called from /premium/sucesso). */
export const checkMPPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { paymentId: string }) => d)
  .handler(async ({ data }) => {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("Mercado Pago não configurado");

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${data.paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Pagamento não encontrado");
    const payment = await res.json();

    if (payment.status !== "approved") {
      return { approved: false, status: payment.status as string, code: null };
    }

    // Already processed? Return existing code.
    const { data: existing } = await supabaseAdmin
      .from("premium_purchases")
      .select("premium_code")
      .eq("payment_id", String(payment.id))
      .maybeSingle();

    if (existing?.premium_code) {
      return { approved: true, status: "approved", code: existing.premium_code };
    }

    // Generate code, store, mark purchase
    const code = randomCode();
    await supabaseAdmin.from("premium_codes").insert({
      code,
      active: true,
      type: "full_access",
    });

    const preferenceId = payment.order?.id ? null : payment.preference_id ?? null;
    await supabaseAdmin.from("premium_purchases").upsert(
      {
        payment_id: String(payment.id),
        preference_id: preferenceId,
        status: "approved",
        amount: payment.transaction_amount,
        payer_email: payment.payer?.email ?? null,
        premium_code: code,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "payment_id" }
    );

    return { approved: true, status: "approved", code };
  });
