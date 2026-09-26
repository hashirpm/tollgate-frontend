import { proxyToGateway } from "@/lib/gateway-proxy";

// Proxied to the gateway Worker; never cached or prerendered.
export const dynamic = "force-dynamic";

export const GET = proxyToGateway;
export const HEAD = proxyToGateway;
export const POST = proxyToGateway;
export const PUT = proxyToGateway;
export const PATCH = proxyToGateway;
export const DELETE = proxyToGateway;
export const OPTIONS = proxyToGateway;
