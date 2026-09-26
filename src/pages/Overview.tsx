import { AlertTriangle, ArrowRight, Blocks, CircleDollarSign, Plus, Users, Wallet, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { FeedList } from "@/components/FeedList";
import { IncomeChart } from "@/components/IncomeChart";
import { KpiTile } from "@/components/KpiTile";
import { EndpointStatusBadge } from "@/components/StatusBadge";
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton } from "@/components/ui";
import { useEndpoints } from "@/hooks/useEndpoints";
import { useFeed } from "@/hooks/useFeed";
import { type Range, useStats } from "@/hooks/useStats";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useSession } from "@/lib/auth";
import { atomicToUsd, usdc } from "@/lib/format";

export function OverviewPage() {
  const [range, setRange] = useState<Range>("24h");
  const { address } = useSession();
  const stats = useStats(range);
  const balance = useUsdcBalance(address);
  const feed = useFeed({ limit: 20 });
  const endpoints = useEndpoints();

  const s = stats.data;
  const period = range === "24h" ? "last 24h" : "last 30 days";
  const top = [...(endpoints.data ?? [])].sort((a, b) => Number(b.incomeAtomic - a.incomeAtomic)).slice(0, 5);

  return (
    <>
      <PageHeader title="Overview" sub="Paid calls across your endpoints, live.">
        <Link to="/endpoints/new" className="btn btn-primary">
          <Plus className="size-4" /> Add endpoint
        </Link>
      </PageHeader>

      {stats.error && (
        <div className="mb-4">
          <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="sm:col-span-2 xl:col-span-1">
          <KpiTile
            hero
            label={`Income · ${range}`}
            icon={<CircleDollarSign className="size-4" />}
            value={s ? usdc(s.incomeAtomic, 2) : "—"}
            foot="USDC, settled"
            loading={stats.isPending}
            trend={s?.series.map((p) => atomicToUsd(p.incomeAtomic))}
          />
        </div>
        <KpiTile label="Paid calls" icon={<Zap className="size-4" />} value={s?.paidCalls.toLocaleString() ?? "—"} foot={period} loading={stats.isPending} trend={s?.series.map((p) => p.calls)} />
        <KpiTile
          label="Failed upstream"
          icon={<AlertTriangle className="size-4" />}
          value={s?.failedCalls.toLocaleString() ?? "—"}
          foot="buyers not charged"
          loading={stats.isPending}
        />
        <KpiTile label="Unique payers" icon={<Users className="size-4" />} value={s?.uniquePayers.toLocaleString() ?? "—"} foot={period} loading={stats.isPending} />
        <KpiTile
          label="Wallet balance"
          icon={<Wallet className="size-4" />}
          value={balance.data === undefined ? "—" : usdc(balance.data, 2)}
          foot="USDC · Base Sepolia"
          loading={balance.isPending}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <IncomeChart series={s?.series} range={range} onRange={setRange} loading={stats.isPending} />
        </div>

        <div className="card card-pad flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div className="card-title">Top endpoints</div>
            <Link to="/endpoints" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
              All <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {endpoints.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : endpoints.error ? (
            <ErrorState error={endpoints.error} onRetry={() => endpoints.refetch()} />
          ) : top.length === 0 ? (
            <EmptyState icon={<Blocks className="size-5" />} title="No endpoints yet" action={<Link to="/endpoints/new" className="btn btn-primary btn-sm">Add your first endpoint</Link>} />
          ) : (
            <ul className="-mx-2 space-y-1">
              {top.map((e) => (
                <li key={e.id}>
                  <Link to={`/endpoints/${e.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-surface-2">
                    <Avatar seed={e.id} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.name}</div>
                      <div className="text-xs text-ink-3">{e.calls.toLocaleString()} calls</div>
                    </div>
                    <div className="text-right">
                      <div className="num text-sm">{usdc(e.incomeAtomic, 2)}</div>
                      <div className="mt-0.5">
                        <EndpointStatusBadge status={e.status} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-4">
        <FeedList rows={feed.rows} loading={feed.isPending} error={feed.error} onRetry={() => feed.refetch()} />
      </section>
    </>
  );
}
