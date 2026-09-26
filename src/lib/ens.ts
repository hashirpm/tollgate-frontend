// Listing names live on ENSv2 on Sepolia (see the gateway's ENS setup). Each
// name's Base Sepolia address record is the seller's payout address, so it is
// an on-chain check on who a payment goes to, independent of the gateway.

import { createPublicClient, http } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { normalize, toCoinType } from "viem/ens";

const client = createPublicClient({ chain: sepolia, transport: http("https://ethereum-sepolia-rpc.publicnode.com") });

/** The Base Sepolia address a name resolves to, lowercased; null if it doesn't resolve (yet). */
export async function ensPayTo(name: string): Promise<string | null> {
  try {
    const addr = await client.getEnsAddress({ name: normalize(name), coinType: toCoinType(baseSepolia.id) });
    return addr?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export const ensAppUrl = (name: string) => `https://sepolia.app.ens.domains/${name}`;

/**
 * The label the gateway derives from a listing name ("Weather API" → "weather-api").
 * Mirrors the gateway's slug(); if the label is taken it appends part of the id.
 */
export function ensLabel(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

const RESERVED = new Set([
  "admin", "agent", "agents", "api", "app", "catalog", "dashboard", "demo", "docs", "ens", "eth", "gateway", "help", "mail",
  "null", "pay", "root", "status", "support", "system", "test", "tollgate", "undefined", "www", "x402",
]);

/** The gateway's rule for a handle or listing label; null when fine, else why not. */
export function labelError(raw: string, what = "Name"): string | null {
  const v = raw.trim().toLowerCase();
  if (v.length < 3 || v.length > 32) return `${what} must be 3 to 32 characters.`;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(v) || v.includes("--")) return "Use a-z, 0-9 and single hyphens, not at the start or end.";
  if (RESERVED.has(v)) return `"${v}" is reserved.`;
  return null;
}
