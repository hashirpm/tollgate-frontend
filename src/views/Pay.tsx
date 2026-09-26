"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, CircleCheck, CircleX, Download, ExternalLink, LogOut, ShieldCheck, Wallet, Zap } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAccount, useConnect, useConnectors, useDisconnect, useSwitchChain, useWalletClient } from "wagmi";
import { JsonField } from "@/components/FormFields";
import { ScreeningPanel } from "@/components/Screening";
import { Avatar, EmptyState, ErrorState, Logo, Skeleton, Spinner } from "@/components/ui";
import { useCatalog } from "@/hooks/useEndpoints";
import { usePreScreen } from "@/hooks/useScreening";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import type { CatalogItem, Screening } from "@/lib/api";
import { CHAIN, USDC_FAUCET } from "@/lib/config";
import { basescanTx, shortAddr, usdc } from "@/lib/format";
import { jsonError } from "@/lib/json";
import { type PaidResponse, type PayStage, payAndCall, ScreeningBlocked } from "@/lib/pay";

export function PayPage() {
  const { id } = useParams<{ id: string }>();
  const catalog = useCatalog();
  const item = catalog.data?.find((c) => c.id === id);

  return (
    <div className="min-h-dvh bg-canvas">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 pt-2 pb-16 sm:px-6">
        {catalog.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : catalog.error ? (
          <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
        ) : !item ? (
          <div className="card">
            <EmptyState
              icon={<Zap className="size-5" />}
              title="These credits aren’t for sale"
              action={
                <Link href="/" className="btn btn-ghost">
                  Go to Tollgate
                </Link>
              }
            >
              It may be paused, deleted, or the link is wrong.
            </EmptyState>
          </div>
        ) : (
          <PayView key={item.id} item={item} />
        )}
      </main>
    </div>
  );
}

