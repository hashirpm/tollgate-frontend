"use client";

import { Droplets, ExternalLink, ListChecks, ShieldCheck } from "lucide-react";
import { AddToClaudeButton } from "@/components/AddToClaude";
import { EnsName } from "@/components/Ens";
import { CodeBlock } from "@/components/CopyButton";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { useCatalog } from "@/hooks/useEndpoints";
import { CLAUDE_CODE_ADD, INTERCEPTA_URL, MCP_URL, USDC_FAUCET } from "@/lib/config";
import { usd } from "@/lib/format";

// The hosted MCP server (mcp/ in the gateway repo): Claude connects over
// Streamable HTTP, the user signs in with Privy, and payments come from their
// own embedded wallet with per-call and daily caps enforced on the server.

const TOOLS = [
  { name: "list_paid_apis", desc: "Browse what’s for sale here: name, price, example request and the seller’s ENS name." },
  { name: "paid_fetch", desc: "Call one, paying the listed price in USDC. Screened first; a failed call isn’t charged." },
  { name: "screen_counterparty", desc: "Check an address or token with Intercepta before trusting it." },
  { name: "wallet_status", desc: "Your buyer wallet’s address, USDC balance and how much of its budget is used." },
];

const PROMPTS = ["What paid APIs are on Tollgate?", "What’s my Tollgate wallet status?", "Use a Tollgate API to …, and show me what it cost."];

export function ClaudePage() {
  const catalog = useCatalog();

  return (
    <>
      <PageHeader title="Use with Claude" sub="Connect Claude and it can find and buy leftover credits listed here, paying per call from its own wallet." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <section className="card card-pad space-y-4">
            <Step n={1} title="Add Tollgate to Claude" />
            <div className="flex flex-wrap items-center gap-3">
              <AddToClaudeButton className="h-11 rounded-xl px-5 text-sm" />
              <p className="max-w-md text-sm text-ink-2">
                Opens claude.ai with Tollgate filled in: click <span className="font-medium text-ink">Add</span>. No dialog? Go to{" "}
                <span className="font-medium text-ink">Customize → Connectors → Add custom connector</span> and paste the server URL.
              </p>
            </div>
            <CodeBlock title="Server URL" code={MCP_URL} />
            <p className="text-sm text-ink-2">
              In Claude Code, add it from the terminal, then run <span className="font-mono text-[13px]">/mcp</span> to sign in:
            </p>
            <CodeBlock title="Terminal" code={CLAUDE_CODE_ADD} />
          </section>

          <section className="card card-pad">
            <Step n={2} title="Sign in and fund your buyer wallet" />
            <p className="mt-2 text-sm text-ink-2">
              The first time Claude connects, you sign in with Privy and get a wallet of your own. Tollgate can only use it to pay for calls in USDC on
              Base Sepolia. Ask Claude for your <span className="font-mono text-[13px]">wallet_status</span> to get its address, then send it testnet
              USDC from Circle’s faucet.
            </p>
            <a href={USDC_FAUCET} target="_blank" rel="noreferrer" className="btn btn-primary mt-4">
              <Droplets className="size-4" /> Get testnet USDC <ExternalLink className="size-3.5" />
            </a>
          </section>

          <section className="card card-pad">
            <Step n={3} title="Ask Claude to buy" />
            <ul className="mt-3 flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <li key={p} className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-sm">
                  “{p}”
                </li>
              ))}
            </ul>
            <dl className="mt-4 divide-y divide-line">
              {TOOLS.map((t) => (
                <div key={t.name} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                  <dt className="font-mono text-[13px]">{t.name}</dt>
                  <dd className="text-sm text-ink-2">{t.desc}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-good/10 p-3.5 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good-text" />
              <span className="text-ink-2">
                Every payment is screened by{" "}
                <a href={INTERCEPTA_URL} target="_blank" rel="noreferrer" className="font-medium text-ink hover:underline">
                  Intercepta
                </a>{" "}
                before it’s signed, and capped per call and per day on the server. Claude never pays more than the listed price.
              </span>
            </div>
          </section>
        </div>

        <aside className="card overflow-hidden xl:self-start">
          <div className="flex items-center justify-between p-5 sm:p-6">
            <div>
              <div className="card-title">What Claude sees</div>
              <div className="card-cap mt-0.5">
                live from <span className="font-mono">/catalog</span>
              </div>
            </div>
            <ListChecks className="size-5 text-ink-3" />
          </div>
          {catalog.isPending ? (
            <div className="space-y-3 px-6 pb-6">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : catalog.error ? (
            <div className="px-6 pb-6">
              <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
            </div>
          ) : catalog.data.length === 0 ? (
            <EmptyState title="Nothing listed yet">Listings appear here once they pass their test and go live.</EmptyState>
          ) : (
            <ul>
              {catalog.data.map((c) => (
                <li key={c.id || c.url} className="border-t border-line px-5 py-4 sm:px-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{c.name}</span>
                    {c.priceUsd != null && <span className="num shrink-0 text-sm">{usd(c.priceUsd)}</span>}
                  </div>
                  {c.ensName && <EnsName name={c.ensName} size="sm" className="mt-0.5" />}
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{c.description}</p>}
                  <div className="mt-1.5 truncate font-mono text-[11px] text-ink-3">
                    {c.method} {c.url}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-7 place-items-center rounded-full bg-lime text-xs font-semibold text-lime-ink">{n}</span>
      <h2 className="card-title">{title}</h2>
    </div>
  );
}
