import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getTodayCase = createServerFn({ method: "GET" })
  .inputValidator((d: { mode: string; date: string }) => d)
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("daily_cases")
      .select("*")
      .eq("mode", data.mode)
      .eq("date", data.date)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listPastCases = createServerFn({ method: "GET" })
  .inputValidator((d: { today: string }) => d)
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("daily_cases")
      .select("date,mode,title,diagnosis")
      .lt("date", data.today)
      .order("date", { ascending: false })
      .limit(180);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
const ADMIN_PASSWORD = () => process.env.ADMIN_PASSWORD || "medcase-admin";

export const adminListCases = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; mode?: string }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    let q = supabaseAdmin.from("daily_cases").select("*").order("date", { ascending: false });
    if (data.mode) q = q.eq("mode", data.mode);
    const { data: rows, error } = await q.limit(200);
    if (error) throw new Error(error.message);
    return rows;
  });

export const adminUpsertCase = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      password: string;
      id?: string;
      date: string;
      mode: string;
      title: string;
      case_text: string;
      exam_options: string[];
      exam_results: Record<string, string>;
      correct_exam: string;
      treatment_options: string[];
      correct_treatment: string;
      diagnosis: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { password, id, ...payload } = data;
    if (id) {
      const { error } = await supabaseAdmin.from("daily_cases").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("daily_cases").upsert(payload, {
        onConflict: "date,mode",
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteCase = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD()) throw new Error("Senha incorreta");
    const { error } = await supabaseAdmin.from("daily_cases").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
