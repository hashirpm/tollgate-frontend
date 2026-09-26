# Tollgate — seller dashboard

Put any HTTP API behind x402 pay-per-call. Sellers connect a wallet, add an
endpoint (URL + key + price), test it, and watch paid calls arrive live with
BaseScan links while their USDC balance grows. Settles in USDC on Base Sepolia.

Buyers (Claude via MCP) never use this UI; the only buyer-facing page is
**Use with Claude**.

Next.js 16 (App Router) on Cloudflare Workers via OpenNext · React 19 ·
wagmi v2 + viem · TanStack Query · Tailwind v4 · Recharts.

## Run

```bash
bun install
bun dev            # http://localhost:3000 (start the gateway's `wrangler dev` on :8787 first)
bun run lint
bun run preview    # build for Workers + run it locally in workerd
bun run deploy     # build for Workers + deploy
```

The dashboard talks to the gateway Worker (Hono + D1) and nothing else, apart
from reading the USDC balance from Base Sepolia.

## Hosting

The dashboard is its own Worker (`tollgate-dashboard`, see `wrangler.jsonc`),
built by `@opennextjs/cloudflare`. Route handlers proxy `/api/*`, `/x/*` and
`/catalog` to the gateway Worker (`src/lib/gateway-proxy.ts`), so the browser
only ever sees one origin: no CORS, and the bearer token stays same-origin.

Proxy target, read at runtime (no rebuild per environment):

1. a `GATEWAY` **service binding** in `wrangler.jsonc` (Worker to Worker, recommended in production)
2. the `GATEWAY_URL` var (`wrangler.jsonc` → `vars`, or `.env` for `next dev`)
3. `http://localhost:8787`

The proxy adds `x-forwarded-host` / `x-forwarded-proto`, so the gateway can check
the SIWE message's domain against the host the seller actually signed in on.

Nearly everything is a client component: the wallet, SIWE and live polling all
live in the browser, and the app renders once it's mounted (see
`src/app/providers.tsx`).

## Pages

| Route | |
| --- | --- |
| `/` | Connect wallet → switch to Base Sepolia → Sign-In With Ethereum |
| `/dashboard` | KPIs (income, paid calls, failed upstream, unique payers, wallet USDC), income/calls chart (24h hourly / 30d daily), live feed (polls every 2s) |
| `/endpoints` | Table with status, calls, income, paid URL; pause / activate / edit / delete |
| `/endpoints/new`, `/endpoints/:id/edit` | Form (basics, auth, static headers, price, example request, guards) → **Test** step; a 2xx makes it active |
| `/endpoints/:id` | Endpoint KPIs, chart, recent calls, paid URL, `curl -i` 402 snippet, `paid_fetch` snippet |
| `/payments` | Full history, paged with `before=`, filter by endpoint and status |
| `/claude` | `claude mcp add` command, `.mcp.json`, env vars, faucet link, live `/catalog` preview |

## Auth

1. Connect (injected / EIP-6963 wallets, or Coinbase Wallet). Wrong chain → switch prompt.
2. `GET /api/auth/nonce` → SIWE message via viem `createSiweMessage` (domain `location.host`, chain 84532) → `signMessage` → `POST /api/auth/verify` → `{ token }`.
3. Token stored in `localStorage` under `tollgate:token:<address>`, sent as `Authorization: Bearer`.
4. A 401, an account change or a chain change clears it and returns to sign-in. Disconnect clears it.

## API contract

Everything the dashboard assumes about the Worker lives in **`src/lib/api.ts`**,
including field names the frontend plan doesn't pin down. Each response goes
through a normalizer there, so if the Worker names a field differently, fix it in
that one file. Assumptions worth checking against the backend:

- Endpoints: `GET/POST /api/endpoints`, `GET/PATCH/DELETE /api/endpoints/:id`,
  `POST /api/endpoints/:id/test` → `{ ok, status, body }`. Pause/activate is
  `PATCH { status }`. The secret is sent as `auth_value` (omitted to keep the
  stored one); responses expose only `has_auth_value`. Price is `price_atomic`
  (integer string, 6 decimals).
- Stats: `GET /api/stats?range=24h|30d&endpoint_id=` → `{ income_atomic, paid_calls,
  failed_calls, unique_payers, series: [{ bucket, income_atomic, calls }] }`.
- Feed: `GET /api/feed?since|before|endpoint_id|status|limit` → rows with `id, ts,
  endpoint_id, endpoint_name, payer, amount_atomic, status (settled | failed_upstream),
  tx_hash`. `ts` is passed back verbatim as the cursor (seconds, ms or ISO all work).
- Lists may be bare arrays or wrapped (`{ endpoints: [...] }`, `{ calls: [...] }`).

## Config

See `.env.example`.

- `GATEWAY_URL`: where `next dev` proxies the API (on Workers, use the `wrangler.jsonc` var or a service binding).
- `NEXT_PUBLIC_MCP_COMMAND`: how buyers launch the MCP server. It fills in the snippets on
  **Use with Claude**, and is inlined at build time. Until it's set, that page shows a notice.
