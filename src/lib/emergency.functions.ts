import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_PASSWORD = () => process.env.ADMIN_PASSWORD || "medcase-admin";

export const getEmergencySession = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("emergency_cases")
      .select("id, question, options, correct_answer")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListEmergencyCases = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { data: rows, error } = await supabaseAdmin
      .from("emergency_cases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows;
  });

export const adminUpsertEmergencyCase = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      password: string;
      id?: string;
      date?: string | null;
      question: string;
      options: string[];
      correct_answer: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { password, id, ...payload } = data;
    const clean = {
      ...payload,
      date: payload.date || null,
    };
    if (id) {
      const { error } = await supabaseAdmin
        .from("emergency_cases")
        .update(clean)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("emergency_cases").insert(clean);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteEmergencyCase = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { error } = await supabaseAdmin.from("emergency_cases").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
