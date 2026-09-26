"use client";

import { ArrowRight, CircleCheck, ExternalLink, Lock, RotateCcw, ShieldCheck, Wallet } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useConnect, useConnectors, useSwitchChain } from "wagmi";
import { Avatar, LogoMark, Spinner } from "@/components/ui";
import type { useSession } from "@/lib/auth";
import { CHAIN } from "@/lib/config";
import { shortAddr } from "@/lib/format";

type Session = ReturnType<typeof useSession>;

/**
 * Log in, web2-style. Under the hood it's still connect → switch to Base →
 * Sign-In With Ethereum, but once the user picks their wallet the rest runs by
 * itself: the network switch and the sign-in request fire automatically, and
 * the copy talks about logging in, not signatures and chains.
 */
export function SignInPanel({ session }: { session: Session }) {
  const { status, address } = session;
  const { switchChain, isPending: switching, error: switchError, reset: resetSwitch } = useSwitchChain();
  // true once the user has asked to log in from this panel, so we only
  // auto-advance on their behalf, never on page load
  const [intent, setIntent] = useState(false);
  const autoSigned = useRef(false);

  // step 2, automatic: wrong network → ask the wallet to switch
  useEffect(() => {
    if (intent && status === "wrong-chain" && !switching && !switchError) switchChain({ chainId: CHAIN.id });
  }, [intent, status, switching, switchError, switchChain]);

  // step 3, automatic: connected on Base → request the login signature once
  useEffect(() => {
    if (intent && status === "signed-out" && !session.signingIn && !autoSigned.current) {
      autoSigned.current = true;
      session.signIn();
    }
  }, [intent, status, session]);

  const logIn = () => {
    autoSigned.current = false;
    resetSwitch();
    setIntent(true);
    if (status === "signed-out") {
      autoSigned.current = true;
      session.signIn();
    }
  };

  if (status === "checking" || (status === "reconnecting" && !intent)) {
    return <Progress title="Logging you back in…" sub="Picking up where you left off." />;
  }
  if (status === "signed-in") {
    return <Progress done title="You’re in" sub="Taking you to your dashboard…" />;
  }

  // wallet popup is open for the connect request
  if (status === "reconnecting" || status === "disconnected") {
    return <ChooseWallet onChoose={() => setIntent(true)} opening={status === "reconnecting"} />;
  }

  if (status === "wrong-chain") {
    if (switching) return <Progress title="Almost there…" sub={`Approve the switch to ${CHAIN.name} in your wallet.`} />;
    return (
      <Shell title="One quick step" sub={`Tollgate runs on ${CHAIN.name}. Let your wallet switch over and you’ll be logged in right after.`}>
        <button className="btn btn-primary h-12 w-full text-[15px]" onClick={logIn}>
          Continue <ArrowRight className="size-4" />
        </button>
        {switchError && <Problem error={switchError} />}
        <SwitchAccount onClick={session.signOut} />
      </Shell>
    );
  }

  // status === "signed-out": connected on Base, not logged in yet
  if (session.signingIn) {
    return <Progress title="Confirm in your wallet" sub="Approve the login request. It’s free and doesn’t send any money." />;
  }
  return (
    <Shell
      title={intent ? "Finish logging in" : "Welcome back"}
      sub={
        <span className="inline-flex items-center gap-2">
          <Avatar seed={address ?? ""} size={20} />
          <span className="font-mono text-ink">{shortAddr(address)}</span>
        </span>
      }
    >
      <button className="btn btn-primary h-12 w-full text-[15px]" onClick={logIn}>
        {session.signInError ? <RotateCcw className="size-4" /> : <Lock className="size-4" />}
        {session.signInError ? "Try again" : "Log in"}
      </button>
      {session.signInError && <Problem error={session.signInError} />}
      <FreeNote />
      <SwitchAccount onClick={session.signOut} />
    </Shell>
  );
}

