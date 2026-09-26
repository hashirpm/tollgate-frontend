"use client";

import { Blocks, Bot, LayoutGrid, Menu, Plus, Receipt, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Logo } from "./ui";
import { WalletPill } from "./WalletPill";

const NAV = [
  { to: "/dashboard", label: "Overview", Icon: LayoutGrid, end: true },
  { to: "/endpoints", label: "Endpoints", Icon: Blocks, end: false },
  { to: "/payments", label: "Payments", Icon: Receipt, end: false },
  { to: "/claude", label: "Use with Claude", Icon: Bot, end: false },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, Icon, end }) => {
        const active = end ? pathname === to : pathname === to || pathname.startsWith(to + "/");
        return (
          <Link
            key={to}
            href={to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 items-center gap-3 rounded-2xl px-3.5 text-sm transition-colors ${
              active ? "bg-ink font-medium text-white" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-surface-2 p-4">
      <div className="absolute -top-10 -right-10 size-28 rounded-full bg-lime/50 blur-2xl" />
      <div className="relative text-sm font-medium">Sell another API</div>
      <p className="relative mt-1 text-xs leading-relaxed text-ink-2">URL, key and price. Your key never reaches the buyer.</p>
      <Link href="/endpoints/new" onClick={onNavigate} className="btn btn-primary relative mt-3 h-9 w-full text-[13px]">
        <Plus className="size-4" /> Add endpoint
      </Link>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] gap-6 px-4 py-4 sm:px-6 lg:py-6">
      <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[240px] shrink-0 lg:block">
        <div className="card flex h-full flex-col p-4">
          <Link href="/dashboard" className="mb-8 px-1.5 pt-1">
            <Logo />
          </Link>
          <Nav />
          <div className="mt-auto">
            <SidebarCard />
          </div>
        </div>
      </aside>

      {/* phone / tablet: sidebar collapses into a slide-over menu */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-surface p-4 shadow-2xl">
            <div className="mb-8 flex items-center justify-between px-1.5 pt-1">
              <Logo />
              <button className="grid size-10 place-items-center rounded-full hover:bg-surface-2" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <Nav onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <SidebarCard onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="mb-6 flex items-center gap-3">
          <button className="grid size-11 place-items-center rounded-full border border-line bg-surface lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="lg:hidden">
            <Logo sub={false} />
          </Link>
          <div className="ml-auto">
            <WalletPill />
          </div>
        </header>
        <main key={pathname} className="animate-fade-up">
          {children}
        </main>
      </div>
    </div>
  );
}
