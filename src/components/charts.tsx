"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, dayLabel, laneColor, usd } from "@/lib/format";
import type { DailyPoint } from "@/lib/types";

const AXIS = { fill: "var(--color-ink-3)", fontSize: 12 };

type Range = 7 | 14 | 30;
type Mode = "total" | "lane";

function ChartTooltip({
  active,
  payload,
  label,
  lanes,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string; payload: Record<string, number> }[];
  label?: number;
  lanes: string[];
}) {
  if (!active || !payload?.length || label == null) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-44 rounded-2xl border border-line-strong bg-surface-2/95 px-3.5 py-3 text-xs shadow-2xl backdrop-blur">
      <div className="mb-2 text-ink-3">{dayLabel(label)}</div>
      {payload.length === 1 ? (
        <>
          <div className="num text-base font-semibold text-ink">{usd(row.income)}</div>
          <div className="num mt-0.5 text-ink-2">{row.requests.toLocaleString()} paid calls</div>
        </>
      ) : (
        <div className="space-y-1.5">
          {[...payload].reverse().map((p) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="size-2 rounded-full" style={{ background: p.color }} />
                {p.dataKey}
              </span>
              <span className="num text-ink">{usd(p.value)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-1.5 text-ink">
            <span>Total</span>
            <span className="num font-medium">{usd(lanes.reduce((s, l) => s + (row[l] ?? 0), 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Income over time. One lime series by default; "By API" stacks the lanes. */
export function RevenueChart({ series, lanes }: { series: DailyPoint[]; lanes: string[] }) {
  const [range, setRange] = useState<Range>(30);
  const [mode, setMode] = useState<Mode>("total");

  const data = useMemo(
    () => series.slice(-range).map((d) => ({ day: d.day, income: d.income, requests: d.requests, ...d.byLane })),
    [series, range],
  );
  const total = data.reduce((s, d) => s + d.income, 0);

  return (
    <div className="card card-pad flex h-full flex-col">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="card-title">Income</div>
          <div className="num mt-1 text-2xl font-semibold tracking-tight">{usd(total)}</div>
          <div className="card-cap mt-0.5">last {range} days, settled</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full bg-surface-2 p-1">
            {(["total", "lane"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`h-7 rounded-full px-3 text-xs transition-colors ${mode === m ? "bg-surface-3 text-ink" : "text-ink-3 hover:text-ink"}`}
              >
                {m === "total" ? "Total" : "By API"}
              </button>
            ))}
          </div>
          <div className="flex rounded-full bg-surface-2 p-1">
            {([7, 14, 30] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`h-7 rounded-full px-3 text-xs transition-colors ${range === r ? "bg-lime text-lime-ink font-medium" : "text-ink-3 hover:text-ink"}`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "lane" && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {lanes.map((l) => (
            <span key={l} className="flex items-center gap-2 text-xs text-ink-2">
              <span className="size-2.5 rounded-sm" style={{ background: laneColor(lanes, l) }} />
              {l}
            </span>
          ))}
        </div>
      )}

      <div className="min-h-[240px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-lime)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-lime)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.05)" />
            <XAxis
              dataKey="day"
              tickFormatter={dayLabel}
              tick={AXIS}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              tickMargin={10}
            />
            <YAxis tickFormatter={(v: number) => `$${compact(v)}`} tick={AXIS} axisLine={false} tickLine={false} width={52} />
            <Tooltip
              cursor={{ stroke: "rgb(255 255 255 / 0.25)", strokeDasharray: "4 4" }}
              content={(p) => <ChartTooltip {...(p as object)} lanes={lanes} />}
            />
            {mode === "total" ? (
              <Area
                type="monotone"
                dataKey="income"
                stroke="var(--color-lime)"
                strokeWidth={2}
                fill="url(#incomeFill)"
                isAnimationActive={false}
                activeDot={{ r: 5, stroke: "var(--color-surface)", strokeWidth: 2, fill: "var(--color-lime)" }}
              />
            ) : (
              lanes.map((l) => (
                <Area
                  key={l}
                  type="monotone"
                  dataKey={l}
                  stackId="lanes"
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                  fill={laneColor(lanes, l)}
                  fillOpacity={0.9}
                  isAnimationActive={false}
                  activeDot={{ r: 4, stroke: "var(--color-surface)", strokeWidth: 2, fill: laneColor(lanes, l) }}
                />
              ))
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Share of income per API. Direct-labeled legend beside it carries identity. */
export function IncomeDonut({ items, lanes }: { items: { name: string; value: number }[]; lanes: string[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = items.reduce((s, i) => s + i.value, 0);
  const focused = items.find((i) => i.name === hover);

  return (
    <div className="card card-pad flex h-full flex-col">
      <div className="card-title">Income by API</div>
      <div className="card-cap mt-0.5">all time</div>
      <div className="relative mx-auto my-4 size-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              nameKey="name"
              innerRadius={68}
              outerRadius={96}
              stroke="var(--color-surface)"
              strokeWidth={3}
              cornerRadius={6}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
              onMouseEnter={(_, i) => setHover(items[i].name)}
              onMouseLeave={() => setHover(null)}
            >
              {items.map((i) => (
                <Cell
                  key={i.name}
                  fill={laneColor(lanes, i.name)}
                  opacity={hover && hover !== i.name ? 0.35 : 1}
                  style={{ transition: "opacity .15s", outline: "none" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-xs text-ink-3">{focused ? focused.name : "Total"}</div>
            <div className="num text-xl font-semibold">{usd(focused ? focused.value : total)}</div>
            {focused && <div className="num text-xs text-ink-2">{((focused.value / total) * 100).toFixed(1)}%</div>}
          </div>
        </div>
      </div>
      <ul className="mt-auto space-y-2.5">
        {items.map((i) => (
          <li
            key={i.name}
            onMouseEnter={() => setHover(i.name)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2.5 text-ink-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: laneColor(lanes, i.name) }} />
              <span className="truncate">{i.name}</span>
            </span>
            <span className="num flex items-baseline gap-2">
              <span className="text-ink">{usd(i.value)}</span>
              <span className="w-11 text-right text-xs text-ink-3">{((i.value / total) * 100).toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 24 hour-of-day buckets. Hover any bar for its count; the peak is lime. */
export function HourBars({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(max);
  return (
    <div>
      <div className="flex h-44 items-end gap-[3px]">
        {hours.map((v, h) => (
          <div key={h} className="group relative flex h-full flex-1 items-end">
            <div
              className={`w-full rounded-t-[4px] transition-colors ${h === peak ? "bg-lime" : "bg-surface-3 group-hover:bg-ink-3"}`}
              style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg border border-line-strong bg-surface-2 px-2 py-1 text-[11px] whitespace-nowrap group-hover:block">
              <span className="text-ink-3">{String(h).padStart(2, "0")}:00</span> <span className="num text-ink">{v}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-3">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </div>
  );
}

/** Horizontal share bars for one dimension (endpoints, countries). */
export function ShareBars({
  rows,
  color = "var(--color-lime)",
}: {
  rows: { key: string; label: string; value: number; icon?: string }[];
  color?: string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${r.value.toLocaleString()} calls`}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-ink-2">
              {r.icon && <span aria-hidden>{r.icon}</span>}
              <span className="truncate">{r.label}</span>
            </span>
            <span className="num flex items-baseline gap-2">
              <span className="text-ink">{r.value.toLocaleString()}</span>
              <span className="w-9 text-right text-xs text-ink-3">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
