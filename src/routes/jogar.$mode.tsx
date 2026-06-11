import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getTodayCase } from "@/lib/cases.functions";
import {
  MODES,
  type GameMode,
  todayISO,
  shuffle,
  loadProgress,
  saveProgress,
  recordCompletion,
  dayNumber,
} from "@/lib/game";

export const Route = createFileRoute("/jogar/$mode")({
  validateSearch: (search: Record<string, unknown>) => ({
    date: typeof search.date === "string" ? (search.date as string) : undefined,
  }),
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ params, deps }) => {
    const mode = params.mode as GameMode;
    if (!["clinical", "pediatrics", "gyneco"].includes(mode)) throw notFound();
    const date = deps.date ?? todayISO();
    const row = await getTodayCase({ data: { mode, date } });
    return { mode, date, row, isPast: date !== todayISO() };
  },
  beforeLoad: ({ params, search }) => {
    if (typeof window === "undefined") return;
    const mode = params.mode as GameMode;
    const premiumModes: GameMode[] = ["pediatrics", "gyneco"];
    const isPast = !!search.date && search.date !== todayISO();
    if (premiumModes.includes(mode) || isPast) {
      try {
        if (localStorage.getItem("medcase:premium") !== "true") {
          throw redirect({ to: "/" });
        }
      } catch (e) {
        if (e && (e as any).isRedirect) throw e;
      }
    }
  },
  component: PlayPage,
  errorComponent: ({ error }) => (
    <Centered>
      <p className="text-sm text-destructive">{error.message}</p>
      <Link to="/" className="mt-4 text-sm underline">
        Voltar
      </Link>
    </Centered>
  ),
  notFoundComponent: () => (
    <Centered>
      <p>Modo inválido.</p>
      <Link to="/" className="mt-4 text-sm underline">
        Voltar
      </Link>
    </Centered>
  ),
});

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>{children}</div>
    </div>
  );
}

type Step = "case" | "examResult" | "treatment" | "done";

function PlayPage() {
  const data = Route.useLoaderData();
  const mode = data.mode as GameMode;
  const date = data.date;
  const row = data.row;
  const isPast = (data as any).isPast as boolean;
  const router = useRouter();
  const cfg = MODES[mode];

  const [progress, setProgressState] = useState(() => (isPast ? null : loadProgress(mode)));
  const [step, setStep] = useState<Step>(() => {
    if (isPast) return "case";
    const p = loadProgress(mode);
    if (!p) return "case";
    if (p.completed) return "done";
    if (p.treatment) return "done";
    if (p.exam) return "examResult";
    return "case";
  });

  // After exam viewed, user can advance to treatment
  const [examViewed, setExamViewed] = useState(() => (isPast ? false : !!loadProgress(mode)?.exam));

  if (!row) {
    return (
      <Centered>
        <p className="text-2xl">🌙</p>
        <h2 className="mt-3 text-lg font-semibold">Sem caso {isPast ? "neste dia" : "hoje"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPast ? "Não há caso publicado nesta data." : "Volte amanhã ou peça ao admin para agendar um caso."}
        </p>
        <Link to="/" className="mt-6 inline-block text-sm underline">
          Voltar
        </Link>
      </Centered>
    );
  }

  const examOptions = useMemo(
    () => shuffle(row.exam_options as string[], date + mode + "exam"),
    [row, date, mode],
  );
  const treatmentOptions = useMemo(
    () => shuffle(row.treatment_options as string[], date + mode + "tx"),
    [row, date, mode],
  );
  const examResults = row.exam_results as Record<string, string>;

  function pickExam(opt: string) {
    const p = { date, exam: opt };
    if (!isPast) saveProgress(mode, p);
    setProgressState(p);
    setStep("examResult");
    setExamViewed(true);
  }

  function pickTreatment(opt: string) {
    const examOk = progress?.exam === row.correct_exam;
    const txOk = opt === row.correct_treatment;
    const stars = (examOk ? 1 : 0) + (txOk ? 2 : 0);
    const final = {
      date,
      exam: progress?.exam,
      treatment: opt,
      stars,
      completed: true,
    };
    if (!isPast) {
      saveProgress(mode, final);
      recordCompletion(mode, stars);
    }
    setProgressState(final);
    setStep("done");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← início
          </Link>
          <div
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: `color-mix(in oklab, ${cfg.color} 18%, transparent)`,
              color: cfg.color,
            }}
          >
            {cfg.emoji} {cfg.label}
          </div>
        </div>

        {step === "case" && (
          <Section title={row.title}>
            <CaseText text={row.case_text} />
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Qual exame você solicita?
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              {examOptions.map((o) => (
                <OptionButton key={o} onClick={() => pickExam(o)}>
                  {o}
                </OptionButton>
              ))}
            </div>
          </Section>
        )}

        {step === "examResult" && progress?.exam && (
          <Section title="Resultado do exame">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                {progress.exam}
              </div>
              <p className="mt-2 text-base leading-relaxed">
                {examResults[progress.exam] ?? "Sem resultado."}
              </p>
            </div>
            <button
              className="mt-6 w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
              onClick={() => setStep("treatment")}
            >
              Definir conduta →
            </button>
          </Section>
        )}

        {step === "treatment" && (
          <Section title="Conduta terapêutica">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Qual conduta você adota?
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              {treatmentOptions.map((o) => (
                <OptionButton key={o} onClick={() => pickTreatment(o)}>
                  {o}
                </OptionButton>
              ))}
            </div>
          </Section>
        )}

        {step === "done" && progress && (
          <DoneScreen
            stars={progress.stars ?? 0}
            diagnosis={row.diagnosis}
            mode={mode}
            pickedExam={progress.exam ?? null}
            correctExam={row.correct_exam}
            pickedTreatment={progress.treatment ?? null}
            correctTreatment={row.correct_treatment}
            onReplay={() => router.invalidate()}
          />
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function CaseText({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-line rounded-2xl border border-border bg-card p-5 text-[15px] leading-relaxed">
      {text}
    </div>
  );
}

function OptionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-border bg-card px-4 py-4 text-left text-[15px] font-medium transition-all hover:border-primary hover:bg-secondary active:scale-[0.99]"
    >
      {children}
    </button>
  );
}

