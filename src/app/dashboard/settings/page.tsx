import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";
import { getAccount, getHcsTopicUrl } from "@/lib/data";
import { shortAddr } from "@/lib/format";

export const metadata = { title: "Settings · x402 Maker" };

export default async function SettingsPage() {
  const [account, hcsTopicUrl] = await Promise.all([getAccount(), getHcsTopicUrl()]);
  return (
    <>
      <PageHeader title="Settings" sub="Payout, network and credentials for this workspace." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Block title="Payout">
          <Row k="Settlement wallet" sub="Where settled x402 payments land">
            <Field mono>{shortAddr(account.addr)}</Field>
            <Link href="/" className="btn btn-ghost h-8 text-xs">
              Disconnect
            </Link>
          </Row>
          <Row k="Hedera account" sub="Lazy-created for this wallet on first payment">
            <Field mono>{account.accountId}</Field>
            <ExtLink href={`https://hashscan.io/testnet/account/${account.accountId}`}>HashScan</ExtLink>
          </Row>
          <Row k="Testnet balance" sub="Also visible in MetaMask on Hedera Testnet">
            <Field mono>{account.balance.toFixed(4)} ℏ</Field>
          </Row>
          <Row k="Payout token" sub="Stablecoin used for settlement">
            <Field>USDC</Field>
          </Row>
        </Block>

        <Block title="Network">
          <Row k="Settlement network" sub="Receipts are anchored here">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs">
              <span className="size-2 rounded-full bg-good" /> {account.network}
            </span>
          </Row>
          <Row k="Facilitator" sub="x402 payment facilitator endpoint">
            <Field mono>{account.facilitator}</Field>
          </Row>
          <Row k="Receipt topic" sub="Every payment is logged to HCS">
            <ExtLink href={hcsTopicUrl}>0.0.6841990</ExtLink>
          </Row>
        </Block>

        <Block title="API credentials" className="xl:col-span-2">
          <Row k="Gateway command" sub="Used by the x402ify CLI">
            <Field mono>npx x402ify … --wallet {shortAddr(account.addr)}</Field>
          </Row>
          <Row k="Hub URL" sub="Pass with --hub to stream events here">
            <Field mono>http://localhost:4021</Field>
          </Row>
          <Row k="Webhook" sub="POST on every settlement">
            <Field>Not configured</Field>
          </Row>
        </Block>
      </div>
    </>
  );
}

function Block({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
        <h2 className="card-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ k, sub, children }: { k: string; sub: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-line px-5 py-4 first-of-type:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <div className="text-sm text-ink">{k}</div>
        <div className="text-xs text-ink-3">{sub}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Field({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <span className={`rounded-xl border border-line bg-canvas px-3 py-1.5 text-[13px] text-ink-2 ${mono ? "font-mono" : ""}`}>
      {children}
    </span>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-2 hover:text-lime">
      {children} <ExternalLink className="size-3" />
    </a>
  );
}
