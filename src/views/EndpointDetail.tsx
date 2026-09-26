"use client";

import { AlertTriangle, ArrowLeft, ArrowUpRight, CircleDollarSign, Pause, Pencil, Play, Users, Zap } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CodeBlock, CopyUrl } from "@/components/CopyButton";
import { FeedList } from "@/components/FeedList";
import { IncomeChart } from "@/components/IncomeChart";
import { KpiTile } from "@/components/KpiTile";
import { EndpointStatusBadge } from "@/components/StatusBadge";
import { Avatar, ErrorState, PageHeader, Skeleton, Spinner } from "@/components/ui";
import { useEndpoint, useSetEndpointStatus } from "@/hooks/useEndpoints";
import { useFeed } from "@/hooks/useFeed";
import { type Range, useStats } from "@/hooks/useStats";
import { type Endpoint, paidUrl } from "@/lib/api";
import { MCP_SERVER_NAME } from "@/lib/config";
import { atomicToUsd, usdc } from "@/lib/format";

export function EndpointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const ep = useEndpoint(id);
  const [range, setRange] = useState<Range>("24h");
  const stats = useStats(range, id);
  const feed = useFeed({ endpointId: id, limit: 20 });
  const setStatus = useSetEndpointStatus();

  if (ep.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (ep.error) return <ErrorState error={ep.error} onRetry={() => ep.refetch()} />;
  const e = ep.data;
  const s = stats.data;
  const url = paidUrl(e.id);

  return (
    <>
      <Link href="/endpoints" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Endpoints
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar seed={e.id} size={40} />
            {e.name}
            <EndpointStatusBadge status={e.status} />
          </span>
        }
        sub={e.description || <span className="text-ink-3">No description. Add one so Claude knows when to use this.</span>}
      >
        {e.status === "active" && (
          <button className="btn btn-ghost" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: e.id, status: "paused" })}>
            {setStatus.isPending ? <Spinner /> : <Pause className="size-4" />} Pause
          </button>
        )}
        {e.status === "paused" && (
          <button className="btn btn-ghost" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: e.id, status: "active" })}>
            {setStatus.isPending ? <Spinner /> : <Play className="size-4" />} Activate
          </button>
        )}
        <Link href={`/endpoints/${e.id}/edit`} className={`btn ${e.status === "pending" ? "btn-primary" : "btn-ghost"}`}>
          <Pencil className="size-4" /> {e.status === "pending" ? "Edit and test" : "Edit"}
        </Link>
      </PageHeader>

      {setStatus.error && (
        <div className="mb-4">
          <ErrorState error={setStatus.error} />
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile hero label={`Income · ${range}`} icon={<CircleDollarSign className="size-4" />} value={s ? usdc(s.incomeAtomic) : "—"} foot={`${usdc(e.priceAtomic)} per call`} loading={stats.isPending} trend={s?.series.map((p) => atomicToUsd(p.incomeAtomic))} />
        <KpiTile label="Paid calls" icon={<Zap className="size-4" />} value={s?.paidCalls.toLocaleString() ?? "—"} foot={`${e.calls.toLocaleString()} all time`} loading={stats.isPending} trend={s?.series.map((p) => p.calls)} />
        <KpiTile label="Failed upstream" icon={<AlertTriangle className="size-4" />} value={s?.failedCalls.toLocaleString() ?? "—"} foot="buyers not charged" loading={stats.isPending} />
        <KpiTile label="Unique payers" icon={<Users className="size-4" />} value={s?.uniquePayers.toLocaleString() ?? "—"} foot={range === "24h" ? "last 24h" : "last 30 days"} loading={stats.isPending} />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        <IncomeChart series={s?.series} range={range} onRange={setRange} loading={stats.isPending} />
        <div className="card card-pad space-y-5">
          <div>
            <div className="label">Paid URL</div>
            <CopyUrl url={url} />
            <p className="hint">
              Opened in a browser, it shows a pay page.{" "}
              {e.status === "active" ? (
                <a href={`/pay/${e.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent-text underline-offset-2 hover:underline">
                  Try it <ArrowUpRight className="size-3" />
                </a>
              ) : (
                "Available once the endpoint is active."
              )}
            </p>
          </div>
          <div>
            <div className="label">See the 402 quote</div>
            <CodeBlock title="Terminal" code={curlSnippet(e, url)} />
            <p className="hint">Without payment the gateway answers 402 with the price and where to pay.</p>
          </div>
          <div>
            <div className="label">Call it from Claude</div>
            <CodeBlock title="paid_fetch" code={mcpSnippet(e, url)} />
            <p className="hint">
              Arguments for the <span className="font-mono">paid_fetch</span> tool of the {MCP_SERVER_NAME} MCP server. <Link href="/claude" className="underline">Setup →</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <FeedList title="Recent calls" rows={feed.rows} loading={feed.isPending} error={feed.error} onRetry={() => feed.refetch()} showEndpoint={false} />
      </section>
    </>
  );
}

const withQuery = (url: string, q: string) => (q ? `${url}?${q.replace(/^\?/, "")}` : url);

function curlSnippet(e: Endpoint, url: string): string {
  const target = withQuery(url, e.exampleQuery);
  const parts = [`curl -i -X ${e.method} '${target}'`];
  if (e.exampleBody.trim()) {
    parts.push(`  -H 'content-type: application/json'`);
    parts.push(`  -d '${compactJson(e.exampleBody)}'`);
  }
  return parts.join(" \\\n");
}

function mcpSnippet(e: Endpoint, url: string): string {
  const args: Record<string, unknown> = { url: withQuery(url, e.exampleQuery), method: e.method };
  if (e.exampleBody.trim()) {
    try {
      args.body = JSON.parse(e.exampleBody);
    } catch {
      args.body = e.exampleBody;
    }
  }
  return JSON.stringify({ tool: "paid_fetch", arguments: args }, null, 2);
}

function compactJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s)).replace(/'/g, "'\\''");
  } catch {
    return s.replace(/'/g, "'\\''");
  }
}
