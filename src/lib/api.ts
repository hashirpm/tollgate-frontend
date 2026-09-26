// Client for the gateway Worker (/api/*, /catalog). Same origin, bearer auth.
//
// CONTRACT NOTE: request/response shapes below follow the frontend plan
// ("Backend additions this needs"). Field names the plan doesn't pin down are
// assumptions, and every one of them is normalized in this file only, so if
// the Worker names something differently, fix it here and nowhere else.

import { getAccount } from "wagmi/actions";
import { config } from "../wagmi";
import { clearToken, getToken } from "./session";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Query = Record<string, string | number | undefined | null>;

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const { query, body, auth = true } = opts;
  const qs = query
    ? new URLSearchParams(
        Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : "";
  const headers: Record<string, string> = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  // Read the connected wallet straight from wagmi, not from React state, so a
  // query that fires during the first render still carries the right token.
  const address = getAccount(config).address;
  if (auth) {
    const token = getToken(address);
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const res = await fetch(qs ? `${path}?${qs}` : path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (res.status === 401 && auth) {
    // Expired or revoked: drop the token; the route guard sends us to sign in.
    clearToken(address);
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && ("error" in data || "message" in data)
        ? String((data as Record<string, unknown>).error ?? (data as Record<string, unknown>).message)
        : undefined) ?? `${method} ${path} failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

// ---------- shapes ----------

export type EndpointStatus = "pending" | "active" | "paused";
export type AuthType = "none" | "header" | "query";
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface Endpoint {
  id: string;
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  authType: AuthType;
  authName: string;
  /** The secret itself is never returned; only whether one is stored. */
  hasAuthValue: boolean;
  staticHeaders: Record<string, string>;
  priceAtomic: bigint;
  exampleQuery: string;
  exampleBody: string;
  bodyOverrides: string;
  maxBodyBytes: number | null;
  status: EndpointStatus;
  calls: number;
  incomeAtomic: bigint;
  createdAt: number | null;
}

/** What the form sends. Omit `auth_value` to keep the stored secret. */
export interface EndpointInput {
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  auth_type: AuthType;
  auth_name: string | null;
  auth_value?: string;
  static_headers: Record<string, string>;
  price_atomic: string; // integer string, 6 decimals
  example_query: string | null;
  example_body: string | null;
  body_overrides: string | null;
  max_body_bytes: number | null;
}

export interface StatsPoint {
  t: number; // ms
  incomeAtomic: bigint;
  calls: number;
}

export interface Stats {
  incomeAtomic: bigint;
  paidCalls: number;
  failedCalls: number;
  uniquePayers: number;
  series: StatsPoint[];
}

export type CallStatus = "settled" | "failed_upstream";

export interface Call {
  id: string;
  /** The server's own timestamp value, passed back verbatim as since/before cursors. */
  cursor: string | number;
  t: number; // ms
  endpointId: string;
  endpointName: string;
  payer: string;
  amountAtomic: bigint;
  status: CallStatus;
  txHash: string | null;
  upstreamStatus: number | null;
}

export interface TestResult {
  ok: boolean;
  status: number | null;
  body: string;
  error: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  method: string;
  url: string;
  priceUsd: number | null;
}

// ---------- normalizers ----------

type Raw = Record<string, unknown>;

const str = (v: unknown, d = "") => (v == null ? d : String(v));
const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
function big(v: unknown): bigint {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(Math.trunc(v));
    if (typeof v === "string" && /^-?\d+$/.test(v.trim())) return BigInt(v.trim());
  } catch {
    /* fall through */
  }
  return 0n;
}
/** Unix seconds, unix ms, or ISO string → ms. */
export function toMs(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v))) {
    const n = Number(v);
    return n < 1e12 ? n * 1000 : n;
  }
  const p = Date.parse(String(v));
  return Number.isNaN(p) ? 0 : p;
}
/** JSON column that may arrive as a string or already parsed. */
const jsonText = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 2));

/** Accept a bare array or an envelope like { endpoints: [...] } / { items: [...] }. */
function list(data: unknown, ...keys: string[]): Raw[] {
  if (Array.isArray(data)) return data as Raw[];
  if (data && typeof data === "object") {
    for (const k of [...keys, "items", "rows", "data", "results"]) {
      const v = (data as Raw)[k];
      if (Array.isArray(v)) return v as Raw[];
    }
  }
  return [];
}
function one(data: unknown, key: string): Raw {
  if (data && typeof data === "object" && key in (data as Raw) && typeof (data as Raw)[key] === "object") {
    return (data as Raw)[key] as Raw;
  }
  return (data ?? {}) as Raw;
}

function toEndpoint(r: Raw): Endpoint {
  const headers = typeof r.static_headers === "string" ? safeParse(r.static_headers) : r.static_headers;
  return {
    id: str(r.id),
    name: str(r.name),
    description: str(r.description),
    method: (str(r.method, "GET").toUpperCase() as HttpMethod) ?? "GET",
    url: str(r.url ?? r.upstream_url),
    authType: (str(r.auth_type, "none") as AuthType) || "none",
    authName: str(r.auth_name),
    hasAuthValue: Boolean(r.has_auth_value ?? r.auth_value_set ?? r.has_secret),
    staticHeaders: headers && typeof headers === "object" ? (headers as Record<string, string>) : {},
    priceAtomic: big(r.price_atomic),
    exampleQuery: str(r.example_query),
    exampleBody: jsonText(r.example_body),
    bodyOverrides: jsonText(r.body_overrides),
    maxBodyBytes: r.max_body_bytes == null ? null : num(r.max_body_bytes),
    status: (str(r.status, "pending") as EndpointStatus) || "pending",
    calls: num(r.calls),
    incomeAtomic: big(r.income_atomic),
    createdAt: r.created_at == null ? null : toMs(r.created_at),
  };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function toCall(r: Raw): Call {
  const status = str(r.status);
  return {
    id: str(r.id ?? r.call_id ?? `${r.ts}-${r.payer}`),
    cursor: (r.ts ?? r.created_at ?? r.t) as string | number,
    t: toMs(r.ts ?? r.created_at ?? r.t),
    endpointId: str(r.endpoint_id),
    endpointName: str(r.endpoint_name, str(r.endpoint_id)),
    payer: str(r.payer ?? r.from),
    amountAtomic: big(r.amount_atomic ?? r.price_atomic),
    status: status === "settled" || status === "paid" ? "settled" : "failed_upstream",
    txHash: r.tx_hash ? str(r.tx_hash) : null,
    upstreamStatus: r.upstream_status == null ? null : num(r.upstream_status),
  };
}

function toStats(r: Raw): Stats {
  return {
    incomeAtomic: big(r.income_atomic),
    paidCalls: num(r.paid_calls ?? r.calls),
    failedCalls: num(r.failed_calls ?? r.failed_upstream),
    uniquePayers: num(r.unique_payers),
    series: list(r.series).map((p) => ({ t: toMs(p.bucket), incomeAtomic: big(p.income_atomic), calls: num(p.calls) })),
  };
}

function toCatalogItem(r: Raw): CatalogItem {
  const priceUsd =
    r.price_usd != null ? num(r.price_usd) : r.price_atomic != null ? Number(big(r.price_atomic)) / 1e6 : r.price != null ? num(r.price) : null;
  return {
    id: str(r.id),
    name: str(r.name),
    description: str(r.description),
    method: str(r.method, "GET"),
    url: str(r.url ?? r.paid_url),
    priceUsd,
  };
}

// ---------- calls ----------

export interface FeedQuery {
  since?: string | number;
  before?: string | number;
  endpoint_id?: string;
  status?: CallStatus;
  limit?: number;
}

export const api = {
  // auth (unauthenticated)
  nonce: () => request<{ nonce: string }>("GET", "/api/auth/nonce", { auth: false }).then((r) => r.nonce),
  verify: (message: string, signature: string) =>
    request<{ token: string }>("POST", "/api/auth/verify", { auth: false, body: { message, signature } }).then((r) => r.token),
  me: () => request<{ address: string }>("GET", "/api/me"),

  stats: (range: "24h" | "30d", endpointId?: string) =>
    request<Raw>("GET", "/api/stats", { query: { range, endpoint_id: endpointId } }).then(toStats),

  endpoints: () => request<unknown>("GET", "/api/endpoints").then((d) => list(d, "endpoints").map(toEndpoint)),
  endpoint: (id: string) => request<unknown>("GET", `/api/endpoints/${encodeURIComponent(id)}`).then((d) => toEndpoint(one(d, "endpoint"))),
  createEndpoint: (input: EndpointInput) => request<unknown>("POST", "/api/endpoints", { body: input }).then((d) => toEndpoint(one(d, "endpoint"))),
  updateEndpoint: (id: string, patch: Partial<EndpointInput> | { status: EndpointStatus }) =>
    request<unknown>("PATCH", `/api/endpoints/${encodeURIComponent(id)}`, { body: patch }).then((d) => toEndpoint(one(d, "endpoint"))),
  deleteEndpoint: (id: string) => request<unknown>("DELETE", `/api/endpoints/${encodeURIComponent(id)}`),
  testEndpoint: (id: string) =>
    request<Raw>("POST", `/api/endpoints/${encodeURIComponent(id)}/test`).then(
      (r): TestResult => ({
        ok: Boolean(r.ok ?? (num(r.status) >= 200 && num(r.status) < 300)),
        status: r.status == null ? (r.upstream_status == null ? null : num(r.upstream_status)) : num(r.status),
        body: typeof r.body === "string" ? r.body : r.body == null ? "" : JSON.stringify(r.body, null, 2),
        error: r.error ? str(r.error) : null,
      }),
    ),

  feed: (q: FeedQuery) => request<unknown>("GET", "/api/feed", { query: { ...q } }).then((d) => list(d, "feed", "calls").map(toCall)),

  catalog: () => request<unknown>("GET", "/catalog", { auth: false }).then((d) => list(d, "endpoints", "apis").map(toCatalogItem)),
};

/** Where buyers call an endpoint. The Worker serves paid proxies at /x/:id. */
export const paidUrl = (id: string) => `${location.origin}/x/${id}`;
