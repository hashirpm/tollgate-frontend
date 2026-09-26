"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Range } from "@/hooks/useStats";
import type { StatsPoint } from "@/lib/api";
import { atomicToUsd, compact, usd } from "@/lib/format";
import { EmptyState, Skeleton } from "./ui";

type Metric = "income" | "calls";
const AXIS = { fill: "var(--color-ink-3)", fontSize: 12 };

const tickFor = (range: Range) => (t: number) =>
  range === "24h"
    ? new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
    : new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * Income or calls over time: one series at a time (never a dual axis).
 * Hourly buckets for 24h, daily for 30d, as the Worker returns them.
 */
export function IncomeChart({
  series,
  range,
  onRange,
  loading,
}: {
  series: StatsPoint[] | undefined;
  range: Range;
  onRange: (r: Range) => void;
  loading?: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("income");
  const data = (series ?? []).map((p) => ({ t: p.t, income: atomicToUsd(p.incomeAtomic), calls: p.calls }));
  const total = data.reduce((s, d) => s + d[metric], 0);
  const fmt = tickFor(range);

  return (
    <div className="card card-pad flex h-full flex-col">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="card-title">{metric === "income" ? "Earned" : "Calls sold"}</div>
          <div className="num mt-1 text-2xl font-semibold tracking-tight">
            {loading ? <Skeleton className="h-8 w-24" /> : metric === "income" ? usd(total) : total.toLocaleString()}
          </div>
          <div className="card-cap mt-0.5">{range === "24h" ? "last 24 hours, hourly" : "last 30 days, daily"}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="seg" role="tablist" aria-label="Metric">
            {(["income", "calls"] as Metric[]).map((m) => (
              <button key={m} role="tab" aria-selected={metric === m} data-active={metric === m} className="seg-btn" onClick={() => setMetric(m)}>
                {m === "income" ? "Earned" : "Calls"}
              </button>
            ))}
          </div>
          <div className="seg" role="tablist" aria-label="Range">
            {(["24h", "30d"] as Range[]).map((r) => (
              <button key={r} role="tab" aria-selected={range === r} data-active={range === r} className="seg-btn" onClick={() => onRange(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <EmptyState title="No sales in this window">Earnings show up here as soon as an agent buys a call.</EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-lime)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--color-lime)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="t" tickFormatter={fmt} tick={AXIS} axisLine={false} tickLine={false} minTickGap={32} tickMargin={10} />
              <YAxis
                tickFormatter={(v: number) => (metric === "income" ? `$${compact(v)}` : compact(v))}
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                width={48}
                allowDecimals={metric === "income"}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-ink-3)", strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as (typeof data)[number];
                  return (
                    <div className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-xs shadow-lg">
                      <div className="mb-1 text-ink-3">
                        {range === "24h"
                          ? new Date(row.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
                          : new Date(row.t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="num text-sm font-semibold text-ink">{usd(row.income)}</div>
                      <div className="num text-ink-2">{row.calls.toLocaleString()} paid calls</div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="var(--color-chart)"
                strokeWidth={2}
                fill="url(#chartFill)"
                isAnimationActive={false}
                activeDot={{ r: 5, stroke: "var(--color-surface)", strokeWidth: 2, fill: "var(--color-chart)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
