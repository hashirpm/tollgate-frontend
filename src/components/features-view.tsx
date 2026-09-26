"use client";

import { Info, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { usd } from "@/lib/format";
import type { Lane, Policy } from "@/lib/types";

/**
 * Pricing rules per API. State is local for now; when the hub is wired up,
 * `update` should POST the patch to /policy/:lane.
 */
export function FeaturesView({ lanes, initial }: { lanes: Lane[]; initial: Record<string, Policy> }) {
  const [policies, setPolicies] = useState(initial);
  const [laneName, setLaneName] = useState(lanes[0]?.name ?? "");
  const lane = lanes.find((l) => l.name === laneName)!;
  const policy = policies[laneName] ?? {};
  const mult = policy.botMultiplier ?? 10;
  const update = (patch: Partial<Policy>) => setPolicies((p) => ({ ...p, [laneName]: { ...p[laneName], ...patch } }));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs tracking-wider text-ink-3 uppercase">Configuring</span>
        {lanes.map((l) => (
          <button key={l.name} className="chip" data-active={l.name === laneName} onClick={() => setLaneName(l.name)}>
            {l.name}
          </button>
        ))}
      </div>

      <div key={laneName} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* World ID human-verified pricing */}
        <Feature
          icon={<ShieldCheck className="size-5 text-lime" />}
          title="Require human-verified callers"
          desc={
            <>
              Callers proving a unique human with <span className="text-ink">World ID</span> pay your base price. Unverified
              bots pay {mult}× or are refused.
            </>
          }
          on={!!policy.humanVerifiedOnly}
          onChange={(v) => update({ humanVerifiedOnly: v, botMultiplier: mult })}
          className="xl:row-span-2"
        >
          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="grid grid-cols-[1fr_auto] bg-surface-2 px-4 py-2.5 text-xs text-ink-3">
              <span>Caller</span>
              <span>Price / call</span>
            </div>
            <TierRow tag="World ID" tagCls="bg-lime/12 text-lime" name="Human-verified" price={usd(lane.price, 3)} />
            <TierRow
              tag="Anon"
              tagCls="bg-violet/15 text-[#b9b1f5]"
              name="Unverified bot"
              price={policy.humanVerifiedOnly && policy.blockBots ? "blocked" : usd(lane.price * (policy.humanVerifiedOnly ? mult : 1), 3)}
            />
          </div>

          {policy.humanVerifiedOnly && (
            <div className="mt-5 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-ink-2">Bot multiplier</span>
                  <span className="num rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink">{mult}×</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={25}
                  value={mult}
                  onChange={(e) => update({ botMultiplier: Number(e.target.value) })}
                  className="w-full accent-lime"
                  aria-label="Bot price multiplier"
                />
                <div className="mt-1 flex justify-between text-[11px] text-ink-3">
                  <span>2×</span>
                  <span>25×</span>
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface-2 p-4 text-sm">
                <span>
                  <span className="text-ink">Block unverified bots entirely</span>
                  <span className="block text-xs text-ink-3">Answer 402 with no upsell</span>
                </span>
                <Switch on={!!policy.blockBots} onChange={(v) => update({ blockBots: v })} label="Block bots" />
              </label>
            </div>
          )}
        </Feature>

        {/* Streaming */}
        <Feature
          icon={<Zap className="size-5 text-violet" />}
          title="Stream payments"
          desc="Charge continuously for long-running or websocket calls instead of per request. Good for streaming inference and live feeds."
          on={!!policy.streaming}
          onChange={(v) => update({ streaming: v })}
        >
          {policy.streaming && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
              <span className="rounded-full bg-violet/15 px-2.5 py-1 text-xs text-[#b9b1f5]">pay-per-second</span>
              <span className="num font-mono text-ink">{usd(lane.price / 25, 5)} / sec</span>
              <span className="text-xs text-ink-3">settled every 60s</span>
            </div>
          )}
        </Feature>

        {/* Dynamic pricing */}
        <Feature
          icon={<TrendingUp className="size-5 text-[#3987e5]" />}
          title="Dynamic pricing"
          desc="Raise prices automatically when demand spikes, within your floor and ceiling."
          on={!!policy.dynamicPricing}
          onChange={(v) => update({ dynamicPricing: v })}
        >
          {policy.dynamicPricing && (
            <div className="grid grid-cols-2 gap-3">
              <PriceField label="Floor" value={policy.priceFloor ?? lane.price} onChange={(n) => update({ priceFloor: n })} />
              <PriceField label="Ceiling" value={policy.priceCeiling ?? lane.price * 5} onChange={(n) => update({ priceCeiling: n })} />
            </div>
          )}
        </Feature>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" />
        <span>
          Changes are kept in this page for now. Once the hub is connected they POST to{" "}
          <span className="font-mono text-ink">/policy/{laneName}</span> and apply to new requests within ~10 seconds.
        </span>
      </div>
    </>
  );
}

function Feature({
  icon,
  title,
  desc,
  on,
  onChange,
  children,
  className = "",
}: {
  icon: React.ReactNode;
  title: string;
  desc: React.ReactNode;
  on: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card card-pad ${on ? "border-lime/20" : ""} ${className}`}>
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="card-title">{title}</div>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{desc}</p>
        </div>
        <Switch on={on} onChange={onChange} label={title} />
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-lime" : "bg-surface-3"}`}
    >
      <span
        className={`absolute top-1 left-1 size-5 rounded-full transition-transform ${on ? "translate-x-5 bg-lime-ink" : "bg-ink-2"}`}
      />
    </button>
  );
}

function TierRow({ tag, tagCls, name, price }: { tag: string; tagCls: string; name: string; price: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center border-t border-line px-4 py-3 text-sm">
      <span className="flex items-center gap-2.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tagCls}`}>{tag}</span>
        <span className="text-ink-2">{name}</span>
      </span>
      <span className="num font-mono text-ink">{price}</span>
    </div>
  );
}

function PriceField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block rounded-2xl bg-surface-2 p-3">
      <span className="text-xs text-ink-3">{label}</span>
      <span className="mt-1 flex items-center gap-1 font-mono">
        <span className="text-ink-3">$</span>
        <input
          className="num w-full bg-transparent text-lg text-ink outline-none"
          defaultValue={value.toFixed(3)}
          inputMode="decimal"
          onBlur={(e) => onChange(Number(e.target.value) || value)}
        />
      </span>
    </label>
  );
}
