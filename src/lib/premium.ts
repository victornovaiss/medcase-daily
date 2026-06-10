import type { GameMode } from "@/lib/game";

const KEY = "medcase:premium";
const DEVICE_KEY = "medcase:deviceId";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        (crypto as any)?.randomUUID?.() ||
        `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_KEY, id as string);
    }
    return id as string;
  } catch {
    return "";
  }
}

export const PREMIUM_MODES: GameMode[] = ["pediatrics", "gyneco"];

export function isPremiumUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function setPremiumUnlocked(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(KEY, "true");
  else localStorage.removeItem(KEY);
}

export function isModeLocked(mode: GameMode | "emergency"): boolean {
  if (mode === "clinical") return false;
  return !isPremiumUnlocked();
}
