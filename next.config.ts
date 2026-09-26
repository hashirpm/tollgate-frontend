import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// /api/*, /x/* and /catalog are proxied to the gateway Worker by route handlers
// (src/lib/gateway-proxy.ts), not rewrites, so the target is read at runtime.
const nextConfig: NextConfig = {};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings (getCloudflareContext) locally.
initOpenNextCloudflareForDev();
