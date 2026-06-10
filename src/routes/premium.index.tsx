import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createMPPreference } from "@/lib/payment.functions";

export const Route = createFileRoute("/premium/")({
  component: PremiumPage,
  head: () => ({
    meta: [
      { title: "Acesso Premium — MedCase Daily" },
      {
        name: "description",
        content:
          "Desbloqueie Pediatria, GO e Pronto Socorro no MedCase Daily. Acesso vitalício por R$ 19,90.",
      },
    ],
  }),
});

function PremiumPage() {
  const createPref = useServerFn(createMPPreference);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const failed = new URLSearchParams(search).get("status") === "failure";

  async function buy() {
    setLoading(true);
    setHint(null);
    try {
      const res = await createPref({ data: { payerEmail: email || undefined } });
      window.location.href = res.initPoint;
    } catch (e: any) {
      const message = e.message || "Erro ao iniciar pagamento";
      toast.error(message);
      setHint(message);
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-8">
      <Link
        to="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Voltar
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">Acesso Premium</h1>
      <p className="mt-2 text-muted-foreground">
        Tudo do MedCase Daily, para sempre. Pagamento único.
      </p>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight">R$ 19,90</span>
          <span className="text-sm text-muted-foreground">· pagamento único</span>
        </div>

        <ul className="mt-5 space-y-2.5 text-sm">
          <li className="flex gap-2">
            <span className="text-primary">✓</span> Pediatria, GO e Pronto Socorro
          </li>
          <li className="flex gap-2">
            <span className="text-primary">✓</span> Acesso vitalício, sem mensalidade
          </li>
          <li className="flex gap-2">
            <span className="text-primary">✓</span> Novos casos todos os dias
          </li>
          <li className="flex gap-2">
            <span className="text-primary">✓</span> Pix, cartão ou boleto
          </li>
        </ul>

        <label className="mt-6 block text-xs font-medium text-muted-foreground">
          E-mail (opcional, para recibo)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
        />

        <button
          onClick={buy}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Redirecionando…" : "Pagar com Mercado Pago"}
        </button>

        {failed && (
          <p className="mt-3 text-center text-sm text-destructive">
            O pagamento não foi concluído. Tente novamente.
          </p>
        )}

        {hint && (
          <div className="mt-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {hint}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Pagamento processado pelo Mercado Pago. Após a confirmação, seu acesso é
          liberado automaticamente.
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Já tem um código?{" "}
        <Link to="/" className="text-primary hover:underline">
          Voltar para a home
        </Link>
      </p>
    </main>
  );
}
