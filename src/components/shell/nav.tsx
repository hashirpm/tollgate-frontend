"use client";

import { BarChart3, Blocks, LayoutGrid, Receipt, Settings, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/dashboard", label: "Overview", Icon: LayoutGrid },
  { href: "/dashboard/apis", label: "APIs", Icon: Blocks },
  { href: "/dashboard/payments", label: "Payments", Icon: Receipt },
  { href: "/dashboard/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/dashboard/features", label: "Features", Icon: SlidersHorizontal },
  { href: "/dashboard/settings", label: "Settings", Icon: Settings },
] as const;

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
}

export function SideNav({ counts }: { counts: Partial<Record<string, number>> }) {
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(href);
        const count = counts[href];
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex h-11 items-center gap-3 rounded-2xl px-3.5 text-sm transition-colors ${
              active ? "bg-ink text-canvas font-medium" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon className="size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
            <span className="flex-1">{label}</span>
            {count != null && (
              <span
                className={`num rounded-full px-2 py-0.5 text-[11px] ${
                  active ? "bg-canvas/10 text-canvas" : "bg-surface-3 text-ink-3"
                }`}
              >
                {count.toLocaleString()}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Below the lg breakpoint the sidebar collapses into a scrollable pill row. */
export function TopNav() {
  const isActive = useActive();
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
      {NAV.map(({ href, label, Icon }) => (
        <Link key={href} href={href} data-active={isActive(href)} className="chip shrink-0">
          <Icon className="size-3.5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
