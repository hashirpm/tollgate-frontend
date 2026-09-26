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
built by `@opennextjs/cloudflare`. Route handlers proxy `/api/*`, `/x/*`,
`/catalog` and `/screen` to the gateway Worker (`src/lib/gateway-proxy.ts`), so the browser
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
| `/dashboard` | **Action center** (what needs the seller, from the gateway's `/api/actions`: payments not found onchain, failing or untested endpoints, blocked payers, USDC received outside Tollgate, income concentrated in one buyer), KPIs (income with its onchain-verified share, paid calls, failed upstream, unique payers, wallet USDC), income/calls chart (24h hourly / 30d daily), **Onchain reconciliation** card (recorded vs verified-onchain income, external inflows, last indexed block, via Curvegrid MultiBaas), Intercepta card (payout address check, payers blocked in 30 days), live feed (polls every 2s, flagged payers marked, each payment's onchain state: Onchain · block, Confirming, Not onchain, Amount differs) |
| `/endpoints` | Table with status, calls, income, paid URL; pause / activate / edit / delete |
| `/endpoints/new`, `/endpoints/:id/edit` | Form (basics, auth, static headers, price, example request, guards, **Screen payers with Intercepta**) → **Test** step; a 2xx makes it active |
| `/endpoints/:id` | Endpoint KPIs, chart, recent calls, paid URL, `curl -i` 402 snippet, `paid_fetch` snippet |
| `/payments` | Full history, paged with `before=`, filter by endpoint and status; **Not onchain** filter (`?verification=unverified`, linked from the Action center) lists settled payments no USDC transfer backs; **Blocked by Intercepta** tab lists payers the paywall refused |
| `/claude` | `claude mcp add` command, `.mcp.json`, env vars, faucet link, live `/catalog` preview |
| `/pay/:id` | Public buyer page: connect wallet, edit the example request, pay with x402 (EIP-712 USDC authorization, no gas), see the response (JSON, text, audio, image) and the BaseScan receipt. Refuses a quote above the catalog price or to another address. **Intercepta screening:** the seller and USDC are checked on load (a flagged seller disables Pay), then the actual quote and the exact authorization are checked before the wallet prompt; a block stops the payment with the reason (`src/lib/pay.ts`) |

Opening a paid URL (`/x/:id`) in a browser redirects to `/pay/:id` with its query
string; API clients and the pay page's own `fetch()` are proxied to the gateway as
usual.

## Auth

1. Connect a browser wallet (injected / EIP-6963: MetaMask, Rabby, …). Wrong chain → switch prompt.
2. `GET /api/auth/nonce` → SIWE message via viem `createSiweMessage` (domain `location.host`, chain 84532) → `signMessage` → `POST /api/auth/verify` → `{ token }`.
3. Token stored in `localStorage` under `tollgate:token:<address>`, sent as `Authorization: Bearer`.
4. A 401, an account change or a chain change clears it and returns to sign-in. Disconnect clears it.

## API contract

Everything the dashboard assumes about the Worker lives in **`src/lib/api.ts`**,
including field names the frontend plan doesn't pin down. Each response goes
through a normalizer there, so if the Worker names a field differently, fix it in
that one file. Assumptions worth checking against the backend:

- Endpoints (matches `backend/worker/src/routes/endpoints.ts`): `GET/POST /api/endpoints`,
  `GET/PATCH/DELETE /api/endpoints/:id`, `POST /api/endpoints/:id/test` →
  `{ ok, status, latency_ms, content_type, body, activated }`. Writes send
  `auth: { type, name, value? }` (omit `value` to keep the stored secret),
  `price_usd` as a decimal string, and `example_body` / `body_overrides` as parsed
  JSON. Reads return auth flat (`auth_type`, `auth_name`, `auth_set`) and
  `example_body` as a JSON string. PATCH sends only changed fields; changing
  `url`, `method`, `auth`, `static_headers` or `body_overrides` returns
  `retest_required` and the form re-runs the test. A 400 carries
  `issues: [{ path, message }]`, shown on the matching field.
- Stats: `GET /api/stats?range=24h|30d&endpoint_id=` → `{ income_atomic, paid_calls,
  failed_calls, unique_payers, series: [{ bucket, income_atomic, calls }] }`.
- Feed: `GET /api/feed?since|before|endpoint_id|status|limit` → rows with `id, ts,
  endpoint_id, endpoint_name, payer, amount_atomic, settled (boolean), tx_hash`; the
  status filter sends `settled | failed`. `ts` is passed back verbatim as the cursor (seconds, ms or ISO all work).
- Screening (Intercepta, key held by the gateway): `POST /screen {pay_to?, asset?, payer?,
  amount?, authorization?}` → `{ verdict: allow | warn | block, enabled, summary, checks[] }`;
  `GET /api/screenings?verdict=block` → `{ enabled, blocked_30d, blocked_30d_usd, screenings }`;
  `GET /api/screen/payout`; endpoints carry `screen_payers`; feed rows carry `payer_verdict`;
  catalog rows carry `pay_to_risk`. Screening failures fail closed on the pay page.
- Onchain verification (Curvegrid MultiBaas, configured on the gateway): feed rows carry
  `verification` (`verified | mismatch | confirming | unverified | untracked`, null when off),
  `onchain_block`, `onchain_usd`; `GET /api/feed?verification=unverified`;
  `GET /api/reconcile?range=24h|30d` → `{ status: ok | degraded | off, recorded_atomic, verified_atomic,
  external_atomic, verified_pct, counts, unverified[], mismatched[], external[], last_block }`;
  `GET /api/actions` → `{ actions: [{ id, severity: critical | warning | info, title, detail, cta }], verification }`.
  The live feed refetches its whole page each poll so a row's state can change after it appears.
- Lists may be bare arrays or wrapped (`{ endpoints: [...] }`, `{ calls: [...] }`).

## Config

See `.env.example`.

- `GATEWAY_URL`: where `next dev` proxies the API (on Workers, use the `wrangler.jsonc` var or a service binding).
- `NEXT_PUBLIC_MCP_COMMAND`: how buyers launch the MCP server. It fills in the snippets on
  **Use with Claude**, and is inlined at build time. Until it's set, that page shows a notice.
