import type { Chain } from "./types";

export function usd(n: number, dp = 2): string {
  // Sums of float amounts land a hair either side of .xx5 depending on order;
  // snap to 1e-6 first so the same total never prints two different ways.
  n = Math.round(n * 1e6) / 1e6;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

export function compact(n: number): string {
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

export function pct(n: number, dp = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(dp)}%`;
}

export function shortAddr(a?: string): string {
  if (!a) return "unknown";
  if (!a.startsWith("0x") || a.length <= 13) return a; // agent names pass through
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export const isAgent = (payer: string) => !payer.startsWith("0x");

export function ago(t: number, now: number): string {
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function hostOf(upstream: string): string {
  try {
    return new URL(upstream).host;
  } catch {
    return upstream.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export function dayLabel(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** A stable gradient per seed, so avatars stay recognizable across rows. */
export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 120 + (h % 80)) % 360;
  return `linear-gradient(135deg, oklch(0.62 0.18 ${a}), oklch(0.5 0.2 ${b}))`;
}

export const CHAIN_LABEL: Record<Chain, string> = {
  hedera: "Hedera",
  base: "Base",
  solana: "Solana",
};

export const REASON_LABEL: Record<string, string> = {
  insufficient_funds: "Insufficient funds",
  invalid_signature: "Invalid signature",
  quote_expired: "Quote expired",
  bot_blocked: "Bot blocked",
};

/**
 * Categorical chart colors, one per API, in fixed order. Validated with the
 * dataviz palette checker against the dark card surface (#14161b): every
 * adjacent pair clears CVD ΔE 8 and normal-vision ΔE 15. Color follows the API,
 * never its rank, so filters never repaint a series.
 */
export const SERIES = ["#9085e9", "#d95926", "#3987e5", "#c98500"] as const;

export function laneColor(laneNames: string[], name: string): string {
  const i = laneNames.indexOf(name);
  return SERIES[(i < 0 ? 0 : i) % SERIES.length];
}
