import { ArrowDownRight, ArrowUpRight, CircleCheck, CircleX, Loader } from "lucide-react";
import type { ReactNode } from "react";
import { avatarGradient, CHAIN_LABEL, isAgent, REASON_LABEL, shortAddr } from "@/lib/format";
import type { Chain, Payment, Tier } from "@/lib/types";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="grid size-9 place-items-center rounded-xl bg-lime text-lime-ink">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">x402 Maker</div>
        <div className="text-[11px] text-ink-3">machine payments</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-2">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Avatar({ seed, size = 32 }: { seed: string; size?: number }) {
  return (
    <div
      aria-hidden
      className="shrink-0 rounded-full ring-2 ring-surface"
      style={{ width: size, height: size, background: avatarGradient(seed) }}
    />
  );
}

export function Payer({ id }: { id: string }) {
  const agent = isAgent(id);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar seed={id} />
      <div className="min-w-0">
        <div className={`truncate text-sm text-ink ${agent ? "" : "font-mono text-[13px]"}`}>{agent ? id : shortAddr(id)}</div>
        <div className="text-xs text-ink-3">{agent ? "AI agent" : "wallet"}</div>
      </div>
    </div>
  );
}

const CHAIN_DOT: Record<Chain, string> = {
  hedera: "bg-ink",
  base: "bg-[#3987e5]",
  solana: "bg-[#9085e9]",
};

export function ChainBadge({ chain }: { chain: Chain }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink-2">
      <span className={`size-1.5 rounded-full ${CHAIN_DOT[chain]}`} />
      {CHAIN_LABEL[chain]}
    </span>
  );
}

const TIER_STYLE: Record<Tier, { label: string; cls: string }> = {
  human: { label: "Human ✓", cls: "bg-lime/12 text-lime" },
  bot: { label: "Bot", cls: "bg-violet/15 text-[#b9b1f5]" },
  anon: { label: "Anon", cls: "bg-surface-3 text-ink-2" },
};

export function TierBadge({ tier }: { tier: Tier }) {
  const s = TIER_STYLE[tier];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

/** Status never rides on color alone: icon + label, always. */
export function StatusBadge({ p }: { p: Pick<Payment, "status" | "reason"> }) {
  if (p.status === "settled")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-good-text">
        <CircleCheck className="size-3.5" /> Settled
      </span>
    );
  if (p.status === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-warn">
        <Loader className="size-3.5 animate-spin" /> Settling…
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-bad-text" title={p.reason}>
      <CircleX className="size-3.5" /> {REASON_LABEL[p.reason ?? ""] ?? "Failed"}
    </span>
  );
}

export function Delta({ value, className = "" }: { value: number; className?: string }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium num ${
        up ? "bg-good/15 text-good-text" : "bg-bad/15 text-bad-text"
      } ${className}`}
    >
      <Icon className="size-3.5" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function LiveDot() {
  return <span className="inline-block size-2 animate-pulse-dot rounded-full bg-lime" />;
}

/** Tiny single-series trend line for stat tiles. */
export function Sparkline({
  data,
  color = "var(--color-lime)",
  width = 120,
  height = 36,
  fill = true,
  fluid = true,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  fluid?: boolean; // stretch to the container's width
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `spark-${color.replace(/[^a-z0-9]/gi, "")}-${data.length}-${Math.round(data[data.length - 1] * 1000)}`;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block overflow-visible"
      style={{ maxWidth: fluid ? undefined : width }}
      aria-hidden
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="card card-pad text-center text-sm text-ink-2">{children}</div>;
}
