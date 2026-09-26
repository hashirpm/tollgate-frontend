// Hardcoded demo data. Everything is generated from a fixed seed and a fixed
// clock, so server and client render identical output (no hydration drift) and
// the numbers stay stable between reloads. Replace via src/lib/data.ts.

import type { Account, Country, Lane, Payment, Policy, Tier } from "./types";

/** The dashboard's "now". Fixed so relative times ("3m ago") are deterministic. */
export const NOW = Date.UTC(2026, 8, 26, 14, 32, 0);
export const DAY = 86_400_000;

export const WALLET = "0x2403506eddcd48207ee982d7a8f86901365192ed";

export const ACCOUNT: Account = {
  addr: WALLET,
  accountId: "0.0.6841207",
  balance: 1284.5521,
  network: "Hedera Testnet",
  facilitator: "api.testnet.blocky402.com",
};

export const LANES: Lane[] = [
  {
    name: "uniswap-data",
    upstream: "https://gateway.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
    price: 0.02,
    payTo: WALLET,
    chain: "base",
    port: 4098,
    sample: "/pools",
    sampleMethod: "POST",
    status: "live",
    createdAt: NOW - 29 * DAY,
  },
  {
    name: "etherscan",
    upstream: "https://api.etherscan.io/v2/api",
    price: 0.01,
    payTo: WALLET,
    chain: "hedera",
    port: 4095,
    sample: "/?chainid=1&module=stats&action=ethprice",
    sampleMethod: "GET",
    status: "live",
    createdAt: NOW - 29 * DAY,
  },
  {
    name: "tally",
    upstream: "https://api.tally.xyz/query",
    price: 0.01,
    payTo: WALLET,
    chain: "hedera",
    port: 4097,
    sample: "/",
    sampleMethod: "POST",
    status: "live",
    createdAt: NOW - 24 * DAY,
  },
  {
    name: "alphavantage",
    upstream: "https://www.alphavantage.co/query",
    price: 0.015,
    payTo: WALLET,
    chain: "solana",
    port: 4094,
    sample: "/?function=GLOBAL_QUOTE&symbol=IBM",
    sampleMethod: "GET",
    status: "live",
    createdAt: NOW - 17 * DAY,
  },
];

export const POLICIES: Record<string, Policy> = {
  "uniswap-data": { humanVerifiedOnly: true, botMultiplier: 10, blockBots: false, dynamicPricing: true, priceFloor: 0.02, priceCeiling: 0.1 },
  etherscan: { humanVerifiedOnly: true, botMultiplier: 5 },
  tally: { streaming: true },
  alphavantage: {},
};

const ENDPOINTS: Record<string, { path: string; w: number }[]> = {
  "uniswap-data": [
    { path: "/pools", w: 6 },
    { path: "/swaps", w: 3 },
    { path: "/tokens", w: 2 },
    { path: "/positions", w: 1 },
  ],
  etherscan: [
    { path: "/stats/ethprice", w: 5 },
    { path: "/account/balance", w: 4 },
    { path: "/gastracker/oracle", w: 3 },
    { path: "/tx/receipt", w: 1 },
  ],
  tally: [
    { path: "/proposals", w: 5 },
    { path: "/governors", w: 3 },
    { path: "/delegates", w: 2 },
    { path: "/chains", w: 1 },
  ],
  alphavantage: [
    { path: "/global-quote", w: 6 },
    { path: "/time-series/daily", w: 3 },
    { path: "/fx/rate", w: 2 },
  ],
};

// How busy each lane is relative to the others.
const LANE_WEIGHT: Record<string, number> = { "uniswap-data": 5, etherscan: 6, tally: 3, alphavantage: 2 };

const PAYERS: { id: string; w: number }[] = [
  { id: "claude-research-agent", w: 9 },
  { id: "0x9f3c2a71e4b0d8c6a15f7e2b3d4c5a6b7e8f9012", w: 7 },
  { id: "gpt-defi-scout", w: 6 },
  { id: "0x71c7656ec7ab88b098defb751b7401b5f6d8976f", w: 5 },
  { id: "arb-bot-17", w: 5 },
  { id: "0xab5801a7d398351b8be11c439e05c5b3259aec9b", w: 4 },
  { id: "portfolio-copilot", w: 4 },
  { id: "0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67", w: 3 },
  { id: "dao-digest.eth", w: 3 },
  { id: "0x1db3439a222c519ab44bb1144fc28167b4fa6ee6", w: 2 },
  { id: "mev-watcher", w: 2 },
  { id: "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae", w: 1 },
];

