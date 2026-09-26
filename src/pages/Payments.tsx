import { Receipt } from "lucide-react";
import { useState } from "react";
import { CallsTable } from "@/components/CallsTable";
import { EmptyState, ErrorState, PageHeader, Skeleton, Spinner } from "@/components/ui";
import { useEndpoints } from "@/hooks/useEndpoints";
import { usePayments } from "@/hooks/useFeed";
import type { CallStatus } from "@/lib/api";
import { usdc } from "@/lib/format";

const STATUS: { id: CallStatus | undefined; label: string }[] = [
  { id: undefined, label: "All" },
  { id: "settled", label: "Settled" },
  { id: "failed_upstream", label: "Failed upstream" },
];

export function PaymentsPage() {
  const [endpointId, setEndpointId] = useState<string>("");
  const [status, setStatus] = useState<CallStatus | undefined>(undefined);
  const endpoints = useEndpoints();
  const pages = usePayments({ endpointId: endpointId || undefined, status });
  const rows = pages.data?.pages.flat() ?? [];
  const settled = rows.reduce((s, r) => (r.status === "settled" ? s + r.amountAtomic : s), 0n);

  return (
    <>
      <PageHeader title="Payments" sub="Every call through the gateway. Payers and transactions link to BaseScan." />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex flex-wrap gap-2">
            {STATUS.map((s) => (
              <button key={s.label} className="chip" data-active={status === s.id} onClick={() => setStatus(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <select className="input h-9 w-full sm:w-56" value={endpointId} onChange={(e) => setEndpointId(e.target.value)} aria-label="Filter by endpoint">
            <option value="">All endpoints</option>
            {endpoints.data?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        {pages.isPending ? (
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
          <EmptyState icon={<Receipt className="size-5" />} title="No calls match">
            {endpointId || status ? "Try clearing the filters." : "Paid calls show up here once buyers start using your endpoints."}
          </EmptyState>
        ) : (
          <CallsTable rows={rows} />
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-xs text-ink-3 sm:px-6">
            <span className="num">{rows.length.toLocaleString()} calls loaded</span>
            {pages.hasNextPage ? (
              <button className="btn btn-ghost btn-sm" onClick={() => pages.fetchNextPage()} disabled={pages.isFetchingNextPage}>
                {pages.isFetchingNextPage && <Spinner />}
                Load older
              </button>
            ) : (
              <span>That's everything</span>
            )}
            <span>
              Settled in view <span className="num ml-1 text-sm font-medium text-ink">{usdc(settled, 2)}</span>
            </span>
          </div>
        )}
      </div>
    </>
  );
}
