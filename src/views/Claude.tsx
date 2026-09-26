"use client";

import { Droplets, ExternalLink, Info, ListChecks } from "lucide-react";
import { EnsName } from "@/components/Ens";
import { CodeBlock } from "@/components/CopyButton";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { useCatalog } from "@/hooks/useEndpoints";
import { MCP_COMMAND, MCP_SERVER_NAME, USDC_FAUCET } from "@/lib/config";
import { usd } from "@/lib/format";

const ENV = [
  { name: "GATEWAY_URL", example: "", desc: "This gateway. Already filled in above." },
  { name: "BUYER_PRIVATE_KEY", example: "0x…", desc: "Key of the wallet that pays. Use a throwaway testnet wallet funded with Base Sepolia USDC." },
  { name: "MAX_PER_CALL_USD", example: "0.10", desc: "Refuse any single call priced above this." },
  { name: "SESSION_BUDGET_USD", example: "5", desc: "Stop paying once this much is spent in one session." },
];

export function ClaudePage() {
  const catalog = useCatalog();
  const origin = location.origin;
  const cmd = MCP_COMMAND ?? "<mcp-server-command>";
  const [bin, ...args] = cmd.split(/\s+/);
  const env = ENV.map((e) => [e.name, e.name === "GATEWAY_URL" ? origin : e.example] as const);

  const addCmd = [`claude mcp add ${MCP_SERVER_NAME}`, ...env.map(([k, v]) => `  -e ${k}=${v}`), `  -- ${cmd}`].join(" \\\n");
  const mcpJson = JSON.stringify(
    { mcpServers: { [MCP_SERVER_NAME]: { command: bin, args, env: Object.fromEntries(env) } } },
    null,
    2,
  );

  return (
    <>
      <PageHeader title="Use with Claude" sub="Give Claude a wallet and it can find and buy leftover credits listed on this gateway, one call at a time." />

      {!MCP_COMMAND && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-warn-text" />
          <span>
            The MCP server command isn’t configured yet. Set <span className="font-mono">NEXT_PUBLIC_MCP_COMMAND</span> at build time and the snippets below fill in.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <section className="card card-pad space-y-4">
            <Step n={1} title="Add the MCP server to Claude Code" />
            <CodeBlock title="Terminal" code={addCmd} />
            <p className="text-sm text-ink-2">Or commit it to a project so everyone on the team gets it:</p>
            <CodeBlock title=".mcp.json" code={mcpJson} />
          </section>

          <section className="card card-pad">
            <Step n={2} title="Environment" />
            <dl className="mt-4 divide-y divide-line">
              {ENV.map((e) => (
                <div key={e.name} className="grid gap-1 py-3 sm:grid-cols-[200px_1fr] sm:gap-4">
                  <dt className="font-mono text-[13px]">{e.name}</dt>
                  <dd className="text-sm text-ink-2">{e.desc}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card card-pad">
            <Step n={3} title="Fund the buyer wallet" />
            <p className="mt-2 text-sm text-ink-2">Claude pays in USDC on Base Sepolia. Circle’s faucet sends free testnet USDC.</p>
            <a href={USDC_FAUCET} target="_blank" rel="noreferrer" className="btn btn-primary mt-4">
              <Droplets className="size-4" /> Get testnet USDC <ExternalLink className="size-3.5" />
            </a>
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