function TopBar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
      <Link href="/" aria-label="Tollgate home">
        <Logo sub={false} />
      </Link>
      {isConnected && address && (
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface py-1 pr-1 pl-1.5 shadow-sm">
          <Avatar seed={address} size={26} />
          <span className="px-1.5 font-mono text-xs text-ink-2">{shortAddr(address)}</span>
          <button className="btn btn-ghost btn-sm size-8 rounded-full px-0" onClick={() => disconnect()} aria-label="Disconnect wallet" title="Disconnect">
            <LogOut className="size-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}

const STAGE_LABEL: Record<PayStage, string> = {
  quote: "Getting the price…",
  screen: "Screening with Intercepta…",
  sign: "Confirm in your wallet…",
  call: "Calling the API…",
};

function PayView({ item }: { item: CatalogItem }) {
  const search = useSearchParams();
  const [query, setQuery] = useState(() => search.toString() || item.exampleQuery);
  const [body, setBody] = useState(item.exampleBody);
  const [stage, setStage] = useState<PayStage>("quote");
  const { address, chainId, isConnected } = useAccount();
  const { data: wallet } = useWalletClient();
  const balance = useUsdcBalance(address);
  // Before paying: Intercepta on the seller's address and USDC. While paying: the
  // actual quote and the authorization, as each screen comes back.
  const pre = usePreScreen(item.payTo);
  const [live, setLive] = useState<Screening[]>([]);

  const pay = useMutation({
    mutationFn: () =>
      payAndCall({ item, wallet: wallet!, address: address!, query, body, onStage: setStage, onScreen: (s) => setLive((l) => [...l, s]) }),
    onSettled: () => balance.refetch(),
  });
  const screenings = live.length ? live : pre.data ? [pre.data] : [];
  const flagged = pre.data?.verdict === "block";

  // object URLs hold the whole response in memory until revoked
  const blobUrl = pay.data?.blobUrl;
  useEffect(() => () => void (blobUrl && URL.revokeObjectURL(blobUrl)), [blobUrl]);

  const bodyError = item.acceptsBody ? jsonError(body) : null;
  const short = balance.data != null && balance.data < item.priceAtomic;
  const price = usdc(item.priceAtomic);

  return (
    <div className="space-y-4">
      <section className="card card-pad">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar seed={item.id} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
              <span className="chip font-mono text-[11px]">{item.method}</span>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-2">{item.description}</p>
          </div>
          <div className="flex w-full items-baseline gap-2 sm:block sm:w-auto sm:text-right">
            <div className="num text-3xl font-semibold tracking-tight">{price}</div>
            <div className="text-xs text-ink-3">USDC per call</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <section className="card card-pad space-y-4">
          <h2 className="card-title">Request</h2>
          <div>
            <label className="label" htmlFor="q">
              Query string
            </label>
            <input id="q" className="input font-mono text-[13px]" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="none" spellCheck={false} />
          </div>
          {item.acceptsBody && (
            <div>
              <label className="label" htmlFor="body">
                JSON body
              </label>
              <JsonField id="body" value={body} onChange={setBody} placeholder="{}" rows={7} />
            </div>
          )}
          {!item.acceptsBody && <p className="text-xs text-ink-3">{item.method} requests have no body.</p>}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card card-pad space-y-4">
            {!isConnected ? (
              <ConnectWallet />
            ) : chainId !== CHAIN.id ? (
              <SwitchChain />
            ) : (
              <>
                <Row label="Price">
                  <span className="num font-medium">{price} USDC</span>
                </Row>
                <Row label="Your balance">
                  {balance.data == null ? <Spinner /> : <span className={`num font-medium ${short ? "text-bad-text" : ""}`}>{usdc(balance.data)}</span>}
                </Row>
                {short && (
                  <div className="rounded-2xl bg-warn/10 p-3 text-sm text-ink-2">
                    Not enough USDC on Base Sepolia.{" "}
                    <a href={USDC_FAUCET} target="_blank" rel="noreferrer" className="font-medium text-accent-text underline-offset-2 hover:underline">
                      Get free test USDC <ExternalLink className="inline size-3" />
                    </a>
                  </div>
                )}
                <button
                  className="btn btn-primary h-12 w-full text-[15px]"
                  disabled={pay.isPending || !wallet || short || !!bodyError || flagged}
                  onClick={() => {
                    pay.reset();
                    setLive([]);
                    pay.mutate();
                  }}
                >
                  {pay.isPending ? <Spinner /> : <Zap className="size-4" />}
                  {pay.isPending ? STAGE_LABEL[stage] : `Pay ${price} and call`}
                </button>
                {bodyError && <p className="text-xs text-bad-text">Fix the JSON body first.</p>}
                {flagged && <p className="text-xs text-bad-text">Intercepta flagged this seller, so paying is disabled.</p>}
              </>
            )}
            <div className="border-t border-line pt-4">
              <ScreeningPanel screenings={screenings} loading={pre.isPending || (pay.isPending && stage === "screen")} error={live.length ? null : pre.error} />
            </div>
            <ul className="space-y-2 border-t border-line pt-4 text-xs text-ink-2">
              <li className="flex gap-2">
                <ShieldCheck className="size-4 shrink-0 text-good-text" />
                You sign a one-time USDC authorization. No gas, no approval.
              </li>
              <li className="flex gap-2">
                <CircleCheck className="size-4 shrink-0 text-good-text" />
                Only charged if the API responds successfully.
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {pay.error && (
        <ErrorState title={pay.error instanceof ScreeningBlocked ? "Blocked before signing" : "Not charged"} error={new Error(friendlyError(pay.error))} />
      )}
      {pay.data && <ResponseCard r={pay.data} />}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-2">{label}</span>
      {children}
    </div>
  );
}

function ConnectWallet() {
  const connectors = useConnectors();
  const { connect, isPending, error } = useConnect();
  // EIP-6963 wallets show up by name; hide the generic entry when one exists
  const named = connectors.filter((c) => c.id !== "injected");
  const list = named.some((c) => c.type === "injected") ? named : connectors;
  const noWallet = named.length === 0 && !(window as { ethereum?: unknown }).ethereum;

  if (noWallet) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-2">Paying needs a browser wallet with Base Sepolia USDC.</p>
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="btn btn-primary h-12 w-full text-[15px]">
          Get MetaMask, it’s free <ExternalLink className="size-4" />
        </a>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-2">Connect a wallet to pay for this call.</p>
      {list.map((c) => (
        <button key={c.uid} className="btn btn-primary h-12 w-full text-[15px]" disabled={isPending} onClick={() => connect({ connector: c, chainId: CHAIN.id })}>
          {isPending ? <Spinner /> : <Wallet className="size-4" />}
          {list.length > 1 ? `Connect ${c.name}` : "Connect wallet"}
        </button>
      ))}
      {error && <p className="text-xs text-bad-text">{friendlyError(error)}</p>}
    </div>
  );
}

function SwitchChain() {
  const { switchChain, isPending, error } = useSwitchChain();
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-2">Payments settle on {CHAIN.name}.</p>
      <button className="btn btn-primary h-12 w-full text-[15px]" disabled={isPending} onClick={() => switchChain({ chainId: CHAIN.id })}>
        {isPending && <Spinner />} Switch to {CHAIN.name}
      </button>
      {error && <p className="text-xs text-bad-text">{friendlyError(error)}</p>}
    </div>
  );
}

