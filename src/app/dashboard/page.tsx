import { ArrowRight, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { IncomeDonut, RevenueChart } from "@/components/charts";
import { ConnectApiCard } from "@/components/connect-api-card";
import { PaymentsTable } from "@/components/payments-table";
import { TestBuyerButton } from "@/components/test-buyer-button";
import { Avatar, Delta, LiveDot, PageHeader, Sparkline } from "@/components/ui";
import { getAccount, getAnalytics, getApiStats, getDailySeries, getKpis, getLanes, getPayments, NOW } from "@/lib/data";
import { CHAIN_LABEL, compact, usd } from "@/lib/format";

export default async function OverviewPage() {
  const [account, lanes, kpis, series, apiStats, recent, analytics] = await Promise.all([
    getAccount(),
    getLanes(),
    getKpis(7),
    getDailySeries(30),
    getApiStats(),
    getPayments({ limit: 6 }),
    getAnalytics(),
  ]);
  const laneNames = lanes.map((l) => l.name);
  const chains = Object.fromEntries(lanes.map((l) => [l.name, l.chain]));
  const humanShare = analytics.totalRequests ? (analytics.byTier.human / analytics.totalRequests) * 100 : 0;
  const chainSet = [...new Set(lanes.map((l) => l.chain))];

  return (
    <>
      <PageHeader
        title="Good afternoon"
        sub={
          <span className="inline-flex items-center gap-2">
            <LiveDot /> Live traffic and income across your x402-metered APIs.
          </span>
        }
      >
        <Link href="/dashboard/payments" className="btn btn-ghost">
          All payments
        </Link>
        <TestBuyerButton />
      </PageHeader>

      {/* KPI row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Hero tile: solid lime, the one loud element on the page */}
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-lime p-6 text-lime-ink sm:col-span-2 xl:col-span-1">
          <div className="absolute -right-8 -bottom-12 size-40 rounded-full bg-white/25 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <span className="text-sm font-medium">Income · 7d</span>
            <span className="grid size-9 place-items-center rounded-full bg-lime-ink/10">
              <Wallet className="size-4" />
            </span>
          </div>
          <div className="num relative mt-5 text-4xl font-semibold tracking-tight">{usd(kpis.income)}</div>
          <div className="relative mt-2 flex items-center gap-2 text-xs">
            <span className="num rounded-full bg-lime-ink px-2 py-0.5 font-medium text-lime">
              {kpis.incomeDelta >= 0 ? "↑" : "↓"} {Math.abs(kpis.incomeDelta).toFixed(1)}%
            </span>
            <span className="opacity-70">vs previous 7 days</span>
          </div>
          <div className="relative mt-5 flex h-10 items-end gap-1">
            {kpis.incomeTrend.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-[4px] bg-lime-ink/80"
                style={{ height: `${(v / Math.max(...kpis.incomeTrend)) * 100}%` }}
                title={usd(v)}
              />
            ))}
          </div>
        </div>

        <StatTile label="Paid requests · 7d" value={kpis.requests.toLocaleString()} delta={kpis.requestsDelta} trend={kpis.requestTrend} />
        <StatTile label="Avg price / call" value={usd(kpis.avgPrice, 4)} delta={kpis.avgDelta} trend={kpis.avgTrend} color="var(--color-violet)" />

        <div className="card card-pad flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Active APIs</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-good-text">
              <span className="size-1.5 rounded-full bg-good" /> all live
            </span>
          </div>
          <div className="num mt-4 text-3xl font-semibold tracking-tight">{lanes.length}</div>
          <div className="mt-1 text-xs text-ink-3">across {chainSet.map((c) => CHAIN_LABEL[c]).join(", ")}</div>
          <div className="mt-auto flex items-center pt-4">
            {lanes.map((l) => (
              <div key={l.name} className="-ml-2 first:ml-0" title={l.name}>
                <Avatar seed={l.name} size={30} />
              </div>
            ))}
            <Link href="/dashboard/apis" className="ml-auto inline-flex items-center gap-1 text-xs text-ink-2 hover:text-lime">
              Manage <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Charts row */}
      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart series={series} lanes={laneNames} />
        </div>
        <IncomeDonut items={apiStats.map((a) => ({ name: a.lane.name, value: a.income }))} lanes={laneNames} />
      </section>

      {/* Recent + side column */}
      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between p-5 sm:p-6">
            <div>
              <div className="card-title">Recent payments</div>
              <div className="card-cap mt-0.5">streaming from the hub</div>
            </div>
            <Link href="/dashboard/payments" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-lime">
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
          <PaymentsTable rows={recent} now={NOW} lanes={laneNames} chains={chains} compact />
        </div>

        <div className="flex flex-col gap-4">
          <div className="card card-pad">
            <div className="flex items-center justify-between">
              <div className="card-title">Wallet balance</div>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">{account.network}</span>
            </div>
            <div className="num mt-3 text-3xl font-semibold tracking-tight">
              {account.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} <span className="text-ink-3">ℏ</span>
            </div>
            <div className="mt-1 font-mono text-xs text-ink-3">{account.accountId}</div>
            <a
              href={`https://hashscan.io/testnet/account/${account.accountId}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mt-4 h-9 w-full text-[13px]"
            >
              Verify on HashScan
            </a>
          </div>

          <div className="card card-pad">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-violet/15">
                <ShieldCheck className="size-5 text-violet" />
              </span>
              <div>
                <div className="card-title">Human-verified traffic</div>
                <div className="card-cap">World ID callers pay base price</div>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="num text-3xl font-semibold tracking-tight">{humanShare.toFixed(0)}%</span>
              <span className="num text-xs text-ink-3">{compact(analytics.byTier.human)} of {compact(analytics.totalRequests)} calls</span>
            </div>
            {/* human / bot / anon split, 2px gaps between segments */}
            <div className="mt-3 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
              <div className="bg-lime" style={{ width: `${(analytics.byTier.human / analytics.totalRequests) * 100}%` }} />
              <div className="bg-violet" style={{ width: `${(analytics.byTier.bot / analytics.totalRequests) * 100}%` }} />
              <div className="bg-ink-3" style={{ width: `${(analytics.byTier.anon / analytics.totalRequests) * 100}%` }} />
            </div>
            <div className="mt-2.5 flex gap-4 text-xs text-ink-2">
              <Legend color="bg-lime" label="Human" />
              <Legend color="bg-violet" label="Bot" />
              <Legend color="bg-ink-3" label="Anon" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <ConnectApiCard wallet={account.addr} />
      </section>
    </>
  );
}

function StatTile({
  label,
  value,
  delta,
  trend,
  color,
}: {
  label: string;
  value: string;
  delta: number;
  trend: number[];
  color?: string;
}) {
  return (
    <div className="card card-pad flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-2">{label}</span>
        <Delta value={delta} />
      </div>
      <div className="num mt-4 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-ink-3">vs previous 7 days</div>
      <div className="mt-auto pt-4">
        <Sparkline data={trend} color={color} width={240} height={40} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
