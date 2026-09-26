// Server-only: forwards /api/*, /x/* and /catalog to the gateway Worker, so the
// browser only ever talks to the dashboard's origin (no CORS, and the bearer
// token never crosses origins).
//
// Target, in order of preference:
//   1. a `GATEWAY` service binding (Worker → Worker, no public hop)
//   2. the GATEWAY_URL var / env (e.g. https://gateway.example.workers.dev)
//   3. http://localhost:8787 (wrangler dev)

import { getCloudflareContext } from "@opennextjs/cloudflare";

interface Fetcher {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

interface GatewayEnv {
  GATEWAY?: Fetcher;
  GATEWAY_URL?: string;
}

// Hop-by-hop headers (and Host) must not be forwarded. Nor accept-encoding:
// fetch() negotiates its own, and passing the browser's through (zstd) gets
// back a body fetch() can't decode.
const STRIP_REQUEST = ["host", "connection", "keep-alive", "proxy-connection", "transfer-encoding", "te", "trailer", "upgrade", "content-length", "accept-encoding"];
// fetch() already decoded the body, so the upstream encoding/length no longer apply.
const STRIP_RESPONSE = ["content-encoding", "content-length", "transfer-encoding", "connection"];

function gatewayEnv(): GatewayEnv {
  try {
    return getCloudflareContext().env as GatewayEnv;
  } catch {
    return {}; // not running on Workers (e.g. `next start`)
  }
}

export async function proxyToGateway(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const env = gatewayEnv();
  const base = (env.GATEWAY_URL ?? process.env.GATEWAY_URL ?? "http://localhost:8787").replace(/\/$/, "");

  const headers = new Headers(req.headers);
  STRIP_REQUEST.forEach((h) => headers.delete(h));
  // lets the gateway check the SIWE domain against the host the user actually saw
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
  };

  const path = `${url.pathname}${url.search}`;
  let res: Response;
  try {
    // a service binding ignores the hostname; only the path matters
    res = env.GATEWAY ? await env.GATEWAY.fetch(`https://gateway${path}`, init) : await fetch(`${base}${path}`, init);
  } catch (e) {
    const where = env.GATEWAY ? "the GATEWAY service binding" : base;
    return Response.json({ error: `Gateway unreachable at ${where}: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  const out = new Headers(res.headers);
  STRIP_RESPONSE.forEach((h) => out.delete(h));
  return new Response(req.method === "HEAD" ? null : res.body, { status: res.status, statusText: res.statusText, headers: out });
}
