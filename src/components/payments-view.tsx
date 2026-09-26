"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { usd } from "@/lib/format";
import type { Chain, Payment } from "@/lib/types";
import { PaymentsTable } from "./payments-table";

type Filter = "all" | "settled" | "failed" | "bot";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "settled", label: "Settled" },
  { id: "failed", label: "Failed" },
  { id: "bot", label: "Bots" },
];
const PAGE = 25;

export function PaymentsView({
  payments,
  now,
  lanes,
  chains,
}: {
  payments: Payment[];
  now: number;
  lanes: string[];
  chains: Record<string, Chain>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [lane, setLane] = useState<string>("all");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);

  const scoped = useMemo(() => (lane === "all" ? payments : payments.filter((p) => p.lane === lane)), [payments, lane]);
  const counts = useMemo(
    () => ({
      all: scoped.length,
      settled: scoped.filter((p) => p.status === "settled").length,
      failed: scoped.filter((p) => p.status === "failed").length,
      bot: scoped.filter((p) => p.tier === "bot").length,
    }),
    [scoped],
  );
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scoped.filter((p) => {
      if (filter === "settled" && p.status !== "settled") return false;
      if (filter === "failed" && p.status !== "failed") return false;
      if (filter === "bot" && p.tier !== "bot") return false;
      if (!needle) return true;
      return p.from.toLowerCase().includes(needle) || p.path.includes(needle) || p.lane.includes(needle);
    });
  }, [scoped, filter, q]);
  const settledIncome = rows.reduce((s, p) => s + (p.status === "settled" ? p.amount : 0), 0);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} data-active={filter === f.id} onClick={() => (setFilter(f.id), setShown(PAGE))} className="chip">
              {f.label}
              <span className="num opacity-60">{counts[f.id].toLocaleString()}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={lane}
            onChange={(e) => (setLane(e.target.value), setShown(PAGE))}
            className="input h-9 w-full appearance-none pr-8 sm:w-44"
            aria-label="Filter by API"
          >
            <option value="all">All APIs</option>
            {lanes.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <label className="relative sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
            <input className="input h-9 pl-10" placeholder="Payer, endpoint…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border-t border-line p-10 text-center text-sm text-ink-2">No payments match this view.</div>
      ) : (
        <PaymentsTable rows={rows.slice(0, shown)} now={now} lanes={lanes} chains={chains} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 text-xs text-ink-3 sm:px-6">
        <span className="num">
          Showing {Math.min(shown, rows.length).toLocaleString()} of {rows.length.toLocaleString()}
        </span>
        {shown < rows.length && (
          <button className="btn btn-ghost h-8 text-xs" onClick={() => setShown((s) => s + PAGE * 2)}>
            Load more
          </button>
        )}
        <span>
          Settled in view <span className="num ml-1 text-sm font-medium text-ink">{usd(settledIncome)}</span>
        </span>
      </div>
    </div>
  );
}
