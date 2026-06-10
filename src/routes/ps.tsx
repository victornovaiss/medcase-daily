import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getEmergencySession } from "@/lib/emergency.functions";
import { dayNumber, shuffle, todayISO } from "@/lib/game";
import { isPremiumUnlocked } from "@/lib/premium";

const SESSION_LENGTH = 10;
const TIME_PER_CASE = 30;

type Case = {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
};

export const Route = createFileRoute("/ps")({
  head: () => ({ meta: [{ title: "Pronto Socorro — MedCase Daily" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isPremiumUnlocked()) {
      throw redirect({ to: "/" });
    }
  },
  loader: async () => {
    const rows = (await getEmergencySession()) as Case[];
    return { rows };
  },
  component: PSPage,
});

function PSPage() {
  const { rows } = Route.useLoaderData() as { rows: Case[] };

  const session = useMemo<Case[]>(() => {
    const shuffled = shuffle(rows, todayISO() + "ps");
    return shuffled.slice(0, SESSION_LENGTH);
  }, [rows]);

  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [time, setTime] = useState(TIME_PER_CASE);
  const [feedback, setFeedback] = useState<null | "ok" | "bad">(null);
  const [done, setDone] = useState(false);

  const current = session[idx];

  useEffect(() => {
    if (done || !current || feedback) return;
    setTime(TIME_PER_CASE);
    const start = Date.now();
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = TIME_PER_CASE - elapsed;
      if (left <= 0) {
        clearInterval(t);
        handleAnswer(null);
      } else {
        setTime(left);
      }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  const options = useMemo(
    () => (current ? shuffle(current.options, current.id) : []),
    [current],
  );

  function handleAnswer(opt: string | null) {
    if (!current || feedback) return;
    const ok = opt === current.correct_answer;
    if (ok) setCorrect((c) => c + 1);
    setFeedback(ok ? "ok" : "bad");
    setTimeout(() => {
      setFeedback(null);
      if (idx + 1 >= session.length) {
        setDone(true);
        try {
          localStorage.setItem(
            "medcase:ps:lastScore",
            JSON.stringify({ date: todayISO(), score: ok ? correct + 1 : correct, total: session.length }),
          );
        } catch {}
      } else {
        setIdx((i) => i + 1);
      }
    }, 450);
  }

  if (!rows.length) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-2xl">🚑</p>
          <h2 className="mt-3 text-lg font-semibold">Sem casos disponíveis</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Peça ao admin para cadastrar casos no Pronto Socorro.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm underline">
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((correct / session.length) * 100);
    const share = () => {
      const text = `🚑 PS: ${correct}/${session.length} · MedCase Daily #${dayNumber()}`;
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        (navigator as any).share({ text }).catch(() => {
          navigator.clipboard?.writeText(text);
          toast.success("Resultado copiado");
        });
      } else {
        navigator.clipboard?.writeText(text);
        toast.success("Resultado copiado");
      }
    };
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
          <p className="text-5xl">🚑</p>
          <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
            Plantão finalizado
          </p>
          <h2 className="mt-1 text-5xl font-bold tracking-tight">
            {correct}<span className="text-muted-foreground">/{session.length}</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{pct}% de acerto</p>

          <div className="mt-10 flex flex-col gap-2">
            <button
              onClick={share}
              className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground"
            >
              Compartilhar
            </button>
            <Link
              to="/"
              className="rounded-xl border border-border bg-card py-3.5 text-sm font-medium text-muted-foreground"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const urgent = time <= 10;
  const pct = (time / TIME_PER_CASE) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-5">
        <div className="flex items-center justify-between text-xs">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← sair
          </Link>
          <div className="font-mono text-muted-foreground">
            {idx + 1}/{session.length} · ✅ {correct}
          </div>
        </div>

        {/* Timer */}
        <div className="mt-4">
          <div className="flex items-end justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              🚑 Pronto Socorro
            </span>
            <span
              className={`font-mono text-3xl font-bold tabular-nums transition-colors ${
                urgent ? "text-destructive animate-pulse" : "text-foreground"
              }`}
            >
              {time}s
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-200 ${
                urgent ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Case */}
        <div
          key={current?.id}
          className={`mt-6 rounded-2xl border p-5 text-[15px] leading-relaxed transition-colors ${
            feedback === "ok"
              ? "border-emerald-500/50 bg-emerald-500/10"
              : feedback === "bad"
                ? "border-destructive/50 bg-destructive/10"
                : "border-border bg-card"
          } animate-in fade-in slide-in-from-bottom-2 duration-200`}
        >
          {current?.question}
        </div>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Conduta imediata
        </h3>
        <div className="mt-2 flex flex-col gap-2">
          {options.map((o) => (
            <button
              key={o}
              disabled={!!feedback}
              onClick={() => handleAnswer(o)}
              className="rounded-xl border border-border bg-card px-4 py-3.5 text-left text-[15px] font-medium transition-all hover:border-primary hover:bg-secondary active:scale-[0.99] disabled:opacity-60"
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
