"use client";

import { ArrowUpRight, CircleCheck, CircleDashed, CircleX, ScanSearch, ShieldAlert, ShieldCheck, ShieldOff, ShieldX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePayoutScreening, useScreenings } from "@/hooks/useScreening";
import type { CheckStatus, PayerScreening, ScreenCheck, Screening, Verdict } from "@/lib/api";
import { INTERCEPTA_URL } from "@/lib/config";
import { dateTime, shortAddr, usdc } from "@/lib/format";
import { PayerCell } from "./FeedList";
import { ErrorState, Skeleton, Spinner } from "./ui";

// Verdicts never ride on color alone: every one is icon + label.

const VERDICT: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  allow: { label: "Passed", cls: "bg-good/10 text-good-text", Icon: ShieldCheck },
  warn: { label: "Warning", cls: "bg-warn/15 text-warn-text", Icon: ShieldAlert },
  block: { label: "Blocked", cls: "bg-bad/10 text-bad-text", Icon: ShieldX },
};

const CHECK: Record<CheckStatus, { cls: string; Icon: typeof CircleCheck; label: string }> = {
  pass: { cls: "text-good-text", Icon: CircleCheck, label: "passed" },
  warn: { cls: "text-warn-text", Icon: TriangleAlert, label: "warning" },
  block: { cls: "text-bad-text", Icon: CircleX, label: "blocked" },
  skipped: { cls: "text-ink-3", Icon: CircleDashed, label: "skipped" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${v.cls}`}>
      <v.Icon className="size-3.5" />
      {v.label}
    </span>
  );
}

function subjectText(c: ScreenCheck) {
  return /^0x[0-9a-fA-F]{40}$/.test(c.subject) ? shortAddr(c.subject) : c.subject.replace(/0x[0-9a-fA-F]{40}/g, (a) => shortAddr(a));
}

export function CheckList({ checks }: { checks: ScreenCheck[] }) {
  return (
    <ul className="space-y-2">
      {checks.map((c, i) => {
        const s = CHECK[c.status] ?? CHECK.skipped;
        return (
          <li key={`${c.kind}-${i}`} className="flex gap-2.5 text-sm">
            <s.Icon className={`mt-0.5 size-4 shrink-0 ${s.cls}`} aria-label={s.label} />
            <div className="min-w-0">
              <div>
                <span className="font-medium">{c.label}</span> <span className="font-mono text-xs text-ink-3">{subjectText(c)}</span>
              </div>
              <div className={`text-xs ${c.status === "block" ? "text-bad-text" : "text-ink-2"}`}>{c.reason}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * What Intercepta said about a payment, e.g. on the pay page. `screenings` is
 * every screen run for it so far (the quote, then the authorization); the latest
 * result per check wins.
 */
export function ScreeningPanel({ screenings, loading, error }: { screenings: Screening[]; loading?: boolean; error?: unknown }) {
  const merged = new Map<string, ScreenCheck>();
  for (const c of screenings.flatMap((s) => s.checks)) merged.set(`${c.kind}:${c.subject}`, c);
  const checks = [...merged.values()];
  const off = screenings.length > 0 && screenings.every((s) => !s.enabled);
  const verdict: Verdict | null = screenings.length
    ? screenings.some((s) => s.verdict === "block")
      ? "block"
      : screenings.some((s) => s.verdict === "warn")
        ? "warn"
        : "allow"
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">Screened by Intercepta</div>
        {loading ? <Spinner /> : off ? <span className="chip gap-1 text-ink-3"><ShieldOff className="size-3.5" /> Off</span> : verdict && <VerdictBadge verdict={verdict} />}
      </div>
      {error ? (
        <p className="text-xs text-bad-text">Couldn’t reach screening. Paying stays blocked until it answers.</p>
      ) : off ? (
        <p className="text-xs text-ink-3">The gateway has no Intercepta key yet, so this payment isn’t screened.</p>
      ) : checks.length ? (
        <CheckList checks={checks} />
      ) : (
        !loading && <p className="text-xs text-ink-3">Recipient, token and your authorization are checked before you sign.</p>
      )}
    </div>
  );
}

const COLS = "grid-cols-[120px_minmax(150px,1.2fr)_minmax(150px,1fr)_90px_minmax(220px,1.6fr)]";

/** Payments the paywall refused because Intercepta flagged the payer. */
export function ScreeningsTable({ rows }: { rows: PayerScreening[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px]">
        <div className={`thead-row ${COLS}`}>
          <div>Time</div>
          <div>Listing</div>
          <div>Payer</div>
          <div className="text-right">Amount</div>
          <div>Why</div>
        </div>
        {rows.map((r) => (
          <div key={r.id} className={`trow ${COLS}`}>
            <div className="num text-xs text-ink-2">{dateTime(r.t)}</div>
            <Link href={`/endpoints/${r.endpointId}`} className="truncate font-medium hover:underline">
              {r.endpointName}
            </Link>
            <PayerCell payer={r.payer} />
            <div className="num text-right text-ink-3 line-through" title="Refused, nothing settled">
              {usdc(r.amountAtomic)}
            </div>
            <div className="min-w-0">
              <VerdictBadge verdict={r.verdict} />
              <div className="mt-1 truncate text-xs text-ink-2" title={r.summary}>
                {r.summary}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Overview card: Intercepta on the seller's payout address, and payers refused lately. */
export function ProtectionCard() {
  const payout = usePayoutScreening();
  const blocked = useScreenings("block");
  const first = blocked.data?.pages[0];
  const p = payout.data;
  const off = p ? !p.enabled : first ? !first.enabled : false;

  return (
    <div className="card card-pad relative overflow-hidden border-good/25">
      <div className="pointer-events-none absolute -top-24 -right-16 size-60 rounded-full bg-good/10 blur-3xl" />
      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-good/10">
            <ShieldCheck className="size-5 text-good-text" />
          </span>
          <div>
            <div className="card-title">Protected by Intercepta</div>
            <div className="card-cap mt-0.5">Real-time onchain screening on every payment, before any USDC settles</div>
          </div>
        </div>
        {off ? (
          <span className="chip gap-1 text-ink-3">
            <ShieldOff className="size-3.5" /> Off
          </span>
        ) : (
          <a href={INTERCEPTA_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
            intercepta.io <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>

      {payout.error ? (
        <ErrorState error={payout.error} onRetry={() => payout.refetch()} />
      ) : !p ? (
        <Skeleton className="h-16 w-full" />
      ) : off ? (
        <p className="text-sm text-ink-2">The gateway has no Intercepta API key yet, so payers and payouts aren’t screened.</p>
      ) : (
        <div className="relative grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-surface-2 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-ink-3">Your payout address</div>
              <VerdictBadge verdict={p.poisoned && p.verdict === "allow" ? "warn" : p.verdict} />
            </div>
            <div className="mt-1.5 font-mono text-xs text-ink-2">{shortAddr(p.address)}</div>
            <div className="mt-1 text-xs text-ink-2">
              {p.verdict !== "allow"
                ? p.summary
                : p.poisoned
                  ? "Targeted by address poisoning: check the full address before sharing it."
                  : "Clean, no risk found."}
            </div>
          </div>
          <Link href="/payments" className="rounded-2xl bg-surface-2 p-3.5 hover:bg-surface-3">
            <div className="text-xs text-ink-3">Payers blocked · 30 days</div>
            <div className="num mt-1 text-2xl font-semibold tracking-tight">{first ? first.blocked30d.toLocaleString() : "—"}</div>
            <div className="text-xs text-ink-2">
              {first && first.blocked30d > 0 ? `$${first.blocked30dUsd} refused, never settled` : "Sanctioned and scam wallets are refused"}
            </div>
          </Link>
          <div className="rounded-2xl bg-surface-2 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-ink-3">Before buyers sign</div>
              <ScanSearch className="size-4 text-good-text" />
            </div>
            <div className="mt-1.5 text-sm font-medium">Pay page checks</div>
            <div className="mt-1 text-xs text-ink-2">Your address, the token and each payment authorization are screened before a buyer’s wallet signs.</div>
          </div>
        </div>
      )}
    </div>
  );
}
