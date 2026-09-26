"use client";

import { Receipt, ShieldCheck, ShieldX, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CallsTable } from "@/components/CallsTable";
import { ScreeningsTable } from "@/components/Screening";
import { EmptyState, ErrorState, PageHeader, Skeleton, Spinner } from "@/components/ui";
import { useEndpoints } from "@/hooks/useEndpoints";
import { usePayments } from "@/hooks/useFeed";
import { useReconcile } from "@/hooks/useOnchain";
import { useScreenings } from "@/hooks/useScreening";
import type { CallStatus } from "@/lib/api";
import { usdc } from "@/lib/format";

const STATUS: { id: CallStatus | undefined; label: string }[] = [
  { id: undefined, label: "All" },
  { id: "settled", label: "Settled" },
  { id: "failed_upstream", label: "Provider error" },
];

export function PaymentsPage() {
  const [endpointId, setEndpointId] = useState<string>("");
  const [status, setStatus] = useState<CallStatus | undefined>(undefined);
  const [blocked, setBlocked] = useState(false);
  // the Action center links here with ?verification=unverified
  const [unverified, setUnverified] = useState(useSearchParams().get("verification") === "unverified");
  const screenings = useScreenings("block");
  const blockedCount = screenings.data?.pages[0]?.blocked30d ?? 0;
  const reconcile = useReconcile("24h");
  const onchainOn = reconcile.data ? reconcile.data.status !== "off" : unverified;
  const unbackedCount = reconcile.data ? reconcile.data.counts.unverified + reconcile.data.counts.mismatch : 0;
  const endpoints = useEndpoints();
  const pages = usePayments({ endpointId: endpointId || undefined, status: unverified ? undefined : status, unverified });
  const rows = pages.data?.pages.flat() ?? [];
  const settled = rows.reduce((s, r) => (r.status === "settled" ? s + r.amountAtomic : s), 0n);

  return (
    <>
      <PageHeader title="Payments" sub="Every call agents bought from your credits. Buyers and transactions link to BaseScan." />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex flex-wrap gap-2">
            {STATUS.map((s) => (
              <button
                key={s.label}
                className="chip"
                data-active={!blocked && !unverified && status === s.id}
                onClick={() => {
                  setBlocked(false);
                  setUnverified(false);
                  setStatus(s.id);
                }}
              >
                {s.label}
              </button>
            ))}
            {onchainOn && (
              <button
                className="chip gap-1.5"
                data-active={!blocked && unverified}
                onClick={() => {
                  setBlocked(false);
                  setUnverified(true);
                }}
                title="Settled payments with no matching USDC transfer onchain, or a different amount"
              >
                <TriangleAlert className="size-3.5" /> Not onchain
                {unbackedCount > 0 && <span className="num rounded-full bg-bad/10 px-1.5 text-[11px] text-bad-text">{unbackedCount}</span>}
              </button>
            )}
            <button className="chip gap-1.5" data-active={blocked} onClick={() => setBlocked(true)}>
              <ShieldX className="size-3.5" /> Blocked by Intercepta
              {blockedCount > 0 && <span className="num rounded-full bg-bad/10 px-1.5 text-[11px] text-bad-text">{blockedCount}</span>}
            </button>
          </div>
          {!blocked && (
          <select className="input h-9 w-full sm:w-56" value={endpointId} onChange={(e) => setEndpointId(e.target.value)} aria-label="Filter by listing">
            <option value="">All listings</option>
            {endpoints.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          )}
        </div>

        {blocked ? (
          <BlockedList q={screenings} />
        ) : pages.isPending ? (
          <div className="space-y-3 px-6 pb-6">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : pages.error ? (
          <div className="px-6 pb-6">
            <ErrorState error={pages.error} onRetry={() => pages.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Receipt className="size-5" />} title={unverified ? "Nothing missing onchain" : "No calls match"}>
            {unverified
              ? "Every settled payment checked so far has a matching USDC transfer onchain."
              : endpointId || status
                ? "Try clearing the filters."
                : "Sales show up here once agents start buying your credits."}
          </EmptyState>
        ) : (
          <CallsTable rows={rows} />
        )}

        {!blocked && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-xs text-ink-3 sm:px-6">
            <span className="num">{rows.length.toLocaleString()} calls loaded</span>
            {pages.hasNextPage ? (
              <button className="btn btn-ghost btn-sm" onClick={() => pages.fetchNextPage()} disabled={pages.isFetchingNextPage}>
                {pages.isFetchingNextPage && <Spinner />}
                Load older
              </button>
            ) : (
              <span>That’s everything</span>
            )}
            <span>
              Settled in view <span className="num ml-1 text-sm font-medium text-ink">{usdc(settled)}</span>
            </span>
          </div>
        )}
      </div>
    </>
  );
}

function BlockedList({ q }: { q: ReturnType<typeof useScreenings> }) {
  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];
  const enabled = q.data?.pages[0]?.enabled ?? true;
  if (q.isPending) {
    return (
      <div className="space-y-3 px-6 pb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="px-6 pb-6">
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  }
  if (!rows.length) {
    return (
      <EmptyState icon={<ShieldCheck className="size-5" />} title={enabled ? "No blocked payers" : "Screening is off"}>
        {enabled
          ? "Before accepting a payment, the gateway checks the payer with Intercepta. Sanctioned or scam wallets are refused and listed here."
          : "Add an Intercepta API key to the gateway to screen payers before accepting their money."}
      </EmptyState>
    );
  }
  return (
    <>
      <ScreeningsTable rows={rows} />
      <div className="flex items-center justify-between border-t border-line px-5 py-4 text-xs text-ink-3 sm:px-6">
        <span>Refused before settlement, so no USDC moved.</span>
        {q.hasNextPage && (
          <button className="btn btn-ghost btn-sm" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
            {q.isFetchingNextPage && <Spinner />}
            Load older
          </button>
        )}
      </div>
    </>
  );
}
