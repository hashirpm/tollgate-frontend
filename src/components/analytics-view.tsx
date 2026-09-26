"use client";

import { useState } from "react";
import { compact, usd } from "@/lib/format";
import type { Analytics, Tier } from "@/lib/types";
import { HourBars, ShareBars } from "./charts";
import { Payer } from "./ui";

const TIERS: { id: Tier; label: string; cls: string }[] = [
  { id: "human", label: "Human-verified", cls: "bg-lime" },
  { id: "bot", label: "Bot", cls: "bg-violet" },
  { id: "anon", label: "Anonymous", cls: "bg-ink-3" },
];

export function AnalyticsView({ analytics, lanes }: { analytics: Analytics; lanes: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const s = selected ? analytics.byLane[selected] : analytics;
  const peak = Math.max(...s.byHour);
  const attempts = s.totalRequests + s.failedRequests;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs tracking-wider text-ink-3 uppercase">Showing</span>
        <button className="chip" data-active={selected === null} onClick={() => setSelected(null)}>
          All APIs
        </button>
        {lanes.map((l) => (
          <button key={l} className="chip" data-active={selected === l} onClick={() => setSelected(l)}>
            {l}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Paid requests" value={s.totalRequests.toLocaleString()} />
        <Kpi label="Income" value={usd(s.totalIncome)} />
        <Kpi label="Avg price" value={usd(s.avgPrice, 4)} />
        <Kpi label="Failure rate" value={`${attempts ? ((s.failedRequests / attempts) * 100).toFixed(1) : "0.0"}%`} sub={`${s.failedRequests} rejected`} />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Calls by endpoint" cap={`${s.totalRequests.toLocaleString()} requests`}>
          <ShareBars rows={s.byEndpoint.slice(0, 6).map((e) => ({ key: e.key, label: e.key, value: e.value }))} />
        </Panel>

        <Panel title="Calls by hour of day" cap="UTC">
          <HourBars hours={s.byHour} />
          <div className="mt-4 flex justify-between border-t border-line pt-4 text-xs text-ink-3">
            <span>
              Peak <span className="text-ink">{String(s.byHour.indexOf(peak)).padStart(2, "0")}:00 UTC</span>
            </span>
            <span className="num">{peak} req/hr at peak</span>
          </div>
        </Panel>

        <Panel title="Top countries" cap="demo geo">
          <ShareBars
            color="var(--color-violet)"
            rows={s.byCountry.slice(0, 6).map((c) => ({ key: c.code, label: c.name, value: c.value, icon: c.flag }))}
          />
        </Panel>

        <Panel title="Top payers" cap="by spend">
          <ul className="-mx-2">
            {s.byPayer.slice(0, 6).map((p, i) => (
              <li key={p.payer} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-surface-2">
                <span className="num w-4 text-xs text-ink-3">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Payer id={p.payer} />
                </div>
                <div className="text-right">
                  <div className="num text-sm text-ink">{usd(p.spend)}</div>
                  <div className="num text-xs text-ink-3">{compact(p.calls)} calls</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="mt-4">
        <Panel title="Caller tiers" cap="how callers identified themselves">
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
            {TIERS.map((t) => (
              <div key={t.id} className={t.cls} style={{ width: `${(s.byTier[t.id] / (s.totalRequests || 1)) * 100}%` }} />
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {TIERS.map((t) => (
              <div key={t.id} className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-center gap-2 text-xs text-ink-2">
                  <span className={`size-2.5 rounded-sm ${t.cls}`} />
                  {t.label}
                </div>
                <div className="num mt-2 text-2xl font-semibold">{s.byTier[t.id].toLocaleString()}</div>
                <div className="num text-xs text-ink-3">
                  {((s.byTier[t.id] / (s.totalRequests || 1)) * 100).toFixed(1)}% of paid calls
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card card-pad">
      <div className="text-sm text-ink-2">{label}</div>
      <div className="num mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-3">{sub}</div>}
    </div>
  );
}

function Panel({ title, cap, children }: { title: string; cap?: string; children: React.ReactNode }) {
  return (
    <div className="card card-pad">
      <div className="mb-5 flex items-center justify-between">
        <div className="card-title">{title}</div>
        {cap && <div className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-3">{cap}</div>}
      </div>
      {children}
    </div>
  );
}
