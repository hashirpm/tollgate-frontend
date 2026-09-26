import { proxyToGateway } from "@/lib/gateway-proxy";

// Intercepta payment screening, proxied to the gateway (which holds the API key).
export const dynamic = "force-dynamic";

export const POST = proxyToGateway;
export const OPTIONS = proxyToGateway;
