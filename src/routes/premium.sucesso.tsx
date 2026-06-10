import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkMPPayment } from "@/lib/payment.functions";
import { setPremiumUnlocked } from "@/lib/premium";

export const Route = createFileRoute("/premium/sucesso")({
  component: SuccessPage,
  head: () => ({
    meta: [{ title: "Pagamento confirmado — MedCase Daily" }],
  }),
});

type State =
  | { kind: "loading" }
  | { kind: "approved"; code: string }
  | { kind: "pending" }
  | { kind: "error"; message: string };

function SuccessPage() {
  console.log("SUCCESS PAGE CARREGOU");
  const check = useServerFn(checkMPPayment);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    console.log("USE EFFECT EXECUTOU");
    console.log("URL:", window.location.href);
    const params = new URLSearchParams(window.location.search);
    const paymentId =
      params.get("payment_id") ||
      params.get("collection_id") ||
      "";
    if (!paymentId) {
      setState({ kind: "error", message: "Pagamento não identificado." });
      return;
    }

    let cancelled = false;
    let attempts = 0;
    async function poll() {
      attempts++;
      try {
        const res = await check({ data: { paymentId } });
        if (cancelled) return;
        if (res.approved && res.code) {
          setPremiumUnlocked(true);
          setState({ kind: "approved", code: res.code });
          return;
        }
        if (attempts < 8) {
          setTimeout(poll, 2000);
        } else {
          setState({ kind: "pending" });
        }
      } catch (e: any) {
        if (!cancelled) setState({ kind: "error", message: e.message || "Erro" });
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [check]);

  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-5">
      <div className="w-full rounded-3xl border border-border bg-card p-8 text-center">
        {state.kind === "loading" && (
          <>
            <div className="text-4xl">⏳</div>
            <h1 className="mt-4 text-xl font-bold">Confirmando seu pagamento…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Aguarde alguns segundos.
            </p>
          </>
        )}

        {state.kind === "approved" && (
          <>
            <div className="text-5xl">🎉</div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              Acesso liberado!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Seu acesso premium foi ativado neste dispositivo. Guarde o código
              abaixo para usar em outros aparelhos:
            </p>
            <div className="mt-5 rounded-xl border border-border bg-background px-4 py-4 font-mono text-lg tracking-widest">
              {state.code}
            </div>
            <Link
              to="/"
              className="mt-6 inline-block w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground"
            >
              Começar a jogar
            </Link>
          </>
        )}

        {state.kind === "pending" && (
          <>
            <div className="text-4xl">🕒</div>
            <h1 className="mt-4 text-xl font-bold">Pagamento em processamento</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Assim que o Mercado Pago confirmar, seu código será gerado. Você
              pode recarregar esta página em alguns minutos.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 w-full rounded-xl border border-border py-3 font-medium"
            >
              Verificar novamente
            </button>
          </>
        )}

        {state.kind === "error" && (
          <>
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-4 text-xl font-bold">Não foi possível confirmar</h1>
            <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
            <Link
              to="/premium"
              className="mt-5 inline-block w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground"
            >
              Tentar novamente
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
