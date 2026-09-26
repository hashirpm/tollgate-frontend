"use client";

import { ArrowRight, ArrowUpRight, Check, Plus, ShieldCheck, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from "react";
import s from "@/components/landing/landing.module.css";
import { TollScene } from "@/components/landing/TollScene";
import { SignInPanel } from "@/components/SignInPanel";
import { Logo, Spinner } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { CopyButton } from "@/components/CopyButton";
import { CHAIN, CLAUDE_CODE_ADD, CLAUDE_CONNECTOR_LINK, INTERCEPTA_URL, MCP_URL } from "@/lib/config";

const WORDS = ["API credits.", "voice credits.", "image credits.", "video credits."];

// Illustrative purchases for the ticker. Nothing here is real data.
const SALES = [
  { agent: "claude-agent", what: "Kling video · 5s", price: "0.75" },
  { agent: "podcast-bot", what: "ElevenLabs voice", price: "0.03" },
  { agent: "research-agent", what: "Exa search", price: "0.01" },
  { agent: "design-agent", what: "Higgsfield Soul image", price: "0.10" },
  { agent: "notes-agent", what: "Deepgram transcript", price: "0.02" },
  { agent: "claude-agent", what: "FLUX image", price: "0.01" },
];

export function ConnectPage() {
  const session = useSession();
  const router = useRouter();
  const param = useSearchParams().get("from");
  // only same-site paths, never "//evil.com"
  const from = param && param.startsWith("/") && !param.startsWith("//") ? param : "/dashboard";
  const signedIn = session.status === "signed-in";
  // bounced here from a protected page → go straight to the login dialog
  const [open, setOpen] = useState(!!param);
  // connector instructions only after "Add to Claude" is clicked
  const [claudeHelp, setClaudeHelp] = useState(false);

  useEffect(() => {
    if (signedIn) router.replace(from);
  }, [signedIn, from, router]);

  const busy = session.status === "reconnecting" || session.status === "checking";
  // returning users with a wallet already connected just need to log in
  const cta = session.status === "signed-out" || session.status === "wrong-chain" ? "Log in to your dashboard" : "Log in";

  // the backdrop glow follows the pointer
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    e.currentTarget.style.setProperty("--px", `${e.clientX}px`);
    e.currentTarget.style.setProperty("--py", `${e.clientY}px`);
  };

  return (
    <div className={`relative min-h-screen overflow-hidden ${s.motion}`} onPointerMove={onMove}>
      <Backdrop />

      <div className="relative mx-auto flex min-h-screen max-w-[1280px] flex-col px-4 sm:px-8">
        <header className="flex items-center justify-between py-5">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a
              href="https://x402.org"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink sm:inline-flex"
            >
              x402 protocol <ArrowUpRight className="size-3.5" />
            </a>
            <button onClick={() => setOpen(true)} className="btn btn-ghost h-10 bg-surface/70 backdrop-blur" disabled={busy}>
              {busy ? <Spinner /> : null}
              Log in
            </button>
          </nav>
        </header>

        <main className="grid flex-1 items-center gap-14 pt-8 pb-10 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:pt-4">
          <section className="min-w-0">
            <div className={s.rise} style={{ "--i": 0 } as CSSProperties}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pr-3 pl-1 text-xs text-ink-2 shadow-sm backdrop-blur">
                  <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-lime">HTTP 402</span>
                  USDC on {CHAIN.name}
                </span>
                <a
                  href={INTERCEPTA_URL}
                  target="_blank"
                  rel="noreferrer"
                  title="Every payment is screened by Intercepta: sanctioned, scam and phishing wallets are refused before USDC settles."
                  className="inline-flex items-center gap-1.5 rounded-full border border-good/30 bg-good/10 px-3 py-1 text-xs font-medium text-good-text backdrop-blur transition-colors hover:bg-good/15"
                >
                  <ShieldCheck className="size-3.5" /> Secured by Intercepta
                </a>
              </div>
            </div>

            <h1 className="mt-7 text-[46px] leading-[1] font-semibold tracking-[-0.04em] sm:text-[68px] xl:text-[76px]">
              <span className={`block ${s.rise}`} style={{ "--i": 1 } as CSSProperties}>
                Sell your <span className={s.marker}>leftover</span>
              </span>
              <span className={`block ${s.rise}`} style={{ "--i": 2 } as CSSProperties}>
                <span className={s.rotator}>
                  <span className={s.rotatorTrack}>
                    {[...WORDS, WORDS[0]].map((w, i) => (
                      <span key={i} className={s.gradText}>
                        {w}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </h1>

            <p className={`mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-2 ${s.rise}`} style={{ "--i": 3 } as CSSProperties}>
              Got credits you won’t use? AI agents buy them one call at a time and pay you in USDC. Your API key never leaves the gateway.
            </p>

            <div className={`mt-9 flex flex-wrap items-center gap-3 ${s.rise}`} style={{ "--i": 4 } as CSSProperties}>
              <button
                onClick={() => setOpen(true)}
                disabled={busy}
                className={`btn btn-primary group h-14 rounded-2xl px-7 text-base shadow-[0_12px_30px_-10px_rgb(166_210_15/0.9)] ${s.shine}`}
              >
                {busy ? <Spinner /> : null}
                {cta}
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </button>
              <AddToClaudeButton onCopied={() => setClaudeHelp(true)} />
            </div>
            {claudeHelp && <AddToClaudeHelp />}

            <div className={`mt-10 ${s.rise}`} style={{ "--i": 5 } as CSSProperties}>
              <SalesTicker />
            </div>
          </section>

          <section className={`min-w-0 ${s.rise}`} style={{ "--i": 3 } as CSSProperties}>
            <TollScene />
          </section>
        </main>

      </div>

      <SignInDialog open={open} onClose={() => setOpen(false)} session={session} />
    </div>
  );
}

/** One purchase at a time, each screened by Intercepta. */
function SalesTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SALES.length), 3000);
    return () => clearInterval(t);
  }, []);
  const sale = SALES[i];
  return (
    <div className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-line bg-surface/80 py-2 pr-4 pl-2 shadow-sm backdrop-blur">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-ink">
        <span className="size-2 animate-pulse-dot rounded-full bg-lime" />
      </span>
      <span key={i} className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm ${s.tick}`}>
        <span className="font-mono text-xs text-ink-3">{sale.agent}</span>
        <span className="text-ink-3">bought</span>
        <span className="font-medium">{sale.what}</span>
        <span className="rounded-full bg-lime/50 px-2 py-0.5 font-mono text-[11px] font-semibold text-lime-ink">${sale.price}</span>
        <span className="inline-flex items-center gap-1 text-xs text-good-text">
          <ShieldCheck className="size-3.5" /> screened by Intercepta
        </span>
      </span>
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className={`absolute inset-0 ${s.spotlight}`} />
      <div className={s.floor} />
      <div className={`absolute inset-0 ${s.dots}`} />
      <div className={`absolute -top-40 -left-32 size-[560px] rounded-full bg-lime/45 ${s.blobA}`} />
      <div className={`absolute top-10 right-[-12%] size-[620px] rounded-full bg-violet/30 ${s.blobB}`} />
      <div className={`absolute bottom-[-20%] left-[30%] size-[520px] rounded-full bg-[#7dd3fc]/25 ${s.blobC}`} />
      <div className={`absolute inset-0 ${s.grain}`} />
    </div>
  );
}

