import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { adminListCases, adminUpsertCase, adminDeleteCase } from "@/lib/cases.functions";
import {
  adminListEmergencyCases,
  adminUpsertEmergencyCase,
  adminDeleteEmergencyCase,
} from "@/lib/emergency.functions";
import {
  adminListImageCases,
  adminUpsertImageCase,
  adminDeleteImageCase,
} from "@/lib/image-cases.functions";
import {
  adminListPremiumCodes,
  adminCreatePremiumCode,
  adminTogglePremiumCode,
  adminDeletePremiumCode,
  adminResetPremiumCodeUses,
} from "@/lib/premium.functions";
import { MODES, type GameMode, todayISO } from "@/lib/game";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — MedCase Daily" }] }),
  component: AdminPage,
});

type CaseRow = {
  id: string;
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
};

type ERow = {
  id: string;
  date: string | null;
  question: string;
  options: string[];
  correct_answer: string;
};

type CodeRow = {
  id: string;
  code: string;
  active: boolean;
  type: string;
  expires_at: string | null;
  created_at: string;
  max_uses: number | null;
  used_devices: string[] | null;
};

type Tab = "cases" | "ps" | "image" | "codes";

type ImgRow = {
  id: string;
  date: string | null;
  image_url: string;
  prompt: string;
  options: string[];
  correct_answer: string;
};

function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("cases");

  async function login() {
    try {
      await adminListCases({ data: { password } });
      setAuthed(true);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="text-sm text-muted-foreground">
            ← início
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito.</p>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="mt-5 w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
          />
          <button
            onClick={login}
            className="mt-3 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="mb-5 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground">
            ← início
          </Link>
          <h1 className="text-2xl font-bold">Admin</h1>
          <span />
        </div>

        <div className="mb-5 flex gap-1 rounded-xl border border-border bg-card p-1 text-sm">
          {(
            [
              ["cases", "Casos"],
              ["ps", "Pronto Socorro"],
              ["image", "Imagem"],
              ["codes", "Códigos"],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-lg px-3 py-2 transition-colors ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "cases" && <CasesTab password={password} />}
        {tab === "ps" && <PSTab password={password} />}
        {tab === "image" && <ImageTab password={password} />}
        {tab === "codes" && <CodesTab password={password} />}
      </div>
    </div>
  );
}

/* ============================== CASES TAB ============================== */

function CasesTab({ password }: { password: string }) {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [editing, setEditing] = useState<Partial<CaseRow> | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const rows = await adminListCases({ data: { password } });
    setCases((rows as CaseRow[]) ?? []);
    setLoaded(true);
  }
  if (!loaded) refresh();

  async function save() {
    if (!editing) return;
    try {
      await adminUpsertCase({
        data: {
          password,
          id: editing.id,
          date: editing.date || todayISO(),
          mode: editing.mode || "clinical",
          title: editing.title || "",
          case_text: editing.case_text || "",
          exam_options: editing.exam_options || [],
          exam_results: editing.exam_results || {},
          correct_exam: editing.correct_exam || "",
          treatment_options: editing.treatment_options || [],
          correct_treatment: editing.correct_treatment || "",
          diagnosis: editing.diagnosis || "",
        },
      });
      toast.success("Salvo");
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir caso?")) return;
    await adminDeleteCase({ data: { password, id } });
    refresh();
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() =>
            setEditing({
              date: todayISO(),
              mode: "clinical",
              exam_options: ["", "", "", "", ""],
              exam_results: {},
              treatment_options: ["", "", "", "", ""],
            })
          }
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          + Novo caso
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {cases.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
          >
            <div>
              <div className="text-xs text-muted-foreground">
                {c.date} · {MODES[c.mode as GameMode]?.label ?? c.mode}
              </div>
              <div className="font-semibold">{c.title}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(c)}
                className="rounded-lg border border-border px-3 py-1 text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => remove(c.id)}
                className="rounded-lg border border-border px-3 py-1 text-sm text-destructive"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? "Editar caso" : "Novo caso"} onClose={() => setEditing(null)} onSave={save}>
          <CaseEditor value={editing} onChange={setEditing} />
        </Modal>
      )}
    </div>
  );
}

