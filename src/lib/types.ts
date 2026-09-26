// Shapes the dashboard renders. They mirror the hub's event/analytics model
// (lanes, settled payments, per-lane snapshots) so the backend can slot in
// behind src/lib/data.ts without touching any component.

export type Chain = "hedera" | "base" | "solana";

/** One x402-ified API ("lane" in hub terms). */
export interface Lane {
  name: string;
  upstream: string;
  price: number; // USD per call, base tier
  payTo: string;
  chain: Chain;
  port: number;
  sample: string;
  sampleMethod?: "GET" | "POST";
  status: "live" | "paused";
  createdAt: number;
}

export type Tier = "human" | "bot" | "anon";

/** A settled or failed x402 flow, joined with its on-chain receipt. */
export interface Payment {
  reqId: string;
  lane: string;
  from: string;
  amount: number;
  tier: Tier;
  path: string;
  status: "settled" | "failed" | "pending";
  reason?: string;
  txId?: string;
  receiptUrl?: string;
  country: string;
  t: number;
}

export interface Policy {
  humanVerifiedOnly?: boolean;
  botMultiplier?: number;
  blockBots?: boolean;
  streaming?: boolean;
  streamRate?: number;
  dynamicPricing?: boolean;
  priceFloor?: number;
  priceCeiling?: number;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface Snapshot {
  totalIncome: number;
  totalRequests: number;
  failedRequests: number;
  avgPrice: number;
  byEndpoint: { key: string; value: number }[];
  byHour: number[]; // 24 buckets, UTC
  byCountry: (Country & { value: number })[];
  byPayer: { payer: string; spend: number; calls: number }[];
  byTier: Record<Tier, number>;
}

/** Top level is the "All APIs" fold; byLane holds the same shape per API. */
export interface Analytics extends Snapshot {
  byLane: Record<string, Snapshot>;
}

export interface DailyPoint {
  day: number; // epoch ms, start of UTC day
  income: number;
  requests: number;
  byLane: Record<string, number>;
}

export interface Account {
  addr: string;
  accountId: string;
  balance: number; // HBAR
  network: string;
  facilitator: string;
}

/** Per-API rollup shown on the APIs page and overview donut. */
export interface ApiStat {
  lane: Lane;
  income: number;
  requests: number;
  lastT?: number;
  trend: number[]; // daily income, oldest first
  delta: number; // % change, last 7d vs prior 7d
}
