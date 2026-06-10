export type GameMode = "clinical" | "pediatrics" | "gyneco";

export const MODES: Record<GameMode, { label: string; emoji: string; color: string }> = {
  clinical: { label: "Clínica Médica", emoji: "🩺", color: "var(--color-clinical)" },
  pediatrics: { label: "Pediatria", emoji: "🧸", color: "var(--color-pediatrics)" },
  gyneco: { label: "Ginecologia e Obstetrícia", emoji: "🌸", color: "var(--color-gyneco)" },
};

export const EMERGENCY_MODE = {
  label: "Pronto Socorro",
  emoji: "🚑",
  color: "var(--destructive)",
};

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shuffle<T>(arr: T[], seed: string): T[] {
  // deterministic shuffle so options don't change on re-render
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = (h ^ seed.charCodeAt(i)) * 16777619;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 48271) % 2147483647;
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type DailyProgress = {
  date: string;
  exam?: string;
  treatment?: string;
  stars?: number;
  completed?: boolean;
};

export type ModeStats = {
  daysPlayed: number;
  currentStreak: number;
  bestStreak: number;
  totalStars: number;
  lastPlayedDate?: string;
};

const PROG_KEY = (mode: GameMode) => `medcase:progress:${mode}`;
const STATS_KEY = (mode: GameMode) => `medcase:stats:${mode}`;

export function loadProgress(mode: GameMode): DailyProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROG_KEY(mode));
    if (!raw) return null;
    const p = JSON.parse(raw) as DailyProgress;
    if (p.date !== todayISO()) return null;
    return p;
  } catch {
    return null;
  }
}

export function saveProgress(mode: GameMode, p: DailyProgress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROG_KEY(mode), JSON.stringify(p));
}

export function loadStats(mode: GameMode): ModeStats {
  if (typeof window === "undefined")
    return { daysPlayed: 0, currentStreak: 0, bestStreak: 0, totalStars: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY(mode));
    if (!raw) return { daysPlayed: 0, currentStreak: 0, bestStreak: 0, totalStars: 0 };
    return JSON.parse(raw);
  } catch {
    return { daysPlayed: 0, currentStreak: 0, bestStreak: 0, totalStars: 0 };
  }
}

export function recordCompletion(mode: GameMode, stars: number) {
  const stats = loadStats(mode);
  const today = todayISO();
  if (stats.lastPlayedDate === today) return stats;

  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const currentStreak = stats.lastPlayedDate === yesterday ? stats.currentStreak + 1 : 1;
  const next: ModeStats = {
    daysPlayed: stats.daysPlayed + 1,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    totalStars: stats.totalStars + stars,
    lastPlayedDate: today,
  };
  localStorage.setItem(STATS_KEY(mode), JSON.stringify(next));
  return next;
}

export function dayNumber() {
  // Day index since launch — used in share text
  const launch = new Date("2026-01-01T00:00:00Z").getTime();
  const today = new Date(todayISO() + "T00:00:00Z").getTime();
  return Math.floor((today - launch) / 86400000) + 1;
}
