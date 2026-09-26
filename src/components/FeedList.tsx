"use client";

import { ExternalLink, Radio } from "lucide-react";
import Link from "next/link";
import type { FeedRow } from "@/hooks/useFeed";
import { useNow } from "@/hooks/useNow";
import { ago, basescanAddress, basescanTx, clock, shortAddr, usdc } from "@/lib/format";
import { CallStatusBadge } from "./StatusBadge";
import { Avatar, EmptyState, ErrorState, LiveDot, Skeleton } from "./ui";

const COLS = "grid-cols-[76px_minmax(140px,1.3fr)_minmax(120px,1fr)_90px_minmax(150px,1fr)_110px]";

/** The live feed: newest first; rows that arrive while you watch flash lime. */
export function FeedList({
  rows,
  loading,
  error,
  onRetry,
  showEndpoint = true,
  title = "Live feed",
}: {
  rows: FeedRow[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  showEndpoint?: boolean;
  title?: string;
}) {
  const now = useNow(5000);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-5 sm:p-6">
        <div>
          <div className="card-title flex items-center gap-2">
            {title} <LiveDot />
          </div>
          <div className="card-cap mt-0.5">last 20 calls · updates every 2s</div>
        </div>
        <Link href="/payments" className="text-sm text-ink-2 hover:text-ink">
          All payments →
        </Link>
      </div>

      {error ? (
        <div className="px-5 pb-5 sm:px-6">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="space-y-3 px-5 pb-6 sm:px-6">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Radio className="size-5" />} title="Waiting for the first paid call">
          Calls appear here within a couple of seconds of a buyer paying.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className={`thead-row ${COLS}`}>
              <div>Time</div>
              <div>{showEndpoint ? "Endpoint" : "Payer"}</div>
              <div>{showEndpoint ? "Payer" : ""}</div>
              <div className="text-right">Amount</div>
              <div>Status</div>
              <div className="text-right">Tx</div>
            </div>
            {rows.map((r) => (
              <div key={r.id} className={`trow ${COLS} ${r.fresh ? "animate-flash" : ""}`}>
                <div className="num text-xs text-ink-2" title={new Date(r.t).toLocaleString()}>
                  {clock(r.t)}
                  <div className="text-[11px] text-ink-3">{ago(r.t, now)}</div>
                </div>
                {showEndpoint ? (
                  <Link href={`/endpoints/${r.endpointId}`} className="truncate font-medium hover:underline">
                    {r.endpointName}
                  </Link>
                ) : (
                  <PayerCell payer={r.payer} />
                )}
                <div className="min-w-0">{showEndpoint && <PayerCell payer={r.payer} />}</div>
                <div className={`num text-right ${r.status === "settled" ? "text-ink" : "text-ink-3 line-through"}`}>{usdc(r.amountAtomic)}</div>
                <CallStatusBadge status={r.status} />
                <div className="text-right">
                  {r.txHash ? (
                    <a href={basescanTx(r.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-2 hover:text-ink hover:underline">
                      {shortAddr(r.txHash)} <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-ink-3">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PayerCell({ payer }: { payer: string }) {
  return (
    <a href={basescanAddress(payer)} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 hover:underline">
      <Avatar seed={payer} size={22} />
      <span className="truncate font-mono text-xs">{shortAddr(payer)}</span>
    </a>
  );
}
