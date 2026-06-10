import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MODES, type GameMode, loadStats, type ModeStats } from "@/lib/game";

export const Route = createFileRoute("/estatisticas")({
  head: () => ({ meta: [{ title: "Estatísticas — MedCase Daily" }] }),
  component: Stats,
});

function Stats() {
  const modes: GameMode[] = ["clinical", "pediatrics", "gyneco"];
  const [data, setData] = useState<Record<GameMode, ModeStats> | null>(null);

  useEffect(() => {
    const obj = {} as Record<GameMode, ModeStats>;
    modes.forEach((m) => (obj[m] = loadStats(m)));
    setData(obj);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-8">
        <Link to="/" className="text-sm text-muted-foreground">
          ← início
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Estatísticas</h1>
        <p className="mt-2 text-sm text-muted-foreground">Salvas apenas no seu dispositivo.</p>

        <div className="mt-6 flex flex-col gap-3">
          {modes.map((m) => {
            const s = data?.[m];
            const avg = s && s.daysPlayed > 0 ? (s.totalStars / s.daysPlayed).toFixed(1) : "—";
            return (
              <div key={m} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-10 place-items-center rounded-lg text-xl"
                    style={{
                      background: `color-mix(in oklab, ${MODES[m].color} 18%, transparent)`,
                    }}
                  >
                    {MODES[m].emoji}
                  </span>
                  <div className="font-semibold">{MODES[m].label}</div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <Stat label="Dias" value={s?.daysPlayed ?? 0} />
                  <Stat label="Sequência" value={s?.currentStreak ?? 0} />
                  <Stat label="Melhor" value={s?.bestStreak ?? 0} />
                  <Stat label="Média" value={avg} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-secondary py-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