function CaseEditor({
  value,
  onChange,
}: {
  value: Partial<CaseRow>;
  onChange: (v: Partial<CaseRow>) => void;
}) {
  function set<K extends keyof CaseRow>(k: K, v: any) {
    onChange({ ...value, [k]: v });
  }
  const exam = value.exam_options || ["", "", "", "", ""];
  const tx = value.treatment_options || ["", "", "", "", ""];

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Data">
          <input
            type="date"
            value={value.date || ""}
            onChange={(e) => set("date", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </Field>
        <Field label="Modo">
          <select
            value={value.mode || "clinical"}
            onChange={(e) => set("mode", e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          >
            <option value="clinical">Clínica</option>
            <option value="pediatrics">Pediatria</option>
            <option value="gyneco">GO</option>
          </select>
        </Field>
      </div>
      <Field label="Título">
        <input
          value={value.title || ""}
          onChange={(e) => set("title", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
      <Field label="Caso clínico">
        <textarea
          rows={5}
          value={value.case_text || ""}
          onChange={(e) => set("case_text", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>

      <div>
        <div className="mb-1 text-xs text-muted-foreground">5 opções de exame + resultado</div>
        {exam.map((opt, i) => (
          <div key={i} className="mb-2 grid grid-cols-2 gap-2">
            <input
              placeholder={`Exame ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const next = [...exam];
                next[i] = e.target.value;
                set("exam_options", next);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
            <input
              placeholder="Resultado"
              value={(value.exam_results || {})[opt] || ""}
              onChange={(e) => {
                const map = { ...(value.exam_results || {}) };
                if (opt) map[opt] = e.target.value;
                set("exam_results", map);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2"
            />
          </div>
        ))}
      </div>
      <Field label="Exame correto">
        <input
          value={value.correct_exam || ""}
          onChange={(e) => set("correct_exam", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>

      <div>
        <div className="mb-1 text-xs text-muted-foreground">5 condutas</div>
        {tx.map((opt, i) => (
          <input
            key={i}
            placeholder={`Conduta ${i + 1}`}
            value={opt}
            onChange={(e) => {
              const next = [...tx];
              next[i] = e.target.value;
              set("treatment_options", next);
            }}
            className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        ))}
      </div>
      <Field label="Conduta correta">
        <input
          value={value.correct_treatment || ""}
          onChange={(e) => set("correct_treatment", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
      <Field label="Diagnóstico">
        <input
          value={value.diagnosis || ""}
          onChange={(e) => set("diagnosis", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
    </div>
  );
}

/* ============================== PS TAB ============================== */

function PSTab({ password }: { password: string }) {
  const [rows, setRows] = useState<ERow[]>([]);
  const [editing, setEditing] = useState<Partial<ERow> | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const r = await adminListEmergencyCases({ data: { password } });
    setRows((r as ERow[]) ?? []);
    setLoaded(true);
  }
  if (!loaded) refresh();

  async function save() {
    if (!editing) return;
    try {
      await adminUpsertEmergencyCase({
        data: {
          password,
          id: editing.id,
          date: editing.date || null,
          question: editing.question || "",
          options: editing.options || ["", "", "", "", ""],
          correct_answer: editing.correct_answer || "",
        },
      });
      toast.success("Salvo");
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir caso PS?")) return;
    await adminDeleteEmergencyCase({ data: { password, id } });
    refresh();
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() =>
            setEditing({
              date: null,
              question: "",
              options: ["", "", "", "", ""],
              correct_answer: "",
            })
          }
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          + Novo caso PS
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">
                🚑 {r.date || "qualquer dia"}
              </div>
              <div className="truncate font-semibold">{r.question}</div>
              <div className="text-xs text-muted-foreground">✓ {r.correct_answer}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(r)}
                className="rounded-lg border border-border px-3 py-1 text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => remove(r.id)}
                className="rounded-lg border border-border px-3 py-1 text-sm text-destructive"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? "Editar caso PS" : "Novo caso PS"} onClose={() => setEditing(null)} onSave={save}>
          <PSEditor value={editing} onChange={setEditing} />
        </Modal>
      )}
    </div>
  );
}

function PSEditor({
  value,
  onChange,
}: {
  value: Partial<ERow>;
  onChange: (v: Partial<ERow>) => void;
}) {
  function set<K extends keyof ERow>(k: K, v: any) {
    onChange({ ...value, [k]: v });
  }
  const opts = value.options || ["", "", "", "", ""];
  return (
    <div className="flex flex-col gap-3 text-sm">
      <Field label="Data (opcional)">
        <input
          type="date"
          value={value.date || ""}
          onChange={(e) => set("date", e.target.value || null)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
      <Field label="Pergunta (curta e objetiva)">
        <textarea
          rows={3}
          value={value.question || ""}
          onChange={(e) => set("question", e.target.value)}
          placeholder="Homem, 64a, dor torácica súbita, SatO2 88%, taquicardia."
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
      <div>
        <div className="mb-1 text-xs text-muted-foreground">5 condutas</div>
        {opts.map((o, i) => (
          <input
            key={i}
            placeholder={`Conduta ${i + 1}`}
            value={o}
            onChange={(e) => {
              const next = [...opts];
              next[i] = e.target.value;
              set("options", next);
            }}
            className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        ))}
      </div>
      <Field label="Conduta correta (texto exato)">
        <input
          value={value.correct_answer || ""}
          onChange={(e) => set("correct_answer", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
    </div>
  );
}

/* ============================== CODES TAB ============================== */

function CodesTab({ password }: { password: string }) {
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [custom, setCustom] = useState("");

  async function refresh() {
    const r = await adminListPremiumCodes({ data: { password } });
    setRows((r as CodeRow[]) ?? []);
    setLoaded(true);
  }
  if (!loaded) refresh();

  async function create() {
    try {
      const res = await adminCreatePremiumCode({ data: { password, code: custom || undefined } });
      toast.success(`Código criado: ${res.code}`);
      setCustom("");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function toggle(id: string, active: boolean) {
    await adminTogglePremiumCode({ data: { password, id, active } });
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir código?")) return;
    await adminDeletePremiumCode({ data: { password, id } });
    refresh();
  }

  async function reset(id: string) {
    if (!confirm("Resetar usos? Todos os dispositivos atualmente liberados perderão o acesso até reativarem o código.")) return;
    await adminResetPremiumCodeUses({ data: { password, id } });
    toast.success("Usos resetados");
    refresh();
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.toUpperCase())}
          placeholder="Código manual (opcional)"
          className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        />
        <button
          onClick={create}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Gerar
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((c) => {
          const used = Array.isArray(c.used_devices) ? c.used_devices.length : 0;
          const max = c.max_uses ?? 3;
          const exhausted = used >= max;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <div>
                <div className="font-mono text-base font-semibold">{c.code}</div>
                <div className="text-xs text-muted-foreground">
                  {c.active ? "ativo" : "inativo"} ·{" "}
                  <span className={exhausted ? "text-destructive font-semibold" : ""}>
                    {used}/{max} usos
                  </span>{" "}
                  · {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => toggle(c.id, !c.active)}
                  className="rounded-lg border border-border px-3 py-1 text-sm"
                >
                  {c.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => reset(c.id)}
                  className="rounded-lg border border-border px-3 py-1 text-sm"
                >
                  Resetar usos
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(c.code);
                    toast.success("Copiado");
                  }}
                  className="rounded-lg border border-border px-3 py-1 text-sm"
                >
                  Copiar
                </button>
                <button
                  onClick={() => remove(c.id)}
                  className="rounded-lg border border-border px-3 py-1 text-sm text-destructive"
                >
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== SHARED ============================== */

function Modal({
  title,
  children,
  onClose,
  onSave,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground">
            ✕
          </button>
        </div>
        {children}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onSave}
            className="flex-1 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"
          >
            Salvar
          </button>
          <button onClick={onClose} className="rounded-xl border border-border px-5">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ============================== IMAGE TAB ============================== */

function ImageTab({ password }: { password: string }) {
  const [rows, setRows] = useState<ImgRow[]>([]);
  const [editing, setEditing] = useState<Partial<ImgRow> | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const r = await adminListImageCases({ data: { password } });
    setRows((r as ImgRow[]) ?? []);
    setLoaded(true);
  }
  if (!loaded) refresh();

  async function save() {
    if (!editing) return;
    try {
      await adminUpsertImageCase({
        data: {
          password,
          id: editing.id,
          date: editing.date || null,
          image_url: editing.image_url || "",
          prompt: editing.prompt || "",
          options: editing.options || ["", "", ""],
          correct_answer: editing.correct_answer || "",
        },
      });
      toast.success("Salvo");
      setEditing(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir caso de imagem?")) return;
    await adminDeleteImageCase({ data: { password, id } });
    refresh();
  }

  return (
    <div>
      <div className="flex justify-end">
        <button
          onClick={() =>
            setEditing({
              date: null,
              image_url: "",
              prompt: "",
              options: ["", "", ""],
              correct_answer: "",
            })
          }
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          + Novo caso de imagem
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt=""
                  className="size-12 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="truncate font-semibold">{r.prompt}</div>
                <div className="text-xs text-muted-foreground">✓ {r.correct_answer}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(r)}
                className="rounded-lg border border-border px-3 py-1 text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => remove(r.id)}
                className="rounded-lg border border-border px-3 py-1 text-sm text-destructive"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal
          title={editing.id ? "Editar imagem" : "Nova imagem"}
          onClose={() => setEditing(null)}
          onSave={save}
        >
          <ImageEditor value={editing} onChange={setEditing} />
        </Modal>
      )}
    </div>
  );
}

function ImageEditor({
  value,
  onChange,
}: {
  value: Partial<ImgRow>;
  onChange: (v: Partial<ImgRow>) => void;
}) {
  function set<K extends keyof ImgRow>(k: K, v: any) {
    onChange({ ...value, [k]: v });
  }
  const opts = value.options || ["", "", ""];
  return (
    <div className="flex flex-col gap-3 text-sm">
      <Field label="URL da imagem">
        <input
          value={value.image_url || ""}
          onChange={(e) => set("image_url", e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
      {value.image_url && (
        <img
          src={value.image_url}
          alt="preview"
          className="max-h-48 w-full rounded-lg border border-border object-contain"
        />
      )}
      <Field label="Enunciado">
        <textarea
          rows={3}
          value={value.prompt || ""}
          onChange={(e) => set("prompt", e.target.value)}
          placeholder="Descreva o paciente e peça o laudo."
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
      <div>
        <div className="mb-1 text-xs text-muted-foreground">3 opções de laudo</div>
        {opts.map((o, i) => (
          <input
            key={i}
            placeholder={`Opção ${i + 1}`}
            value={o}
            onChange={(e) => {
              const next = [...opts];
              next[i] = e.target.value;
              set("options", next);
            }}
            className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        ))}
      </div>
      <Field label="Laudo correto (texto exato)">
        <input
          value={value.correct_answer || ""}
          onChange={(e) => set("correct_answer", e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2"
        />
      </Field>
    </div>
  );
}
