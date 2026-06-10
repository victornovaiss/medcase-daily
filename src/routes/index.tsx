import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MODES, type GameMode, EMERGENCY_MODE } from "@/lib/game";
import { isPremiumUnlocked, PREMIUM_MODES } from "@/lib/premium";
import { PremiumModal } from "@/components/PremiumModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedCase Daily — Caso clínico do dia" },
      {
        name: "description",
        content:
          "Um caso clínico novo por dia. Raciocínio, exames e conduta em menos de 2 minutos.",
      },
      { property: "og:title", content: "MedCase Daily" },
      { property: "og:description", content: "Um caso clínico novo por dia." },
    ],
  }),
  component: Home,
});

function Home() {
  const modes: GameMode[] = ["clinical", "pediatrics", "gyneco"];
  const navigate = useNavigate();
  const [premium, setPremium] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setPremium(isPremiumUnlocked());
  }, []);

  function handleModeClick(e: React.MouseEvent, m: GameMode) {
    if (PREMIUM_MODES.includes(m) && !premium) {
      e.preventDefault();
      setModalOpen(true);
    }
  }

  function handlePSClick(e: React.MouseEvent) {
    if (!premium) {
      e.preventDefault();
      setModalOpen(true);
    } else {
      e.preventDefault();
      navigate({ to: "/ps" });
    }
  }

  function handleImageClick(e: React.MouseEvent) {
    if (!premium) {
      e.preventDefault();
      setModalOpen(true);
    } else {
      e.preventDefault();
      navigate({ to: "/imagem" });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" /> diário
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            MedCase<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Um caso clínico novo todos os dias.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          {modes.map((m) => {
            const locked = PREMIUM_MODES.includes(m) && !premium;
            return (
              <Link
                key={m}
                to="/jogar/$mode"
                params={{ mode: m }}
                onClick={(e) => handleModeClick(e, m)}
                className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/60 active:translate-y-0"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="grid size-12 place-items-center rounded-xl text-2xl"
                    style={{ background: `color-mix(in oklab, ${MODES[m].color} 18%, transparent)` }}
                  >
                    {MODES[m].emoji}
                  </span>
                  <div>
                    <div className="text-base font-semibold">{MODES[m].label}</div>
                    <div className="text-xs text-muted-foreground">
                      {locked ? "Premium" : "Caso do dia"}
                    </div>
                  </div>
                </div>
                <span className="text-muted-foreground transition-transform group-hover:translate-x-1">
                  {locked ? "🔒" : "→"}
                </span>
              </Link>
            );
          })}

          {/* Pronto Socorro */}
          <a
            href="/ps"
            onClick={handlePSClick}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-destructive/60 active:translate-y-0"
          >
            <div className="flex items-center gap-4">
              <span
                className="grid size-12 place-items-center rounded-xl text-2xl"
                style={{ background: `color-mix(in oklab, ${EMERGENCY_MODE.color} 18%, transparent)` }}
              >
                {EMERGENCY_MODE.emoji}
              </span>
              <div>
                <div className="text-base font-semibold">{EMERGENCY_MODE.label}</div>
                <div className="text-xs text-muted-foreground">
                  {premium ? "10 casos · 30s cada" : "Premium · arcade clínico"}
                </div>
              </div>
            </div>
            <span className="text-muted-foreground transition-transform group-hover:translate-x-1">
              {premium ? "→" : "🔒"}
            </span>
          </a>

          {/* Desafio da Imagem */}
          <a
            href="/imagem"
            onClick={handleImageClick}
            className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/60 active:translate-y-0"
          >
            <div className="flex items-center gap-4">
              <span
                className="grid size-12 place-items-center rounded-xl text-2xl"
                style={{ background: "color-mix(in oklab, var(--primary) 18%, transparent)" }}
              >
                🖼️
              </span>
              <div>
                <div className="text-base font-semibold">Desafio da Imagem</div>
                <div className="text-xs text-muted-foreground">
                  {premium ? "5 imagens · 3 opções de laudo" : "Premium · radiologia & laudos"}
                </div>
              </div>
            </div>
            <span className="text-muted-foreground transition-transform group-hover:translate-x-1">
              {premium ? "→" : "🔒"}
            </span>
          </a>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link
            to="/como-jogar"
            className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Como jogar
          </Link>
          <Link
            to="/estatisticas"
            className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Estatísticas
          </Link>
        </div>

        {premium ? (
          <Link
            to="/arquivo"
            className="mt-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            📚 Arquivo · casos anteriores
          </Link>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            🔓 Tenho um código premium
          </button>
        )}

        <footer className="mt-auto pt-10 text-center text-xs text-muted-foreground">
          Reseta à meia-noite ·{" "}
          <Link to="/admin" className="underline-offset-4 hover:underline">
            admin
          </Link>
        </footer>
      </div>

      <PremiumModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUnlocked={() => setPremium(true)}
      />
    </div>
  );
}
