import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_PASSWORD = () => process.env.ADMIN_PASSWORD || "medcase-admin";

export const validatePremiumCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; deviceId?: string }) => d)
  .handler(async ({ data }) => {
    const code = (data.code || "").trim().toUpperCase();
    const deviceId = (data.deviceId || "").trim();
    if (!code) return { ok: false, error: "Código vazio" };
    const { data: row, error } = await supabaseAdmin
      .from("premium_codes")
      .select("id, code, active, expires_at, max_uses, used_devices")
      .eq("code", code)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: "Código inválido" };
    if (!row.active) return { ok: false, error: "Código desativado" };
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
      return { ok: false, error: "Código expirado" };

    const used: string[] = Array.isArray(row.used_devices) ? (row.used_devices as string[]) : [];
    const maxUses = row.max_uses ?? 3;

    // Mesmo dispositivo: já está liberado, não consome uso
    if (deviceId && used.includes(deviceId)) return { ok: true };

    if (used.length >= maxUses) {
      return {
        ok: false,
        error: `Código já atingiu o limite de ${maxUses} ativações`,
      };
    }

    if (deviceId) {
      const next = [...used, deviceId];
      const { error: upErr } = await supabaseAdmin
        .from("premium_codes")
        .update({ used_devices: next })
        .eq("id", row.id)
        .eq("used_devices", JSON.stringify(used) as any); // optimistic-ish; tolera diff
      if (upErr) {
        // fallback sem condição estrita
        await supabaseAdmin
          .from("premium_codes")
          .update({ used_devices: next })
          .eq("id", row.id);
      }
    }
    return { ok: true };
  });

export const adminListPremiumCodes = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { data: rows, error } = await supabaseAdmin
      .from("premium_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows;
  });

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `MED-${s}`;
}

export const adminCreatePremiumCode = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; code?: string }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const code = (data.code?.trim() || randomCode()).toUpperCase();
    const { error } = await supabaseAdmin
      .from("premium_codes")
      .insert({ code, active: true, type: "full_access" });
    if (error) throw new Error(error.message);
    return { ok: true, code };
  });

export const adminTogglePremiumCode = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string; active: boolean }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { error } = await supabaseAdmin
      .from("premium_codes")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeletePremiumCode = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { error } = await supabaseAdmin.from("premium_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetPremiumCodeUses = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { error } = await supabaseAdmin
      .from("premium_codes")
      .update({ used_devices: [] })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
