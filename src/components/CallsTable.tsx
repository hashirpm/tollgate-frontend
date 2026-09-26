import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Call } from "@/lib/api";
import { basescanTx, dateTime, shortAddr, usdc } from "@/lib/format";
import { PayerCell } from "./FeedList";
import { CallStatusBadge } from "./StatusBadge";

const COLS = "grid-cols-[120px_minmax(150px,1.3fr)_minmax(130px,1fr)_90px_minmax(170px,1fr)_130px]";

/** Full-history table for the Payments page. */
export function CallsTable({ rows }: { rows: Call[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px]">
        <div className={`thead-row ${COLS}`}>
          <div>Time</div>
          <div>Listing</div>
          <div>Buyer</div>
          <div className="text-right">Amount</div>
          <div>Status</div>
          <div className="text-right">Tx</div>
        </div>
        {rows.map((r) => (
          <div key={r.id} className={`trow ${COLS}`}>
            <div className="num text-xs text-ink-2">{dateTime(r.t)}</div>
            <Link href={`/endpoints/${r.endpointId}`} className="truncate font-medium hover:underline">
              {r.endpointName}
            </Link>
            <PayerCell payer={r.payer} verdict={r.payerVerdict} />
            <div className={`num text-right ${r.status === "settled" ? "text-ink" : "text-ink-3 line-through"}`}>{usdc(r.amountAtomic)}</div>
            <div>
              <CallStatusBadge status={r.status} />
              {r.status === "failed_upstream" && r.upstreamStatus != null && (
                <div className="mt-0.5 text-[11px] text-ink-3">upstream {r.upstreamStatus}</div>
              )}
            </div>
            <div className="text-right">
              {r.txHash ? (
                <a href={basescanTx(r.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-ink-2 hover:text-ink hover:underline">
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
  );
}
