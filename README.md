# x402 Maker — dashboard

Seller dashboard for x402-ified APIs: income, payments, analytics, and pricing
rules across every API you've wrapped with `npx x402ify`. Modeled on the
[GlassBox402](https://github.com/dhernz/Glassbox402) dashboard, rebuilt on
Next.js 16 (App Router) + Tailwind v4 + Recharts.

**All data is hardcoded for now.** The backend is being built separately.

## Run

```bash
bun install
bun dev          # http://localhost:3000
bun run build    # production build
```

## Routes

| Route | What it shows |
| --- | --- |
| `/` | Landing / connect-wallet gate |
| `/dashboard` | Overview: KPIs, income chart, income by API, recent payments, wallet, connect-an-API |
| `/dashboard/apis` | One card per wrapped API: income, calls, price, 14-day trend, pricing rules |
| `/dashboard/payments` | Every payment, filterable by status / tier / API, searchable |
| `/dashboard/analytics` | Calls by endpoint, hour of day, country, top payers, caller tiers, per API |
| `/dashboard/features` | Per-API pricing rules: World ID human pricing, bot multiplier, streaming, dynamic pricing |
| `/dashboard/settings` | Payout wallet, network, facilitator, credentials |

## Wiring the backend

Every page reads through **`src/lib/data.ts`** and nothing else. The functions
are already `async`, so swapping mocks for the hub is a body-only change:

| Function | Hub endpoint (GlassBox402 equivalent) |
| --- | --- |
| `getLanes()` | `GET /lanes` |
| `getPayments()` | payments joined from the event stream (`settled` + receipts) |
| `getAnalytics()` | `GET /analytics?lanes=…` |
| `getDailySeries()`, `getKpis()`, `getApiStats()` | derived from payments (or a new hub endpoint) |
| `getPolicies()` | `GET /policy/:lane` |
| `getAccount()` | `POST /account` + mirror-node balance |

Types in `src/lib/types.ts` mirror the hub's shapes. The two client-side
placeholders to replace are:

- `src/components/test-buyer-button.tsx` → `POST /testbuyer`
- `src/components/features-view.tsx` (`update`) → `POST /policy/:lane`

Mock data lives in `src/lib/mock-data.ts`. It is generated from a fixed seed
and a fixed clock (`NOW`), so server and client render identically. Delete it
once the hub is connected.

## Design notes

- Dark bento-grid layout, one neon-lime accent (`--color-lime`), violet as the
  secondary. Tokens are in `src/app/globals.css` under `@theme`.
- Per-API chart colors (`SERIES` in `src/lib/format.ts`) are a fixed-order
  palette validated for color-vision deficiency on the dark card surface. Color
  follows the API, never its rank.
- Status (settled / settling / failed) always pairs an icon with a label.