function ChooseWallet({ onChoose, opening }: { onChoose: () => void; opening: boolean }) {
  const connectors = useConnectors();
  const { connect, isPending, variables, error } = useConnect();
  // EIP-6963 wallets (MetaMask, Rabby…) show up by name; hide the generic
  // "Injected" entry when a named one exists.
  const named = connectors.filter((c) => c.id !== "injected");
  const list = named.some((c) => c.type === "injected") ? named : connectors;
  const noWallet = named.length === 0 && !(window as { ethereum?: unknown }).ethereum;

  if (noWallet) {
    return (
      <Shell title="Log in to Tollgate" sub="Your account lives in a free browser wallet. No password, and it takes about a minute to set up.">
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="btn btn-primary h-12 w-full text-[15px]">
          Get MetaMask, it’s free <ExternalLink className="size-4" />
        </a>
        <p className="text-center text-xs text-ink-3">Already installed one? Reload this page.</p>
      </Shell>
    );
  }

  return (
    <Shell title="Log in to Tollgate" sub="Continue with the wallet in your browser. It’s your account: no password, no email.">
      <div className="space-y-2">
        {list.map((c) => {
          const busy = (isPending || opening) && variables?.connector && "id" in variables.connector && variables.connector.id === c.id;
          return (
            <button
              key={c.uid}
              onClick={() => {
                onChoose();
                connect({ connector: c, chainId: CHAIN.id });
              }}
              disabled={isPending || opening}
              className="group flex h-14 w-full items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 text-left text-sm font-medium transition-all hover:-translate-y-px hover:border-ink-3 hover:shadow-md disabled:opacity-60"
            >
              {c.icon ? (
                // wallet icons are data: URIs from EIP-6963; next/image adds nothing here
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.icon} alt="" className="size-7 rounded-lg" />
              ) : (
                <span className="grid size-7 place-items-center rounded-lg bg-surface-2">
                  <Wallet className="size-4" />
                </span>
              )}
              <span className="flex-1">Continue with {c.id === "injected" ? "browser wallet" : c.name}</span>
              {busy ? <Spinner /> : <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />}
            </button>
          );
        })}
      </div>
      {(isPending || opening) && <p className="text-center text-xs text-ink-2">Check your wallet to continue…</p>}
      {error && <Problem error={error} />}
      <FreeNote />
    </Shell>
  );
}

function Shell({ title, sub, children }: { title: string; sub: ReactNode; children: ReactNode }) {
  return (
    <div>
      <LogoMark size={40} />
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-1.5 text-sm leading-relaxed text-ink-2">{sub}</div>
      <div className="mt-6 space-y-3">{children}</div>
    </div>
  );
}

function Progress({ title, sub, done }: { title: string; sub: string; done?: boolean }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center text-center">
      <div className="relative grid size-16 place-items-center">
        {done ? (
          <CircleCheck className="size-10 text-good-text" />
        ) : (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-lime/40" />
            <LogoMark size={44} />
          </>
        )}
      </div>
      <h2 className="mt-5 text-xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-2">{sub}</p>
    </div>
  );
}

function FreeNote() {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-ink-2">
      <ShieldCheck className="mt-px size-4 shrink-0 text-good-text" />
      Logging in is free. Your wallet only confirms it’s you; nothing is sent or spent.
    </p>
  );
}

function SwitchAccount({ onClick }: { onClick: () => void }) {
  return (
    <button className="w-full text-center text-sm text-ink-3 hover:text-ink" onClick={onClick}>
      Use a different account
    </button>
  );
}

function Problem({ error }: { error: Error }) {
  return <p className="text-center text-sm text-bad-text">{friendlyError(error)}</p>;
}

function friendlyError(e: Error): string {
  const m = e.message || "";
  if (/reject|denied|cancel|user refused/i.test(m)) return "You cancelled in your wallet. Try again when you’re ready.";
  if (/nonce|fetch|network|failed to fetch|502|503/i.test(m)) return "We couldn’t reach Tollgate just now. Check your connection and try again.";
  if (/already pending|request of type/i.test(m)) return "Your wallet already has a request open. Check it and approve or close it.";
  if (/401|unauthor|invalid/i.test(m)) return "That login didn’t go through. Please try again.";
  return "Something went wrong while logging in. Please try again.";
}
