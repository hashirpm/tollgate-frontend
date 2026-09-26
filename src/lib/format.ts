import { BASESCAN, USDC_DECIMALS } from "./config";

const SCALE = 10n ** BigInt(USDC_DECIMALS);

/** Atomic USDC units → a JS number of dollars (display only). */
export function atomicToUsd(atomic: bigint): number {
  const whole = atomic / SCALE;
  const frac = atomic % SCALE;
  return Number(whole) + Number(frac) / Number(SCALE);
}

/**
 * "0.015" → 15000n, exactly (no float math). Returns null for anything that
 * isn't a non-negative decimal with at most 6 fraction digits.
 */
export function usdToAtomic(input: string): bigint | null {
  const s = input.trim();
  if (!/^\d*(\.\d*)?$/.test(s) || s === "" || s === ".") return null;
  const [w = "0", f = ""] = s.split(".");
  if (f.length > USDC_DECIMALS) return null;
  return BigInt(w || "0") * SCALE + BigInt((f + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS) || "0");
}

/** 15000n → "0.015" (trailing zeros trimmed, at least 2 dp). */
export function atomicToInput(atomic: bigint): string {
  const whole = atomic / SCALE;
  const frac = (atomic % SCALE).toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return `${whole}.${frac.padEnd(2, "0")}`;
}

/** Every amount shows at least 4 decimals, and up to USDC's 6 so sub-cent prices never round away. */
export function usd(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  return `$${rounded.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: USDC_DECIMALS })}`;
}

export const usdc = (atomic: bigint) => usd(atomicToUsd(atomic));

export function compact(n: number): string {
  return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

export function shortAddr(a?: string | null): string {
  if (!a) return "—";
  if (!a.startsWith("0x") || a.length <= 13) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function ago(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function clock(t: number): string {
  return new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function dateTime(t: number): string {
  return new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export const basescanTx = (hash: string) => `${BASESCAN}/tx/${hash}`;
export const basescanAddress = (addr: string) => `${BASESCAN}/address/${addr}`;

/** A stable gradient per seed, so the same payer/endpoint is recognizable across rows. */
export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 120 + (h % 80)) % 360;
  return `linear-gradient(135deg, oklch(0.66 0.17 ${a}), oklch(0.52 0.2 ${b}))`;
}
