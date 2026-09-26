"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, AtSign, Check, OctagonX } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useClaimName, useEnsCheck, useMe } from "@/hooks/useEns";
import { api, ApiError } from "@/lib/api";
import { ensAppUrl, labelError } from "@/lib/ens";
import { shortAddr } from "@/lib/format";
import { Spinner } from "./ui";

// ENS gets its own accent (its brand blue), so names read as a feature of their own.
export const ENS_TEXT = "text-[#3889ff]";
export const ENS_TINT = "bg-[#3889ff]/10";

/** The ENS mark: a small blue tile with an @. */
export function EnsMark({ className = "size-8" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ${ENS_TINT} ${className}`} aria-hidden>
      <AtSign className={`size-[55%] ${ENS_TEXT}`} />
    </span>
  );
}

const SIZE = { sm: "text-[12px]", md: "text-sm", lg: "text-lg sm:text-xl" } as const;

/** A name with its first label emphasized: **elevenlabs**.hashir.tollgate-x402.eth */
export function EnsName({ name, size = "md", link = true, className = "" }: { name: string; size?: keyof typeof SIZE; link?: boolean; className?: string }) {
  const [first, ...rest] = name.split(".");
  const text = (
    <span className="min-w-0 truncate">
      <span className="font-semibold text-ink">{first}</span>
      <span className="text-ink-3">.{rest.join(".")}</span>
    </span>
  );
  const cls = `inline-flex min-w-0 max-w-full items-center gap-1 font-mono tracking-tight ${SIZE[size]} ${className}`;
  if (!link) return <span className={cls}>{text}</span>;
  return (
    <a href={ensAppUrl(name)} target="_blank" rel="noreferrer" className={`${cls} group hover:underline`} title="Open in the ENS app (Sepolia)">
      {text}
      <ArrowUpRight className="size-3.5 shrink-0 text-ink-3 group-hover:text-ink" />
    </a>
  );
}

/**
 * A listing's ENS name, resolved live on Sepolia and checked against the
 * address payments go to. `whose` words the explanation for seller or buyer.
 */
export function EnsCard({ name, payTo, whose, title = "ENS name" }: { name: string; payTo: string; whose: "seller" | "buyer"; title?: string }) {
  const check = useEnsCheck(name, payTo);
  if (!check) return null;
  const mismatch = check.state === "mismatch";
  return (
    <div className={`rounded-2xl border p-4 ${mismatch ? "border-bad/30 bg-bad/5" : "border-[#3889ff]/20 bg-[#3889ff]/[0.04]"}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-ink-2">
        <EnsMark className="size-6" /> {title}
      </div>
      <EnsName name={name} size="lg" className="mt-2" />
      <p className={`mt-1.5 flex gap-1.5 text-xs leading-relaxed ${mismatch ? "text-bad-text" : "text-ink-2"}`}>
        {mismatch && <OctagonX className="mt-px size-3.5 shrink-0" />}
        {check.state === "verified" && <Check className={`mt-px size-3.5 shrink-0 ${ENS_TEXT}`} />}
        <span>
          {check.state === "verified"
            ? whose === "seller"
              ? `Resolves to your payout address ${shortAddr(check.address)} on Base Sepolia. Agents check every quote against it before paying.`
              : `Resolves to ${shortAddr(check.address)} on Base Sepolia, the address this payment goes to.`
            : check.state === "pending"
              ? "Registered on Sepolia. It resolves within a block or two; until then payments are checked against the catalog."
              : mismatch
                ? `The ENS record points to ${shortAddr(check.address)}, not ${shortAddr(payTo)}. ${whose === "buyer" ? "Paying is disabled." : "Agents will refuse to pay until this is fixed."}`
                : "Resolving on Sepolia…"}
        </span>
      </p>
    </div>
  );
}

