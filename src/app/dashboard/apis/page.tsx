import { ExternalLink } from "lucide-react";
import { ConnectApiCard } from "@/components/connect-api-card";
import { TestBuyerButton } from "@/components/test-buyer-button";
import { Avatar, ChainBadge, Delta, PageHeader, Sparkline } from "@/components/ui";
import { getAccount, getApiStats, getLanes, getPolicies, NOW } from "@/lib/data";
import { ago, hostOf, laneColor, usd } from "@/lib/format";

export const metadata = { title: "APIs · x402 Maker" };

export default async function ApisPage() {
  const [account, stats, lanes, policies] = await Promise.all([getAccount(), getApiStats(), getLanes(), getPolicies()]);
  const laneNames = lanes.map((l) => l.name);
  const total = stats.reduce((s, a) => s + a.income, 0);
  const calls = stats.reduce((s, a) => s + a.requests, 0);

  return (
    <>
      <PageHeader title="Your x402 APIs" sub="The APIs you've monetized with x402, and what each one earns.">
        <div className="card flex items-center gap-4 rounded-full px-5 py-2.5">
          <div className="text-xs text-ink-3">Total income</div>
          <div className="num text-lg font-semibold">{usd(total)}</div>
          <div className="num text-xs text-ink-3">{calls.toLocaleString()} paid calls</div>
        </div>
      </PageHeader>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {stats.map((a) => {
          const policy = policies[a.lane.name] ?? {};
          const color = laneColor(laneNames, a.lane.name);
          const tags = [
            policy.humanVerifiedOnly && `World ID · bots ${policy.botMultiplier ?? 10}×`,
            policy.streaming && "Streaming",
            policy.dynamicPricing && "Dynamic pricing",
          ].filter(Boolean) as string[];
          return (
            <article key={a.lane.name} className="card card-pad flex flex-col">
              <div className="flex items-start gap-3">
                <Avatar seed={a.lane.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{a.lane.name}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-good/15 px-2 py-0.5 text-[11px] text-good-text">
                      <span className="size-1.5 rounded-full bg-good" /> live
                    </span>
                  </div>
                  <a
                    href={a.lane.upstream}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-ink-3 hover:text-ink-2"
                  >
                    {hostOf(a.lane.upstream)} <ExternalLink className="size-3 shrink-0" />
                  </a>
                </div>
                <ChainBadge chain={a.lane.chain} />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <Metric label="Income" value={usd(a.income)} strong />
                <Metric label="Calls" value={a.requests.toLocaleString()} />
                <Metric label="Price / call" value={usd(a.lane.price, 3)} />
              </div>

              <div className="mt-5 rounded-2xl bg-surface-2 p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-ink-3">Income, last 14 days</span>
                  <Delta value={a.delta} />
                </div>
                <Sparkline data={a.trend} color={color} height={52} />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {tags.length ? (
                  tags.map((t) => (
                    <span key={t} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-2">
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-ink-3">No pricing rules</span>
                )}
                <div className="ml-auto flex items-center gap-3">
                  {a.lastT && <span className="text-xs text-ink-3">last call {ago(a.lastT, NOW)}</span>}
                  <TestBuyerButton lane={a.lane.name} variant="ghost" label="Test buyer" />
                </div>
              </div>

              <div className="mt-4 truncate rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-[12px] text-ink-3">
                <span className="text-ink-2">{a.lane.sampleMethod ?? "GET"}</span> localhost:{a.lane.port}
                {a.lane.sample}
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-4">
        <ConnectApiCard wallet={account.addr} />
      </section>
    </>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`num mt-1 ${strong ? "text-xl font-semibold" : "text-lg"} tracking-tight`}>{value}</div>
    </div>
  );
}
