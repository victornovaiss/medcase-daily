import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getImageSession } from "@/lib/image-cases.functions";
import { dayNumber, shuffle, todayISO } from "@/lib/game";
import { isPremiumUnlocked } from "@/lib/premium";

const SESSION_LENGTH = 5;

type ImageCase = {
  id: string;
  image_url: string;
  prompt: string;
  options: string[];
  correct_answer: string;
};

export const Route = createFileRoute("/imagem")({
  head: () => ({ meta: [{ title: "Desafio da Imagem — MedCase Daily" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !isPremiumUnlocked()) {
      throw redirect({ to: "/" });
    }
  },
  loader: async () => {
    const rows = (await getImageSession()) as ImageCase[];
    return { rows };
  },
  component: ImagePage,
});

function ImagePage() {
  const { rows } = Route.useLoaderData() as { rows: ImageCase[] };

  const session = useMemo<ImageCase[]>(() => {
    const shuffled = shuffle(rows, todayISO() + "img");
    return shuffled.slice(0, SESSION_LENGTH);
  }, [rows]);

  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const current = session[idx];
  const options = useMemo(
    () => (current ? shuffle(current.options, current.id) : []),
    [current],
  );

  function handlePick(opt: string) {
    if (picked || !current) return;
    setPicked(opt);
    const ok = opt === current.correct_answer;
    if (ok) setCorrect((c) => c + 1);
    setTimeout(() => {
      setPicked(null);
      if (idx + 1 >= session.length) setDone(true);
      else setIdx((i) => i + 1);
    }, 1100);
  }

  if (!rows.length) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <p className="text-2xl">🖼️</p>
          <h2 className="mt-3 text-lg font-semibold">Sem imagens disponíveis</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Peça ao admin para cadastrar desafios de imagem.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm underline">
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    const share = () => {
      const text = `🖼️ Desafio da Imagem: ${correct}/${session.length} · MedCase Daily #${dayNumber()}`;
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
    const pct = Math.round((correct / session.length) * 100);
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
          <p className="text-5xl">🖼️</p>
          <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
            Desafio finalizado
          </p>
          <h2 className="mt-1 text-5xl font-bold tracking-tight">
            {correct}
            <span className="text-muted-foreground">/{session.length}</span>
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

        <div className="mt-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            🖼️ Desafio da Imagem
          </span>
        </div>

        <div
          key={current?.id}
          className="mt-4 overflow-hidden rounded-2xl border border-border bg-card animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="aspect-square w-full bg-black">
            <img
              src={current?.image_url}
              alt="Imagem do caso"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="p-4 text-[15px] leading-relaxed">{current?.prompt}</div>
        </div>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Qual o laudo?
        </h3>
        <div className="mt-2 flex flex-col gap-2">
          {options.map((o) => {
            const isPicked = picked === o;
            const isCorrect = picked && o === current?.correct_answer;
            const cls = picked
              ? isCorrect
                ? "border-emerald-500/60 bg-emerald-500/10"
                : isPicked
                  ? "border-destructive/60 bg-destructive/10"
                  : "border-border bg-card opacity-60"
              : "border-border bg-card hover:border-primary hover:bg-secondary";
            return (
              <button
                key={o}
                disabled={!!picked}
                onClick={() => handlePick(o)}
                className={`rounded-xl border px-4 py-3.5 text-left text-[15px] font-medium transition-all active:scale-[0.99] ${cls}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
