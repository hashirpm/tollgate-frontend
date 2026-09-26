import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { avatarGradient } from "@/lib/format";

/** Tollgate mark: a toll boom barrier on a lime tile. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="9" fill="#c6f432" />
      <rect x="7.25" y="12" width="3.5" height="11.5" rx="1" fill="#10130a" />
      <rect x="5" y="22.5" width="8" height="3" rx="1.5" fill="#10130a" />
      <path d="M9 9.25h16.25a2.25 2.25 0 0 1 0 4.5H9z" fill="#10130a" />
      <path d="M14.2 9.25h2.9l-2.3 4.5h-2.9zM20.2 9.25h2.9l-2.3 4.5h-2.9z" fill="#c6f432" />
      <circle cx="9" cy="11.5" r="3.4" fill="#10130a" />
      <circle cx="9" cy="11.5" r="1.25" fill="#c6f432" />
    </svg>
  );
}

export function Logo({ sub = true }: { sub?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-[16px] font-semibold tracking-tight">Tollgate</div>
        {sub && <div className="text-[11px] text-ink-3">x402 payments on Base</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {sub && <div className="mt-1 text-sm text-ink-2">{sub}</div>}
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
      style={{ width: size, height: size, background: avatarGradient(seed.toLowerCase()) }}
    />
  );
}

export function LiveDot() {
  return <span className="inline-block size-2 shrink-0 animate-pulse-dot rounded-full bg-lime" />;
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-3 ${className}`} />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-ink-2">{icon}</div>}
      <div className="text-base font-medium">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-bad/25 bg-bad/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-bad-text" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-bad-text">Couldn’t load this</div>
        <div className="mt-0.5 break-words text-ink-2">{msg}</div>
      </div>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/** Tiny single-series trend line for KPI tiles. Stretches to its container. */
export function Sparkline({ data, color = "var(--color-chart)", height = 36 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return <div style={{ height }} />;
  const width = 120;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `spark-${height}-${data.length}-${Math.round(max * 100)}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <div className="mt-1.5 text-xs text-bad-text">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
