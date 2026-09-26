"use client";

import { ArrowRight, Blocks, FlaskConical, PenLine, Radio, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useConnect, useConnectors, useSwitchChain } from "wagmi";
import { Logo, Spinner } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { CHAIN } from "@/lib/config";
import { shortAddr } from "@/lib/format";

export function ConnectPage() {
  const session = useSession();
  const router = useRouter();
  const param = useSearchParams().get("from");
  // only same-site paths, never "//evil.com"
  const from = param && param.startsWith("/") && !param.startsWith("//") ? param : "/dashboard";
  const signedIn = session.status === "signed-in";

  useEffect(() => {
    if (signedIn) router.replace(from);
  }, [signedIn, from, router]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <a href="https://x402.org" target="_blank" rel="noreferrer" className="text-sm text-ink-2 hover:text-ink">
          What is x402?
        </a>
      </header>

      <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2 shadow-sm">
            <span className="size-1.5 rounded-full bg-[#0052ff]" /> Settles in USDC on {CHAIN.name}
          </span>
          <h1 className="mt-6 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-[56px]">
            Put a toll on your API.
            <br />
            <span className="text-ink-3">Let AI agents pay per call.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-2">
            Tollgate sits in front of any HTTP API. Claude and other agents pay per request over x402, your upstream key never
            leaves the gateway, and every payment lands in your wallet.
          </p>

          <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              { Icon: PenLine, t: "Add an endpoint", d: "URL, key and a price" },
              { Icon: FlaskConical, t: "Test it", d: "one call goes live" },
              { Icon: Radio, t: "Get paid", d: "watch calls arrive" },
            ].map(({ Icon, t, d }, i) => (
              <div key={t} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <Icon className="size-4 text-accent" />
                  <span className="num text-xs text-ink-3">0{i + 1}</span>
                </div>
                <div className="mt-3 text-sm font-medium">{t}</div>
                <div className="text-xs text-ink-3">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-lime/40 blur-3xl" />
          <div className="relative">
            <SignInPanel session={session} />
          </div>
        </section>
      </main>
    </div>
  );
}

function SignInPanel({ session }: { session: ReturnType<typeof useSession> }) {
  const { status, address } = session;

  if (status === "reconnecting" || status === "checking") {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-ink-2">
        <Spinner className="size-6" />
        {status === "checking" ? "Checking your session…" : "Reconnecting your wallet…"}
      </div>
    );
  }

  return (
    <>
      <Steps status={status} />
      {status === "disconnected" && <ConnectWallet />}
      {status === "wrong-chain" && <SwitchNetwork />}
      {status === "signed-out" && (
        <div>
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-ink-2">
            Connected as <span className="font-mono text-ink">{shortAddr(address)}</span>. Sign a message to prove it’s your wallet. It’s
            free and sends no transaction.
          </p>
          <button className="btn btn-primary mt-6 h-12 w-full text-[15px]" disabled={session.signingIn} onClick={() => session.signIn()}>
            {session.signingIn ? <Spinner /> : <PenLine className="size-4" />}
            {session.signingIn ? "Check your wallet…" : "Sign in with Ethereum"}
          </button>
          {session.signInError && <p className="mt-3 text-sm text-bad-text">{friendlyError(session.signInError)}</p>}
          <button className="mt-4 w-full text-center text-sm text-ink-3 hover:text-ink" onClick={session.signOut}>
            Use a different wallet
          </button>
        </div>
      )}
    </>
  );
}

function Steps({ status }: { status: string }) {
  const step = status === "disconnected" ? 0 : status === "wrong-chain" ? 1 : 2;
  const labels = ["Connect", "Network", "Sign in"];
  return (
    <ol className="mb-8 flex items-center gap-2 text-xs">
      {labels.map((l, i) => (
        <li key={l} className="flex items-center gap-2">
          <span
            className={`grid size-6 place-items-center rounded-full font-medium ${
              i < step ? "bg-ink text-white" : i === step ? "bg-lime text-lime-ink" : "bg-surface-2 text-ink-3"
            }`}
          >
            {i + 1}
          </span>
          <span className={i === step ? "text-ink" : "text-ink-3"}>{l}</span>
          {i < labels.length - 1 && <span className="mx-1 h-px w-6 bg-line-strong" />}
        </li>
      ))}
    </ol>
  );
}

function ConnectWallet() {
  const connectors = useConnectors();
  const { connect, isPending, variables, error } = useConnect();
  // EIP-6963 wallets (MetaMask, Rabby…) show up by name; hide the generic
  // "Injected" entry when a named one exists.
  const named = connectors.filter((c) => c.id !== "injected");
  const list = named.some((c) => c.type === "injected") ? named : connectors;

  return (
    <div>
      <h2 className="text-xl font-semibold">Connect your wallet</h2>
      <p className="mt-1 text-sm text-ink-2">Payments for your endpoints settle to this address.</p>
      <div className="mt-6 space-y-2">
        {list.map((c) => {
          const busy = isPending && variables?.connector && "id" in variables.connector && variables.connector.id === c.id;
          return (
            <button
              key={c.uid}
              onClick={() => connect({ connector: c, chainId: CHAIN.id })}
              disabled={isPending}
              className="flex h-14 w-full items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 text-left text-sm font-medium transition-colors hover:border-ink-3 hover:bg-surface-2"
            >
              {c.icon ? (
                // wallet icons are data: URIs from EIP-6963; next/image adds nothing here
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.icon} alt="" className="size-7 rounded-lg" />
              ) : (
                <span className="grid size-7 place-items-center rounded-lg bg-surface-2">
                  {c.id === "coinbaseWalletSDK" ? <Blocks className="size-4" /> : <Wallet className="size-4" />}
                </span>
              )}
              <span className="flex-1">{c.id === "injected" ? "Browser wallet" : c.name}</span>
              {busy ? <Spinner /> : <ArrowRight className="size-4 text-ink-3" />}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-bad-text">{friendlyError(error)}</p>}
    </div>
  );
}

function SwitchNetwork() {
  const { switchChain, isPending, error } = useSwitchChain();
  return (
    <div>
      <h2 className="text-xl font-semibold">Wrong network</h2>
      <p className="mt-1 text-sm text-ink-2">Tollgate settles on {CHAIN.name}. Switch your wallet to continue.</p>
      <button className="btn btn-primary mt-6 h-12 w-full text-[15px]" disabled={isPending} onClick={() => switchChain({ chainId: CHAIN.id })}>
        {isPending ? <Spinner /> : null}
        Switch to {CHAIN.name}
      </button>
      {error && <p className="mt-3 text-sm text-bad-text">{friendlyError(error)}</p>}
    </div>
  );
}

function friendlyError(e: Error): string {
  const m = e.message || "";
  if (/reject|denied|cancel/i.test(m)) return "Request cancelled in your wallet.";
  if (/nonce/i.test(m)) return "Couldn't get a sign-in nonce from the server. Is the Worker running?";
  return m.split("\n")[0].slice(0, 200);
}
