import { ExternalLink } from "lucide-react";
import { ago, CHAIN_LABEL, laneColor, usd } from "@/lib/format";
import type { Chain, Payment } from "@/lib/types";
import { Payer, StatusBadge, TierBadge } from "./ui";

const COLS = "grid-cols-[minmax(200px,1.6fr)_minmax(170px,1.3fr)_90px_90px_130px_120px_72px]";
// Overview card: drop tier + receipt so it fits a two-thirds column.
const COLS_COMPACT = "grid-cols-[minmax(180px,1.5fr)_minmax(150px,1.3fr)_80px_110px_64px]";

export function PaymentsTable({
  rows,
  now,
  lanes,
  chains,
  compact = false,
}: {
  rows: Payment[];
  now: number;
  lanes: string[];
  chains: Record<string, Chain>;
  compact?: boolean;
}) {
  const cols = compact ? COLS_COMPACT : COLS;
  return (
    <div className="overflow-x-auto">
      <div className={compact ? "min-w-[640px]" : "min-w-[920px]"}>
        <div className={`thead-row ${cols}`}>
          <div>Payer</div>
          <div>Endpoint</div>
          <div className="text-right">Amount</div>
          {!compact && <div>Tier</div>}
          <div>Status</div>
          {!compact && <div>Receipt</div>}
          <div className="text-right">Time</div>
        </div>
        {rows.map((p) => (
          <div key={p.reqId} className={`trow ${cols} hover:bg-surface-2/50`}>
            <Payer id={p.from} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-ink-3">
                <span className="size-2 rounded-sm" style={{ background: laneColor(lanes, p.lane) }} />
                {p.lane}
              </div>
              <div className="truncate font-mono text-[13px] text-ink">{p.path}</div>
            </div>
            <div className={`num text-right ${p.status === "failed" ? "text-ink-3 line-through" : "text-ink"}`}>
              {usd(p.amount, p.amount < 0.1 ? 3 : 2)}
            </div>
            {!compact && (
              <div>
                <TierBadge tier={p.tier} />
              </div>
            )}
            <div>
              <StatusBadge p={p} />
            </div>
            {!compact && (
              <div>
                {p.receiptUrl ? (
                  <a
                    href={p.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ink-2 underline-offset-4 hover:text-lime hover:underline"
                  >
                    {CHAIN_LABEL[chains[p.lane]]} <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span className="text-xs text-ink-3">—</span>
                )}
              </div>
            )}
            <div className="num text-right text-xs text-ink-3">{ago(p.t, now)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
