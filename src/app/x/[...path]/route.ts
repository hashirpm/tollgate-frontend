import { proxyToGateway } from "@/lib/gateway-proxy";

// Proxied to the gateway Worker; never cached or prerendered.
export const dynamic = "force-dynamic";

/**
 * A person opening a paid URL in the browser gets the pay page instead of a bare
 * 402. Anything else (x402 clients, fetch() from the pay page itself, retries
 * carrying a payment) goes straight to the gateway.
 */
function handle(req: Request): Promise<Response> | Response {
  const url = new URL(req.url);
  const id = url.pathname.split("/")[2];
  const pageLoad =
    req.method === "GET" &&
    (req.headers.get("sec-fetch-dest") === "document" || (req.headers.get("accept") ?? "").includes("text/html")) &&
    !req.headers.has("payment-signature") &&
    !req.headers.has("x-payment");
  if (pageLoad && id) return Response.redirect(new URL(`/pay/${encodeURIComponent(id)}${url.search}`, url), 302);
  return proxyToGateway(req);
}

export const GET = handle;
export const HEAD = proxyToGateway;
export const POST = proxyToGateway;
export const PUT = proxyToGateway;
export const PATCH = proxyToGateway;
export const DELETE = proxyToGateway;
export const OPTIONS = proxyToGateway;
