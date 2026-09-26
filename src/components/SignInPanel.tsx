"use client";

import { ArrowRight, ExternalLink, PenLine, Wallet } from "lucide-react";
import { useConnect, useConnectors, useSwitchChain } from "wagmi";
import { Spinner } from "@/components/ui";
import type { useSession } from "@/lib/auth";
import { CHAIN } from "@/lib/config";
import { shortAddr } from "@/lib/format";

/** The connect → switch network → SIWE sign-in steps. */
export function SignInPanel({ session }: { session: ReturnType<typeof useSession> }) {
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
  // no EIP-6963 wallet announced and nothing on window.ethereum: nothing to connect
  const noWallet = named.length === 0 && !(window as { ethereum?: unknown }).ethereum;

  if (noWallet) {
    return (
      <div>
        <h2 className="text-xl font-semibold">No wallet found</h2>
        <p className="mt-1 text-sm text-ink-2">Tollgate needs a browser wallet like MetaMask or Rabby. Install one, then reload this page.</p>
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="btn btn-primary mt-6 h-12 w-full text-[15px]">
          Get MetaMask <ExternalLink className="size-4" />
        </a>
      </div>
    );
  }

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
                  <Wallet className="size-4" />
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