function SignInDialog({ open, onClose, session }: { open: boolean; onClose: () => void; session: ReturnType<typeof useSession> }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal() focuses the first control (the close ×) and rings it; start on the panel instead
      d.querySelector<HTMLElement>("[data-dialog-panel]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()} // backdrop click
      className="m-auto w-[min(94vw,440px)] overflow-visible rounded-[28px] border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/35 backdrop:backdrop-blur-sm"
    >
      <div data-dialog-panel tabIndex={-1} className="relative overflow-hidden rounded-[28px] p-6 outline-none sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-lime/40 blur-3xl" />
        <button onClick={onClose} className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close">
          <X className="size-4" />
        </button>
        <div className="relative">
          <SignInPanel session={session} />
        </div>
      </div>
    </dialog>
  );
}

/**
 * Claude's install link: opens "Add custom connector" with Tollgate prefilled.
 * Claude doesn't always show that dialog (e.g. a Free plan already at its one
 * custom connector), so the click also copies the URL for Add → Custom connector.
 */
function AddToClaudeButton({ onCopied }: { onCopied: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    // the manual fallback is shown even if the clipboard write fails
    onCopied();
    return navigator.clipboard?.writeText(MCP_URL).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 6000);
      },
      () => {},
    );
  };
  return (
    <a
      href={CLAUDE_CONNECTOR_LINK}
      target="_blank"
      rel="noreferrer"
      onClick={copy}
      className="btn group h-14 rounded-2xl bg-ink px-6 text-base text-white shadow-[0_12px_30px_-12px_rgb(14_17_22/0.6)] hover:bg-ink/90"
    >
      {copied ? <Check className="size-5 text-lime" /> : <Plus className="size-5 transition-transform group-hover:rotate-90" />}
      {copied ? "Opened Claude · URL copied" : "Add to Claude"}
    </a>
  );
}

/** What happens after the click, plus the manual URL and the Claude Code one-liner. */
function AddToClaudeHelp() {
  return (
    <div className={`mt-4 max-w-[34rem] text-xs text-ink-3 ${s.rise}`} style={{ "--i": 4 } as CSSProperties}>
      <p>
        Opens Claude with Tollgate filled in: click <span className="font-medium text-ink-2">Add</span>, then sign in. No dialog? The server URL is
        already copied, so use <span className="font-medium text-ink-2">Add → Custom connector</span> and paste it.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex min-w-0 items-center gap-1">
          <CopyButton text={MCP_URL} label="Copy server URL" className="h-7 px-2 text-xs" />
        </span>
        <span className="flex items-center gap-1">
          Claude Code:
          <CopyButton text={CLAUDE_CODE_ADD} label="Copy command" className="h-7 px-2 text-xs" />
        </span>
      </div>
    </div>
  );
}