function DoneScreen({
  stars,
  diagnosis,
  mode,
  pickedExam,
  correctExam,
  pickedTreatment,
  correctTreatment,
  onReplay,
}: {
  stars: number;
  diagnosis: string;
  mode: GameMode;
  pickedExam: string | null;
  correctExam: string;
  pickedTreatment: string | null;
  correctTreatment: string;
  onReplay: () => void;
}) {
  const cfg = MODES[mode];
  const filled = "⭐".repeat(stars);
  const empty = "·".repeat(3 - stars);
  const examOk = pickedExam === correctExam;
  const txOk = pickedTreatment === correctTreatment;

  function share() {
    const text = `${"⭐".repeat(stars) || "·"} MedCase Daily #${dayNumber()} · ${cfg.label}`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any).share({ text }).catch(() => copy(text));
    } else {
      copy(text);
    }
  }
  function copy(t: string) {
    navigator.clipboard?.writeText(t);
    toast.success("Resultado copiado");
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center">
        <div className="text-5xl tracking-widest">
          <span className="text-star">{filled}</span>
          <span className="text-muted-foreground">{empty}</span>
        </div>
        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Diagnóstico</p>
        <h2 className="mt-1 text-2xl font-bold">{diagnosis}</h2>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Gabarito
        </h3>
        <div className="flex flex-col gap-2">
          <GabaritoRow
            label="Exame"
            picked={pickedExam}
            correct={correctExam}
            ok={examOk}
          />
          <GabaritoRow
            label="Conduta"
            picked={pickedTreatment}
            correct={correctTreatment}
            ok={txOk}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <button
          onClick={share}
          className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground"
        >
          Compartilhar
        </button>
        <Link
          to="/"
          className="rounded-xl border border-border bg-card py-3.5 text-center text-sm font-medium text-muted-foreground"
        >
          Voltar ao início
        </Link>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">Próximo caso à meia-noite.</p>
    </div>
  );
}

function GabaritoRow({
  label,
  picked,
  correct,
  ok,
}: {
  label: string;
  picked: string | null;
  correct: string;
  ok: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"
      }`}
    >
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs">
        <span className="text-muted-foreground">Sua resposta: </span>
        <span className={ok ? "text-emerald-500" : "text-destructive"}>{picked ?? "—"}</span>
      </p>
      {!ok && (
        <p className="text-xs">
          <span className="text-muted-foreground">Correta: </span>
          <span className="text-emerald-500">{correct}</span>
        </p>
      )}
    </div>
  );
}
