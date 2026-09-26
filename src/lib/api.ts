// Client for the gateway Worker (/api/*, /catalog). Same origin, bearer auth.
//
// Request shapes match worker/src/routes/endpoints.ts. Responses are normalized
// here only, so if the Worker renames something, fix it in this file.

import { getAccount } from "wagmi/actions";
import { config } from "../wagmi";
import { clearToken, getToken } from "./session";

export interface ApiIssue {
  /** Dotted field path from the Worker's zod error, e.g. "auth.name". Empty for form-level errors. */
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  issues: ApiIssue[];
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
    this.issues = issuesOf(body);
  }
}

/** { error: "invalid_request", issues: [{ path, message }] } → issues; a bare { error: "url must use https" } → one issue without a path. */
function issuesOf(body: unknown): ApiIssue[] {
  if (!body || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;
  if (Array.isArray(b.issues)) {
    return b.issues
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
      .map((i) => ({ path: Array.isArray(i.path) ? i.path.join(".") : String(i.path ?? ""), message: String(i.message ?? "Invalid value") }));
  }
  return typeof b.error === "string" && b.error !== "invalid_request" ? [{ path: "", message: b.error }] : [];
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
  if (!res.ok) throw new ApiError(res.status, errorMessage(data) ?? `${method} ${path} failed (${res.status})`, data);
  return data as T;
}

/**
 * Turn an error body into one readable line, keeping whatever detail the
 * Worker gives: "invalid_request: price_atomic: Expected number, received string".
 * Understands a plain { error, message } plus zod-style issue lists and
 * field → message maps.
 */
function errorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return typeof data === "string" && data ? data.slice(0, 300) : undefined;
  const d = data as Record<string, unknown>;
  const head = [d.error, d.message].filter((v) => typeof v === "string" && v).join(": ") || undefined;

  const details: string[] = [];
  const issues = d.issues ?? d.errors ?? d.details ?? (d.error && typeof d.error === "object" ? d.error : undefined);
  if (Array.isArray(issues)) {
    for (const i of issues.slice(0, 4)) {
      if (typeof i === "string") details.push(i);
      else if (i && typeof i === "object") {
        const r = i as Record<string, unknown>;
        const where = Array.isArray(r.path) ? r.path.join(".") : r.path ?? r.field ?? r.param;
        details.push([where, r.message ?? r.msg].filter(Boolean).join(": "));
      }
    }
  } else if (issues && typeof issues === "object") {
    // { fieldErrors: { price_atomic: ["Expected number"] } } or { price_atomic: "..." }
    const map = ((issues as Record<string, unknown>).fieldErrors ?? issues) as Record<string, unknown>;
    for (const [k, v] of Object.entries(map).slice(0, 4)) details.push(`${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  }
  const tail = details.filter(Boolean).join("; ");
  return [head, tail].filter(Boolean).join(" — ") || undefined;
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
  /** Pretty-printed JSON text, "" when unset. */
  exampleBody: string;
  /** Pretty-printed JSON object, "" when unset. */
  bodyOverrides: string;
  maxBodyBytes: number;
  status: EndpointStatus;
  calls: number;
  incomeAtomic: bigint;
  createdAt: number | null;
}

/** Omit `value` on PATCH to keep the stored secret. */
export type AuthInput = { type: "none" } | { type: "header" | "query"; name: string; value?: string };

/** POST /api/endpoints body. PATCH takes any subset (EndpointPatch). */
export interface EndpointInput {
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  auth: AuthInput;
  static_headers: Record<string, string>;
  /** Decimal USD, at most 6 places, e.g. "0.0001". The Worker converts to atomic units. */
  price_usd: string;
  example_query: string | null;
  /** Parsed JSON, sent upstream by the activation test. */
  example_body: unknown;
  body_overrides: Record<string, unknown> | null;
  max_body_bytes: number;
}

export type EndpointPatch = Partial<EndpointInput> & { status?: "active" | "paused" };

export interface SavedEndpoint {
  endpoint: Endpoint;
  /** The change moved the endpoint back to pending; run the test to reactivate it. */
  retestRequired: boolean;
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
  contentType: string | null;
  latencyMs: number | null;
  activated: boolean;
  error: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  method: string;
  url: string;
  priceUsd: number | null;
  priceAtomic: bigint;
  /** The seller's wallet; a quote paying anyone else is refused. */
  payTo: string;
  acceptsBody: boolean;
  exampleQuery: string;
  /** Pretty-printed JSON text, "" when unset. */
  exampleBody: string;
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
/** JSON that may arrive as a string (example_body) or already parsed (body_overrides) → pretty text. */
function jsonText(v: unknown): string {
  if (v == null) return "";
  if (typeof v !== "string") return JSON.stringify(v, null, 2);
  const parsed = safeParse(v);
  return parsed === undefined ? v : JSON.stringify(parsed, null, 2);
}

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

/** The Worker's default when max_body_bytes is omitted on create. */
export const DEFAULT_MAX_BODY_BYTES = 65_536;

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
    hasAuthValue: Boolean(r.auth_set),
    staticHeaders: headers && typeof headers === "object" ? (headers as Record<string, string>) : {},
    priceAtomic: big(r.price_atomic),
    exampleQuery: str(r.example_query),
    exampleBody: jsonText(r.example_body),
    bodyOverrides: jsonText(r.body_overrides),
    maxBodyBytes: num(r.max_body_bytes, DEFAULT_MAX_BODY_BYTES),
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
    priceAtomic: big(r.price_atomic),
    payTo: str(r.pay_to),
    acceptsBody: r.accepts_body == null ? !["GET", "HEAD"].includes(str(r.method, "GET").toUpperCase()) : Boolean(r.accepts_body),
    exampleQuery: str((r.example as Raw | undefined)?.query),
    exampleBody: jsonText((r.example as Raw | undefined)?.body),
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
  updateEndpoint: (id: string, patch: EndpointPatch) =>
    request<Raw>("PATCH", `/api/endpoints/${encodeURIComponent(id)}`, { body: patch }).then(
      (d): SavedEndpoint => ({ endpoint: toEndpoint(one(d, "endpoint")), retestRequired: Boolean(d.retest_required) }),
    ),
  deleteEndpoint: (id: string) => request<unknown>("DELETE", `/api/endpoints/${encodeURIComponent(id)}`),
  testEndpoint: (id: string) =>
    request<Raw>("POST", `/api/endpoints/${encodeURIComponent(id)}/test`).then(
      (r): TestResult => ({
        ok: Boolean(r.ok ?? (num(r.status) >= 200 && num(r.status) < 300)),
        status: r.status == null ? (r.upstream_status == null ? null : num(r.upstream_status)) : num(r.status),
        body: typeof r.body === "string" ? r.body : r.body == null ? "" : JSON.stringify(r.body, null, 2),
        contentType: r.content_type == null ? null : str(r.content_type),
        latencyMs: r.latency_ms == null ? null : num(r.latency_ms),
        activated: Boolean(r.activated),
        error: r.error ? str(r.error) : null,
      }),
    ),

  feed: (q: FeedQuery) => request<unknown>("GET", "/api/feed", { query: { ...q } }).then((d) => list(d, "feed", "calls").map(toCall)),

  catalog: () => request<unknown>("GET", "/catalog", { auth: false }).then((d) => list(d, "endpoints", "apis").map(toCatalogItem)),
};

/** Where buyers call an endpoint. The Worker serves paid proxies at /x/:id. */
export const paidUrl = (id: string) => `${location.origin}/x/${id}`;
