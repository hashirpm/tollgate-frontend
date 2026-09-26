# Tollgate — seller dashboard

Put any HTTP API behind x402 pay-per-call. Sellers connect a wallet, add an
endpoint (URL + key + price), test it, and watch paid calls arrive live with
BaseScan links while their USDC balance grows. Settles in USDC on Base Sepolia.

Buyers (Claude via MCP) never use this UI; the only buyer-facing page is
**Use with Claude**.

Vite + React 19 + TypeScript · wagmi v2 + viem · TanStack Query · react-router 7
· Tailwind v4 · Recharts.

## Run

```bash
bun install
bun dev            # http://localhost:5173, proxies /api /x /catalog → wrangler dev on :8787
                   # (override the target with WORKER_URL=http://host:port bun dev)
bun run build      # type-check + build to dist/
bun run lint
```

The dashboard talks to the gateway Worker (Hono + D1) and nothing else, apart
from reading the USDC balance from Base Sepolia. Start `wrangler dev` first.

## Hosting

The Worker serves `dist/` via Workers Static Assets, so everything is
same-origin (no CORS, one deploy). In the Worker's `wrangler.jsonc`, point
`assets.directory` at this repo's `dist/`:

```jsonc
"assets": {
  "directory": "<path-to-this-repo>/dist",
  "binding": "ASSETS",
  "not_found_handling": "single-page-application",
  "run_worker_first": ["/api/*", "/x/*", "/catalog"]
}
```

Deploy = `bun run build`, then `wrangler deploy`.

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

`VITE_MCP_COMMAND` (see `.env.example`): how buyers launch the MCP server. It fills
in the snippets on **Use with Claude**. Until it's set, that page shows a notice.
