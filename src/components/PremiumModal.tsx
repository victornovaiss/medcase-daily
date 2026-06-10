import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { validatePremiumCode } from "@/lib/premium.functions";
import { setPremiumUnlocked, getDeviceId } from "@/lib/premium";

export function PremiumModal({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await validatePremiumCode({ data: { code, deviceId: getDeviceId() } });
      if (res.ok) {
        setPremiumUnlocked(true);
        toast.success("Acesso premium desbloqueado");
        onUnlocked?.();
        onClose();
      } else {
        toast.error(res.error || "Código inválido");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao validar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl border border-border bg-card p-6 animate-in slide-in-from-bottom-4 duration-300 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-3xl">🔓</div>
        <h2 className="mt-3 text-xl font-bold tracking-tight">
          Desbloqueie os modos premium do MedCase Daily
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">·</span> Pediatria, GO e Pronto Socorro
          </li>
          <li className="flex gap-2">
            <span className="text-primary">·</span> Acesso vitalício, sem mensalidade
          </li>
          <li className="flex gap-2">
            <span className="text-primary">·</span> Novos casos todos os dias
          </li>
        </ul>

        <Link
          to="/premium"
          onClick={onClose}
          className="mt-5 block w-full rounded-xl bg-primary py-3.5 text-center font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          Comprar por R$ 19,90
        </Link>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>ou use um código</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="MED-XXXXX"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-mono tracking-widest outline-none focus:border-primary"
        />

        <button
          disabled={loading}
          onClick={submit}
          className="mt-3 w-full rounded-xl border border-border py-3 font-medium transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Validando…" : "Desbloquear com código"}
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl py-2 text-sm text-muted-foreground"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
