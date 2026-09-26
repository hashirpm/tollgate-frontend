import type { ReactNode } from "react";
import { Skeleton, Sparkline } from "./ui";

export function KpiTile({
  label,
  value,
  foot,
  icon,
  trend,
  loading,
  hero,
}: {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  icon?: ReactNode;
  trend?: number[];
  loading?: boolean;
  /** The one loud tile on the page: solid lime. */
  hero?: boolean;
}) {
  return (
    <div
      className={
        hero
          ? "relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-lime p-5 text-lime-ink sm:p-6"
          : "card card-pad flex h-full flex-col"
      }
    >
      {hero && <div className="pointer-events-none absolute -right-10 -bottom-14 size-44 rounded-full bg-white/40 blur-2xl" />}
      <div className="relative flex items-center justify-between gap-2">
        <span className={`text-sm ${hero ? "font-medium" : "text-ink-2"}`}>{label}</span>
        {icon && (
          <span className={`grid size-8 place-items-center rounded-full ${hero ? "bg-lime-ink/10" : "bg-surface-2 text-ink-2"}`}>{icon}</span>
        )}
      </div>
      <div className="relative mt-3">
        {loading ? (
          <Skeleton className={`h-9 w-28 ${hero ? "bg-lime-ink/10" : ""}`} />
        ) : (
          <div className="num text-[28px] leading-tight font-semibold tracking-tight sm:text-3xl">{value}</div>
        )}
      </div>
      {foot && <div className={`relative mt-1 text-xs ${hero ? "opacity-70" : "text-ink-3"}`}>{foot}</div>}
      {trend && trend.length > 1 && (
        <div className="relative mt-auto pt-4">
          <Sparkline data={trend} color={hero ? "#10130a" : undefined} height={34} />
        </div>
      )}
    </div>
  );
}
