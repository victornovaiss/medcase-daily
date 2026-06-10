import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/como-jogar")({
  head: () => ({ meta: [{ title: "Como jogar — MedCase Daily" }] }),
  component: HowTo,
});

function HowTo() {
  const steps = [
    { n: "1", t: "Leia o caso", d: "Idade, queixa, sinais vitais e exame físico." },
    { n: "2", t: "Escolha um exame", d: "Apenas uma opção. Não dá pra mudar." },
    { n: "3", t: "Veja o resultado", d: "Achado importante ou inespecífico." },
    { n: "4", t: "Defina a conduta", d: "Apenas uma. Pesa 2 estrelas." },
  ];
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-8">
        <Link to="/" className="text-sm text-muted-foreground">
          ← início
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Como jogar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Um caso por dia, em cada modo. Menos de 2 minutos por partida.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {s.n}
              </div>
              <div>
                <div className="font-semibold">{s.t}</div>
                <div className="text-sm text-muted-foreground">{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Pontuação</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <span className="text-star">⭐</span> exame correto
            </li>
            <li>
              <span className="text-star">⭐⭐</span> conduta correta
            </li>
            <li>
              <span className="text-star">⭐⭐⭐</span> acertou tudo
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
