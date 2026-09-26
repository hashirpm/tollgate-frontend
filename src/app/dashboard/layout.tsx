import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { SideNav, TopNav } from "@/components/shell/nav";
import { Avatar, Logo } from "@/components/ui";
import { getAccount, getLanes, getPayments } from "@/lib/data";
import { shortAddr } from "@/lib/format";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const [account, lanes, payments] = await Promise.all([getAccount(), getLanes(), getPayments()]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1480px] gap-6 px-4 py-4 sm:px-6 lg:py-6">
      {/* Sidebar — floating card, Dribbble style */}
      <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[248px] shrink-0 flex-col lg:flex">
        <div className="card flex h-full flex-col p-4">
          <Link href="/dashboard" className="mb-8 px-1.5 pt-1">
            <Logo />
          </Link>
          <div className="mb-2 px-3.5 text-[11px] font-medium tracking-wider text-ink-3 uppercase">Menu</div>
          <SideNav counts={{ "/dashboard/apis": lanes.length, "/dashboard/payments": payments.length }} />

          <div className="mt-auto">
            <div className="relative overflow-hidden rounded-[18px] bg-surface-2 p-4">
              <div className="absolute -top-10 -right-10 size-28 rounded-full bg-lime/20 blur-2xl" />
              <div className="relative text-sm font-medium">Wrap another API</div>
              <p className="relative mt-1 text-xs leading-relaxed text-ink-2">
                One command. No code. Your upstream key never leaves your machine.
              </p>
              <Link href="/dashboard/apis#connect" className="btn btn-primary relative mt-3 h-9 w-full text-[13px]">
                npx x402ify
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar */}
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="lg:hidden">
              <Logo />
            </Link>
            <label className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-3" />
              <input className="input h-11 pl-11" placeholder="Search payments, payers, endpoints…" />
            </label>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-ink-2 sm:inline-flex">
                <span className="size-2 rounded-full bg-good" />
                {account.network}
              </span>
              <button className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-2 hover:text-ink" aria-label="Notifications">
                <Bell className="size-[18px]" />
              </button>
              <div className="flex h-11 items-center gap-2.5 rounded-full border border-line bg-surface p-1 sm:pr-4">
                <Avatar seed={account.addr} size={34} />
                <div className="hidden leading-tight sm:block">
                  <div className="font-mono text-[13px]">{shortAddr(account.addr)}</div>
                  <div className="num text-[11px] text-ink-3">{account.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} ℏ</div>
                </div>
              </div>
            </div>
          </div>
          <TopNav />
        </header>

        <main className="animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
