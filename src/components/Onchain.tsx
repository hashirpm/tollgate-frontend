"use client";

import { ArrowRight, BadgeCheck, CircleAlert, CircleCheck, Clock3, ExternalLink, Info, Link2, Link2Off, OctagonAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActions, useReconcile } from "@/hooks/useOnchain";
import { useNow } from "@/hooks/useNow";
import type { ActionSeverity, SellerAction, Verification } from "@/lib/api";
import { ago, usdc } from "@/lib/format";
import { ErrorState, Skeleton } from "./ui";

// Onchain verification with Curvegrid MultiBaas: every settled payment is checked
// against the USDC transfer it should have produced. States never ride on color
// alone: each is icon + label.

const VERIFICATION: Record<Exclude<Verification, "untracked">, { label: string; cls: string; Icon: typeof BadgeCheck; title: string }> = {
  verified: { label: "Onchain", cls: "text-good-text", Icon: BadgeCheck, title: "MultiBaas found the USDC transfer to you, for this amount" },
  confirming: { label: "Confirming", cls: "text-ink-3", Icon: Clock3, title: "Waiting for MultiBaas to index the USDC transfer" },
  unverified: {
    label: "Not onchain",
    cls: "text-bad-text",
    Icon: TriangleAlert,
    title: "The facilitator reported this as settled, but no USDC transfer to you was found in that transaction",
  },
  mismatch: { label: "Amount differs", cls: "text-bad-text", Icon: CircleAlert, title: "A USDC transfer landed, but for a different amount" },
};

/** Small label under a payment's status; nothing when verification is off or the call predates it. */
export function VerificationBadge({ verification, block }: { verification: Verification | null; block?: number | null }) {
  if (!verification || verification === "untracked") return null;
  const v = VERIFICATION[verification];
  return (
    <span className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${v.cls}`} title={v.title}>
      <v.Icon className="size-3.5" />
      {v.label}
      {verification === "verified" && block ? <span className="num font-normal text-ink-3">· #{block.toLocaleString()}</span> : null}
    </span>
  );
}

const SEVERITY: Record<ActionSeverity, { Icon: typeof Info; cls: string; label: string }> = {
  critical: { Icon: OctagonAlert, cls: "bg-bad/10 text-bad-text", label: "Critical" },
  warning: { Icon: TriangleAlert, cls: "bg-warn/15 text-warn-text", label: "Warning" },
  info: { Icon: Info, cls: "bg-surface-2 text-ink-2", label: "Info" },
};

/** What needs the seller now: payments the chain doesn't back, endpoints losing sales, and so on. */
export function ActionCenter() {
  const q = useActions();
  const actions = q.data?.actions ?? [];

  return (
    <div className="card card-pad">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="card-title">Action center</div>
          <div className="card-cap mt-0.5">What needs you, from the last 24 hours</div>
        </div>
        {q.data && <VerificationPill status={q.data.verification} />}
      </div>

      {q.error ? (
        <div className="mt-4">
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        </div>
      ) : q.isPending ? (
        <Skeleton className="mt-4 h-14 w-full" />
      ) : actions.length === 0 ? (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-good/10 px-4 py-3 text-sm text-good-text">
          <CircleCheck className="size-4 shrink-0" />
          <span>
            All clear.{" "}
            <span className="text-ink-2">
              {q.data?.verification === "ok" ? "Every checked payment is backed onchain, and " : ""}no endpoint is losing sales.
            </span>
          </span>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {actions.map((a) => (
            <ActionRow key={a.id} action={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionRow({ action: a }: { action: SellerAction }) {
  const s = SEVERITY[a.severity];
  const external = a.cta?.href.startsWith("http");
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line p-3.5 sm:flex-row sm:items-center">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${s.cls}`} aria-label={s.label} title={s.label}>
        <s.Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{a.title}</div>
        <div className="mt-0.5 text-xs text-ink-2">{a.detail}</div>
      </div>
      {a.cta &&
        (external ? (
          <a href={a.cta.href} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm shrink-0 self-start sm:self-center">
            {a.cta.label} <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <Link href={a.cta.href} className="btn btn-ghost btn-sm shrink-0 self-start sm:self-center">
            {a.cta.label} <ArrowRight className="size-3.5" />
          </Link>
        ))}
    </li>
  );
}

