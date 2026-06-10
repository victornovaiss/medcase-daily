import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { listPastCases } from "@/lib/cases.functions";
import { MODES, type GameMode, todayISO } from "@/lib/game";

export const Route = createFileRoute("/arquivo")({
  head: () => ({
    meta: [
      { title: "Arquivo de casos — MedCase Daily" },
      { name: "description", content: "Acesse casos clínicos dos dias anteriores (premium)." },
    ],
  }),
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem("medcase:premium") !== "true") {
        throw redirect({ to: "/" });
      }
    } catch (e) {
      if (e && (e as any).isRedirect) throw e;
    }
  },
  loader: async () => {
    const rows = await listPastCases({ data: { today: todayISO() } });
    return { rows: rows ?? [] };
  },
  component: ArquivoPage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <p className="text-sm text-destructive">{error.message}</p>
        <Link to="/" className="mt-4 inline-block text-sm underline">Voltar</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background text-center">
      <Link to="/" className="text-sm underline">Voltar</Link>
    </div>
  ),
});

const FILTERS: { key: GameMode | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "clinical", label: "Clínica" },
  { key: "pediatrics", label: "Pediatria" },
  { key: "gyneco", label: "G.O." },
];

function ArquivoPage() {
  const { rows } = Route.useLoaderData();
  const [filter, setFilter] = useState<GameMode | "all">("all");

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r: any) => r.mode === filter)),
    [rows, filter],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← início
          </Link>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Premium
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Arquivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Casos dos dias anteriores. Resolva sem alterar suas estatísticas.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Nenhum caso anterior disponível.
            </p>
          )}
          {filtered.map((r: any) => {
            const cfg = MODES[r.mode as GameMode];
            if (!cfg) return null;
            return (
              <Link
                key={`${r.date}-${r.mode}`}
                to="/jogar/$mode"
                params={{ mode: r.mode }}
                search={{ date: r.date }}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-lg text-lg"
                    style={{ background: `color-mix(in oklab, ${cfg.color} 18%, transparent)` }}
                  >
                    {cfg.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.date)} · {cfg.label}
                    </div>
                  </div>
                </div>
                <span className="ml-2 text-muted-foreground transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return iso;
  }
}
