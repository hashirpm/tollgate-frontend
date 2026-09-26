import { ArrowRight, Blocks, Bot, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { Avatar, LiveDot, Logo, Sparkline } from "@/components/ui";
import { getKpis, getLanes, getPayments } from "@/lib/data";
import { shortAddr, usd } from "@/lib/format";

export default async function ConnectPage() {
  const [kpis, lanes, recent] = await Promise.all([getKpis(7), getLanes(), getPayments({ limit: 4 })]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1320px] flex-col px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <a href="https://x402.org" target="_blank" rel="noreferrer" className="text-sm text-ink-2 hover:text-ink">
          What is x402?
        </a>
      </header>

      <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-0">
        {/* Pitch */}
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2">
            <LiveDot /> Settling on Hedera, Base and Solana
          </span>
          <h1 className="mt-6 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
            Convert any API into an <span className="text-lime">x402</span>.
            <br />
            <span className="text-ink-2">Track it all in one place.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-ink-2">
            One command wraps your endpoint with pay-per-call metering. AI agents pay directly: no signup, no key, no human in
            the middle. Every payment streams into your dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-primary h-12 px-6 text-[15px]">
              <Wallet className="size-4" /> Connect wallet
            </Link>
            <Link href="/dashboard" className="btn btn-ghost h-12 px-6 text-[15px]">
              View demo dashboard <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            {[
              { Icon: Blocks, t: "One npm package", d: "npx x402ify, no code" },
              { Icon: ShieldCheck, t: "World ID pricing", d: "humans pay base price" },
              { Icon: Bot, t: "Agent-native", d: "MCP-ready market" },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-line bg-surface/60 p-4">
                <Icon className="size-4 text-lime" />
                <div className="mt-3 text-sm font-medium">{t}</div>
                <div className="text-xs text-ink-3">{d}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Floating preview cards */}
        <section className="relative hidden h-[560px] lg:block" aria-hidden>
          <div className="absolute inset-10 rounded-full bg-violet/15 blur-3xl" />

          <div className="absolute top-6 right-0 w-[380px] rotate-2 rounded-[var(--radius-card)] bg-lime p-6 text-lime-ink shadow-2xl">
            <div className="text-sm font-medium">Income · 7d</div>
            <div className="num mt-3 text-5xl font-semibold tracking-tight">{usd(kpis.income)}</div>
            <div className="mt-2 text-xs opacity-70">{kpis.requests.toLocaleString()} paid calls</div>
            <div className="mt-5 flex h-12 items-end gap-1.5">
              {kpis.incomeTrend.map((v, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-lime-ink/80" style={{ height: `${(v / Math.max(...kpis.incomeTrend)) * 100}%` }} />
              ))}
            </div>
          </div>

          <div className="card absolute top-[200px] left-0 w-[360px] -rotate-2 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="card-title">Live payments</span>
              <LiveDot />
            </div>
            <ul className="space-y-3">
              {recent.map((p) => (
                <li key={p.reqId} className="flex items-center gap-3">
                  <Avatar seed={p.from} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{shortAddr(p.from)}</div>
                    <div className="truncate font-mono text-[11px] text-ink-3">
                      {p.lane}
                      {p.path}
                    </div>
                  </div>
                  <span className="num text-sm text-lime">+{usd(p.amount, 3)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card absolute right-6 bottom-6 w-[300px] rotate-1 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-2">Requests · 7d</span>
              <span className={`text-xs ${kpis.requestsDelta >= 0 ? "text-good-text" : "text-bad-text"}`}>
                {kpis.requestsDelta >= 0 ? "↑" : "↓"} {Math.abs(kpis.requestsDelta).toFixed(1)}%
              </span>
            </div>
            <div className="num mt-2 text-3xl font-semibold">{kpis.requests.toLocaleString()}</div>
            <div className="mt-3">
              <Sparkline data={kpis.requestTrend} color="var(--color-violet)" height={44} />
            </div>
            <div className="mt-3 flex">
              {lanes.map((l) => (
                <div key={l.name} className="-ml-2 first:ml-0">
                  <Avatar seed={l.name} size={26} />
                </div>
              ))}
              <span className="ml-2 self-center text-xs text-ink-3">{lanes.length} APIs live</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