// Tier is a property of the payer, not the request: agents that verified a
// human behind them with World ID stay "human".
const PAYER_TIER: Record<string, Tier> = {
  "claude-research-agent": "human",
  "0x9f3c2a71e4b0d8c6a15f7e2b3d4c5a6b7e8f9012": "human",
  "gpt-defi-scout": "bot",
  "0x71c7656ec7ab88b098defb751b7401b5f6d8976f": "anon",
  "arb-bot-17": "bot",
  "0xab5801a7d398351b8be11c439e05c5b3259aec9b": "human",
  "portfolio-copilot": "human",
  "0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67": "anon",
  "dao-digest.eth": "human",
  "0x1db3439a222c519ab44bb1144fc28167b4fa6ee6": "anon",
  "mev-watcher": "bot",
  "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae": "anon",
};

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
];

const FAIL_REASONS = ["insufficient_funds", "invalid_signature", "quote_expired", "bot_blocked"];

// ---- deterministic generation ----

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T extends { w: number }>(items: T[], r: number): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let x = r * total;
  for (const i of items) {
    if ((x -= i.w) < 0) return i;
  }
  return items[items.length - 1];
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Same deterministic payer → country mapping the hub uses ("demo geo"). */
export function countryFor(payer: string): Country {
  const weighted = [0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 7];
  return COUNTRIES[weighted[hash(payer) % weighted.length]];
}

// Traffic leans toward the European/US afternoon, like a real API.
const HOUR_WEIGHT = [2, 1, 1, 1, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 13, 12, 10, 8, 6, 5, 4, 3].map((w, h) => ({ h, w }));

function receiptFor(chain: Lane["chain"], txId: string): string {
  if (chain === "hedera") return `https://hashscan.io/testnet/transaction/${txId}`;
  if (chain === "base") return `https://sepolia.basescan.org/tx/${txId}`;
  return `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
}

function hex(rand: () => number, n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(rand() * 16).toString(16);
  return s;
}

function generatePayments(count: number): Payment[] {
  const rand = mulberry32(402);
  const laneItems = LANES.map((l) => ({ lane: l, w: LANE_WEIGHT[l.name] }));
  const out: Payment[] = [];

  for (let i = 0; i < count; i++) {
    const { lane } = pick(laneItems, rand());
    // Growth curve: recent days are busier (sqrt skews toward "now").
    const dayAgo = Math.floor((1 - Math.sqrt(rand())) * 30);
    if (NOW - dayAgo * DAY < lane.createdAt) {
      i--;
      continue;
    }
    const hour = pick(HOUR_WEIGHT, rand()).h;
    const dayStart = Math.floor((NOW - dayAgo * DAY) / DAY) * DAY;
    let t = dayStart + hour * 3_600_000 + Math.floor(rand() * 3_600_000);
    if (t > NOW) t = NOW - Math.floor(rand() * 6 * 3_600_000);

    const payer = pick(PAYERS, rand()).id;
    const tier = PAYER_TIER[payer];
    const policy = POLICIES[lane.name];
    const mult = tier === "bot" && policy.humanVerifiedOnly ? policy.botMultiplier ?? 10 : 1;
    const path = pick(ENDPOINTS[lane.name], rand()).path;

    const failed = rand() < 0.045;
    const chainTx =
      lane.chain === "hedera"
        ? `0.0.${4800000 + Math.floor(rand() * 90000)}-${Math.floor(t / 1000)}-${Math.floor(rand() * 1e9)}`
        : lane.chain === "base"
          ? `0x${hex(rand, 64)}`
          : hex(rand, 88);

    out.push({
      reqId: `req_${hex(rand, 12)}`,
      lane: lane.name,
      from: payer,
      amount: failed ? 0 : +(lane.price * mult).toFixed(4),
      tier,
      path,
      status: failed ? "failed" : "settled",
      reason: failed ? FAIL_REASONS[Math.floor(rand() * FAIL_REASONS.length)] : undefined,
      txId: failed ? undefined : chainTx,
      receiptUrl: failed ? undefined : receiptFor(lane.chain, chainTx),
      country: countryFor(payer).code,
      t,
    });
  }

  out.sort((a, b) => b.t - a.t);
  // The newest payment is still settling, so the live state is visible.
  const newest = out[0];
  const newestLane = LANES.find((l) => l.name === newest.lane)!;
  out[0] = {
    ...newest,
    amount: newest.amount || newestLane.price,
    status: "pending",
    receiptUrl: undefined,
    txId: undefined,
    reason: undefined,
    t: NOW - 4_000,
  };
  return out;
}

export const PAYMENTS: Payment[] = generatePayments(1480);