function ResponseCard({ r }: { r: PaidResponse }) {
  const ok = r.status >= 200 && r.status < 300;
  const kind = r.contentType?.split(";")[0].trim() ?? "";
  return (
    <section className="card card-pad space-y-4" style={{ animation: "fade-up .35s ease-out" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {ok ? <CircleCheck className="size-5 text-good-text" /> : <CircleX className="size-5 text-bad-text" />}
          <h2 className="card-title">Response</h2>
          <span className="num font-mono text-sm text-ink-2">
            {r.status} · {r.latencyMs} ms{kind && ` · ${kind}`}
          </span>
        </div>
        {r.receipt.paid ? (
          <a href={basescanTx(r.receipt.tx)} target="_blank" rel="noreferrer" className="chip gap-1.5 text-good-text">
            Paid {usdc(r.receipt.amountAtomic)} <ArrowUpRight className="size-3.5" />
          </a>
        ) : (
          <span className="chip text-ink-2">{r.receipt.reason}</span>
        )}
      </div>

      {r.text != null ? (
        <pre className="max-h-[28rem] overflow-auto rounded-2xl border border-line bg-surface-2 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink">
          {r.text || "(empty body)"}
        </pre>
      ) : kind.startsWith("audio/") ? (
        <audio controls src={r.blobUrl!} className="w-full" />
      ) : kind.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.blobUrl!} alt="API response" className="max-h-[28rem] rounded-2xl border border-line" />
      ) : kind.startsWith("video/") ? (
        <video controls src={r.blobUrl!} className="max-h-[28rem] w-full rounded-2xl" />
      ) : (
        <a href={r.blobUrl!} download="response" className="btn btn-ghost">
          <Download className="size-4" /> Download {kind || "response"} ({r.size.toLocaleString("en-US")} bytes)
        </a>
      )}
    </section>
  );
}

function friendlyError(e: unknown): string {
  if (e instanceof ScreeningBlocked) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  if (/Blocked by Intercepta/.test(msg)) return msg.replace(/^.*?(Blocked by Intercepta)/, "$1");
  const code = (e as { code?: number } | null)?.code;
  if (code === 4001 || /user rejected|user denied|rejected the request|denied (transaction|message) signature/i.test(msg)) return "You cancelled in your wallet. Nothing was charged.";
  // x402's own cap (set to the listed price) or our payTo/price check
  if (/spendControls|exceed/i.test(msg)) return "The gateway asked for more than the listed price, so nothing was signed.";
  if (msg.startsWith("Payment creation aborted: ")) return msg.slice("Payment creation aborted: ".length);
  return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
}