function VerificationPill({ status }: { status: "ok" | "degraded" | "off" }) {
  if (status === "off")
    return (
      <span className="chip gap-1 text-ink-3" title="Set MULTIBAAS_URL on the gateway to check payments onchain">
        <Link2Off className="size-3.5" /> Onchain checks off
      </span>
    );
  return (
    <span className={`chip gap-1 ${status === "ok" ? "text-good-text" : "text-warn-text"}`}>
      {status === "ok" ? <Link2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {status === "ok" ? "Verified by Curvegrid MultiBaas" : "MultiBaas unreachable"}
    </span>
  );
}

/** Recorded vs onchain income, next to the Intercepta card on the Overview. */
export function OnchainCard() {
  const q = useReconcile("24h");
  const now = useNow(15_000);
  const r = q.data;

  return (
    <div className="card card-pad">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="card-title flex items-center gap-2">
            <Link2 className="size-4 text-good-text" /> Onchain reconciliation
          </div>
          <div className="card-cap mt-0.5">Payments checked against USDC transfers indexed by Curvegrid MultiBaas · 24h</div>
        </div>
      </div>

      {q.error ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !r ? (
        <Skeleton className="h-16 w-full" />
      ) : r.status === "off" ? (
        <p className="text-sm text-ink-2">
          The gateway isn’t connected to MultiBaas yet, so payments are recorded from the facilitator’s word alone. Connect a deployment to check each one
          against Base Sepolia.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Tile label="Recorded by the gateway" value={usdc(r.recordedAtomic)} foot="settled, per the facilitator" />
            <Tile
              label="Verified onchain"
              value={usdc(r.verifiedAtomic)}
              foot={r.verifiedPct == null ? "nothing to check yet" : `${r.verifiedPct}% of checkable payments`}
              tone={r.counts.unverified + r.counts.mismatch > 0 ? "bad" : undefined}
            />
            <Tile
              label="Outside Tollgate"
              value={usdc(r.externalAtomic)}
              foot={r.external.length ? `${r.external.length} transfer${r.external.length === 1 ? "" : "s"}, not API income` : "no other inflows"}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
            <span className="inline-flex items-center gap-1 text-good-text">
              <BadgeCheck className="size-3.5" /> {r.counts.verified} verified
            </span>
            <span className="inline-flex items-center gap-1 text-ink-3">
              <Clock3 className="size-3.5" /> {r.counts.confirming} confirming
            </span>
            <Link href="/payments?verification=unverified" className={`inline-flex items-center gap-1 hover:underline ${r.counts.unverified ? "text-bad-text" : ""}`}>
              <TriangleAlert className="size-3.5" /> {r.counts.unverified} not onchain
            </Link>
            <span className={`inline-flex items-center gap-1 ${r.counts.mismatch ? "text-bad-text" : ""}`}>
              <CircleAlert className="size-3.5" /> {r.counts.mismatch} amount differs
            </span>
            <span className="ml-auto text-ink-3">
              {r.status === "degraded"
                ? `MultiBaas unreachable: ${r.error ?? "retrying"}`
                : r.lastBlock
                  ? `last transfer block #${r.lastBlock.number.toLocaleString()} · ${ago(r.lastBlock.t, now)}`
                  : "no transfers indexed yet"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, foot, tone }: { label: string; value: string; foot: string; tone?: "bad" }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3.5">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="num mt-1 text-xl font-semibold tracking-tight">{value}</div>
      <div className={`text-xs ${tone === "bad" ? "text-bad-text" : "text-ink-2"}`}>{foot}</div>
    </div>
  );
}
