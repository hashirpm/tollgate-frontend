// The one seam between the dashboard and the backend.
//
// Every page reads through these functions. Right now they fold the hardcoded
// demo data in mock-data.ts; when the hub is ready, swap each body for a fetch
// (GET /lanes, /analytics?lanes=…, /policy/:lane, /account) and nothing in the
// components has to change. They are async already for that reason.

import { ACCOUNT, COUNTRIES, DAY, LANES, NOW, PAYMENTS, POLICIES } from "./mock-data";
import type { Analytics, ApiStat, DailyPoint, Payment, Policy, Snapshot, Tier } from "./types";

export { NOW };

export async function getAccount() {
  return ACCOUNT;
}

export async function getLanes() {
  return LANES;
}

export async function getPayments(opts: { lane?: string; limit?: number } = {}): Promise<Payment[]> {
  const rows = opts.lane ? PAYMENTS.filter((p) => p.lane === opts.lane) : PAYMENTS;
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}

export async function getPolicies(): Promise<Record<string, Policy>> {
  return POLICIES;
}

export async function getHcsTopicUrl() {
  return "https://hashscan.io/testnet/topic/0.0.6841990";
}

// ---- aggregation (mirrors core/src/analytics.ts in the hub) ----

function snapshot(rows: Payment[]): Snapshot {
  const settled = rows.filter((p) => p.status === "settled");
  const endpoint = new Map<string, number>();
  const country = new Map<string, number>();
  const payer = new Map<string, { spend: number; calls: number }>();
  const byHour = new Array<number>(24).fill(0);
  const byTier: Record<Tier, number> = { human: 0, bot: 0, anon: 0 };
  let income = 0;

  for (const p of settled) {
    income += p.amount;
    endpoint.set(p.path, (endpoint.get(p.path) ?? 0) + 1);
    country.set(p.country, (country.get(p.country) ?? 0) + 1);
    byHour[new Date(p.t).getUTCHours()] += 1;
    byTier[p.tier] += 1;
    const cur = payer.get(p.from) ?? { spend: 0, calls: 0 };
    cur.spend += p.amount;
    cur.calls += 1;
    payer.set(p.from, cur);
  }

  return {
    totalIncome: income,
    totalRequests: settled.length,
    failedRequests: rows.length - settled.length,
    avgPrice: settled.length ? income / settled.length : 0,
    byEndpoint: [...endpoint].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value),
    byHour,
    byCountry: [...country]
      .map(([code, value]) => ({ ...COUNTRIES.find((c) => c.code === code)!, value }))
      .sort((a, b) => b.value - a.value),
    byPayer: [...payer]
      .map(([id, v]) => ({ payer: id, ...v }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8),
    byTier,
  };
}

export async function getAnalytics(): Promise<Analytics> {
  const byLane: Record<string, Snapshot> = {};
  for (const l of LANES) byLane[l.name] = snapshot(PAYMENTS.filter((p) => p.lane === l.name));
  return { ...snapshot(PAYMENTS), byLane };
}

/** Daily income for the last `days` days, oldest first, split by API. */
export async function getDailySeries(days = 30): Promise<DailyPoint[]> {
  const today = Math.floor(NOW / DAY) * DAY;
  const points: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = today - i * DAY;
    points.push({ day, income: 0, requests: 0, byLane: Object.fromEntries(LANES.map((l) => [l.name, 0])) });
  }
  const first = points[0].day;
  for (const p of PAYMENTS) {
    if (p.status !== "settled" || p.t < first) continue;
    const pt = points[Math.floor((p.t - first) / DAY)];
    if (!pt) continue;
    pt.income += p.amount;
    pt.requests += 1;
    pt.byLane[p.lane] += p.amount;
  }
  return points;
}

export async function getApiStats(): Promise<ApiStat[]> {
  const series = await getDailySeries(14);
  return LANES.map((lane) => {
    const rows = PAYMENTS.filter((p) => p.lane === lane.name && p.status === "settled");
    const trend = series.map((d) => d.byLane[lane.name]);
    const last7 = trend.slice(7).reduce((s, v) => s + v, 0);
    const prev7 = trend.slice(0, 7).reduce((s, v) => s + v, 0);
    return {
      lane,
      income: rows.reduce((s, p) => s + p.amount, 0),
      requests: rows.length,
      lastT: rows[0]?.t,
      trend,
      delta: prev7 ? ((last7 - prev7) / prev7) * 100 : 100,
    };
  }).sort((a, b) => b.income - a.income);
}

/** Headline KPIs with their period-over-period change. */
export async function getKpis(days = 7) {
  const series = await getDailySeries(days * 2);
  const cur = series.slice(days);
  const prev = series.slice(0, days);
  const sum = (pts: DailyPoint[], k: "income" | "requests") => pts.reduce((s, p) => s + p[k], 0);
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  const income = sum(cur, "income");
  const requests = sum(cur, "requests");
  const prevIncome = sum(prev, "income");
  const prevRequests = sum(prev, "requests");
  const avg = requests ? income / requests : 0;
  const prevAvg = prevRequests ? prevIncome / prevRequests : 0;
  return {
    income,
    incomeDelta: pct(income, prevIncome),
    requests,
    requestsDelta: pct(requests, prevRequests),
    avgPrice: avg,
    avgDelta: pct(avg, prevAvg),
    incomeTrend: cur.map((p) => p.income),
    requestTrend: cur.map((p) => p.requests),
    avgTrend: cur.map((p) => (p.requests ? p.income / p.requests : 0)),
  };
}
