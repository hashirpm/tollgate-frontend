"use client";

import { ArrowRight, ArrowUpRight, Bot, KeyRound, X, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import s from "@/components/landing/landing.module.css";
import { TollScene } from "@/components/landing/TollScene";
import { SignInPanel } from "@/components/SignInPanel";
import { Logo, Spinner } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { CHAIN } from "@/lib/config";

const WORDS = ["your API.", "your model.", "your data.", "every call."];

// decorative marquee: the kinds of things people put a toll on
const ROUTES = [
  ["GET", "/v1/forecast", "0.01"],
  ["POST", "/v1/messages", "0.05"],
  ["GET", "/quote/IBM", "0.015"],
  ["POST", "/embed", "0.002"],
  ["GET", "/gas/oracle", "0.005"],
  ["POST", "/search", "0.02"],
  ["GET", "/pools/tvl", "0.02"],
  ["POST", "/transcribe", "0.03"],
  ["GET", "/proposals", "0.01"],
  ["POST", "/ocr", "0.04"],
] as const;

export function ConnectPage() {
  const session = useSession();
  const router = useRouter();
  const param = useSearchParams().get("from");
  // only same-site paths, never "//evil.com"
  const from = param && param.startsWith("/") && !param.startsWith("//") ? param : "/dashboard";
  const signedIn = session.status === "signed-in";
  // bounced here from a protected page → go straight to the login dialog
  const [open, setOpen] = useState(!!param);

  useEffect(() => {
    if (signedIn) router.replace(from);
  }, [signedIn, from, router]);

  const busy = session.status === "reconnecting" || session.status === "checking";
  // returning users with a wallet already connected just need to log in
  const cta = session.status === "signed-out" || session.status === "wrong-chain" ? "Log in to your dashboard" : "Log in";

  return (
    <div className={`relative min-h-screen overflow-hidden ${s.motion}`}>
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
          <section>
            <div className={s.rise} style={{ "--i": 0 } as CSSProperties}>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pr-3 pl-1 text-xs text-ink-2 shadow-sm backdrop-blur">
                <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-lime">HTTP 402</span>
                <span>
                  Pay-per-call for AI agents<span className="hidden sm:inline">, settled in USDC on {CHAIN.name}</span>
                </span>
              </span>
            </div>

            <h1 className="mt-7 text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[68px] xl:text-[76px]">
              <span className={`block ${s.rise}`} style={{ "--i": 1 } as CSSProperties}>
                Put a <span className={s.marker}>toll</span> on
              </span>
              <span className={`block ${s.rise}`} style={{ "--i": 2 } as CSSProperties}>
                <span className={s.rotator}>
                  <span className={s.rotatorTrack}>
                    {[...WORDS, WORDS[0]].map((w, i) => (
                      <span key={i} className="bg-linear-to-r from-ink via-ink-2 to-violet bg-clip-text text-transparent">
                        {w}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </h1>

            <p className={`mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-2 ${s.rise}`} style={{ "--i": 3 } as CSSProperties}>
              Tollgate sits in front of any HTTP API. Claude and other agents hit a <span className="font-mono text-[15px] text-ink">402</span>,
              pay in USDC and get the response, with no signup, no API keys to hand out and no invoices. Your upstream key never leaves the
              gateway.
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
              <a
                href="https://x402.org"
                target="_blank"
                rel="noreferrer"
                className="btn h-14 rounded-2xl border border-line-strong bg-surface/70 px-6 text-base text-ink backdrop-blur hover:bg-surface"
              >
                How x402 works
              </a>
            </div>

            <ul className={`mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-2 ${s.rise}`} style={{ "--i": 5 } as CSSProperties}>
              {[
                { Icon: Zap, t: "Live in one test call" },
                { Icon: KeyRound, t: "Key stays server-side" },
                { Icon: Bot, t: "Claude-ready via MCP" },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg border border-line bg-surface shadow-sm">
                    <Icon className="size-3.5 text-accent" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </section>

          <section className={s.rise} style={{ "--i": 3 } as CSSProperties}>
            <TollScene />
          </section>
        </main>

        <Marquee />
      </div>

      <SignInDialog open={open} onClose={() => setOpen(false)} session={session} />
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className={`absolute inset-0 ${s.dots}`} />
      <div className={`absolute -top-40 -left-32 size-[560px] rounded-full bg-lime/45 ${s.blobA}`} />
      <div className={`absolute top-10 right-[-12%] size-[620px] rounded-full bg-violet/30 ${s.blobB}`} />
      <div className={`absolute bottom-[-20%] left-[30%] size-[520px] rounded-full bg-[#7dd3fc]/25 ${s.blobC}`} />
      <div className={`absolute inset-0 ${s.grain}`} />
    </div>
  );
}

function Marquee() {
  const items = [...ROUTES, ...ROUTES];
  return (
    <div className="pb-8">
      <div className="mb-3 text-center text-[11px] tracking-[0.18em] text-ink-3 uppercase">If it speaks HTTP, it can charge per call</div>
      <div className={`overflow-hidden ${s.marquee}`}>
        <div className={`flex w-max gap-3 ${s.marqueeTrack}`}>
          {items.map(([m, p, price], i) => (
            <span
              key={i}
              aria-hidden={i >= ROUTES.length}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-2 font-mono text-xs whitespace-nowrap shadow-sm backdrop-blur"
            >
              <span className={m === "GET" ? "text-good-text" : "text-violet"}>{m}</span>
              <span className="text-ink">{p}</span>
              <span className="rounded-full bg-lime/40 px-1.5 text-[11px] text-lime-ink">${price}</span>
            </span>
          ))}
        </div>
      </div>
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