/** Claim <handle>.<parent>, with a live availability check as you type. */
export function ClaimName({ parent }: { parent: string }) {
  const [handle, setHandle] = useState("");
  const [debounced, setDebounced] = useState("");
  const value = handle.trim().toLowerCase();
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 350);
    return () => clearTimeout(t);
  }, [value]);

  const localError = value ? labelError(value) : null;
  const check = useQuery({
    queryKey: ["name-check", debounced],
    queryFn: () => api.checkName(debounced),
    enabled: !!debounced && !labelError(debounced),
    staleTime: 10_000,
  });
  const claim = useClaimName();
  const settled = debounced === value && !check.isFetching;
  const available = settled && check.data?.available === true;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (available) claim.mutate(value);
  };

  const status = localError ? (
    <span className="text-bad-text">{localError}</span>
  ) : !value ? (
    <span className="text-ink-3">3 to 32 characters: a-z, 0-9 and hyphens.</span>
  ) : !settled ? (
    <span className="inline-flex items-center gap-1.5 text-ink-3">
      <Spinner className="size-3.5" /> Checking…
    </span>
  ) : check.error ? (
    <span className="text-bad-text">Couldn’t check that name. Try again.</span>
  ) : available ? (
    <span className={`inline-flex items-center gap-1 font-medium ${ENS_TEXT}`}>
      <Check className="size-3.5" /> Available
    </span>
  ) : (
    <span className="text-bad-text">{check.data?.reason === "taken" ? "Already taken." : (check.data?.reason ?? "Not available.")}</span>
  );

  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex h-12 min-w-0 flex-1 items-center rounded-2xl border border-line-strong bg-surface pr-3.5 pl-3.5 focus-within:border-[#3889ff] focus-within:ring-2 focus-within:ring-[#3889ff]/20">
          <input
            aria-label="Your name"
            className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-ink-3"
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/\s/g, ""))}
            placeholder="yourname"
            autoComplete="off"
            spellCheck={false}
            maxLength={32}
          />
          <span className="shrink-0 font-mono text-[13px] text-ink-3">.{parent}</span>
        </label>
        <button type="submit" className="btn h-12 rounded-2xl bg-[#3889ff] px-6 text-white hover:bg-[#2f7ae6]" disabled={!available || claim.isPending}>
          {claim.isPending ? <Spinner /> : <AtSign className="size-4" />}
          {claim.isPending ? "Registering on ENS…" : "Claim name"}
        </button>
      </div>
      <div className="text-xs">{status}</div>
      {claim.error && (
        <p className="text-xs text-bad-text">
          {claim.error instanceof ApiError && claim.error.status === 409 ? "Someone just took that name, or you already have one." : claim.error.message}
        </p>
      )}
    </form>
  );
}

/** Sidebar card: the seller's ENS storefront, or a nudge to claim one. */
export function SellerIdentity({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMe();
  const m = me.data;
  if (!m?.ens) return null;
  if (!m.name) {
    return (
      <Link
        href="/dashboard#ens"
        onClick={onNavigate}
        className="group flex items-center gap-2.5 rounded-2xl border border-[#3889ff]/25 bg-[#3889ff]/[0.06] px-3 py-2.5 text-xs transition-colors hover:bg-[#3889ff]/10"
      >
        <EnsMark />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">Claim your ENS name</span>
          <span className="block truncate text-ink-3">you.{m.ens.parent}</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-[#3889ff]/25 bg-[#3889ff]/[0.06] px-3 py-2.5">
      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        <EnsMark className="size-5" /> Your storefront on ENS
      </div>
      <EnsName name={m.name.ensName} size="sm" className="mt-1.5" />
    </div>
  );
}

/**
 * Overview card: the seller's name on ENS and every listing named under it,
 * or the claim form. Hidden when the gateway doesn't name anything on ENS.
 */
export function EnsStorefront({ listings }: { listings: { id: string; name: string; ensName: string | null }[] }) {
  const me = useMe();
  const m = me.data;
  const own = useEnsCheck(m?.name?.ensName, m?.address);
  if (!m?.ens) return null;
  const named = listings.filter((l) => l.ensName);

  return (
    <section id="ens" className="card card-pad relative scroll-mt-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[#3889ff]/15 blur-3xl" />
      {!m.name ? (
        <div className="relative grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="flex gap-4">
            <EnsMark className="size-12" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Claim your name on ENS</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                Your listings become <span className="font-mono text-[13px] text-ink">elevenlabs.you.{m.ens.parent}</span>: names agents can call,
                and verify on-chain before they pay you. You own the name.
              </p>
            </div>
          </div>
          <ClaimName parent={m.ens.parent} />
        </div>
      ) : (
        <div className="relative grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex min-w-0 gap-4">
            <EnsMark className="size-12" />
            <div className="min-w-0">
              <div className="text-xs text-ink-3">Your storefront on ENS</div>
              <EnsName name={m.name.ensName} size="lg" className="mt-1" />
              <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
                {own?.state === "verified"
                  ? `Resolves to your payout address on Base Sepolia. You own it, with its own registry for your listings.`
                  : own?.state === "mismatch"
                    ? "The name points to a different address than your wallet."
                    : "Registered on Sepolia. It resolves within a block or two."}
              </p>
            </div>
          </div>
          <div className="min-w-0">
            <div className="mb-2 text-xs text-ink-3">Listing names</div>
            {named.length ? (
              <ul className="space-y-1.5">
                {named.map((l) => (
                  <li key={l.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
                    <EnsName name={l.ensName!} size="sm" />
                    <Link href={`/endpoints/${l.id}`} className="shrink-0 text-xs text-ink-3 hover:text-ink">
                      {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-ink-2">
                Each listing is named here, like <span className="font-mono text-ink">elevenlabs.{m.name.ensName}</span>, the first time it goes live.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
