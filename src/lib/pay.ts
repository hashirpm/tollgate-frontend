// Pays for one call to /x/:id from the connected wallet, over x402.
//
// The first request gets a 402 quote; the x402 client checks it against the
// catalog, has the wallet sign a USDC transferWithAuthorization (EIP-712, no gas),
// and retries with the signature. The gateway only settles if the upstream
// succeeds, so a failed call costs nothing.

import type { WalletClient } from "viem";
import type { CatalogItem } from "./api";
import { CHAIN } from "./config";
import { atomicToInput, usdc } from "./format";

export type PayStage = "quote" | "sign" | "call";

export type Receipt = { paid: true; amountAtomic: bigint; tx: string; payer: string | null } | { paid: false; reason: string };

export interface PaidResponse {
  status: number;
  latencyMs: number;
  contentType: string | null;
  /** Text-like bodies (JSON is pretty-printed). */
  text: string | null;
  /** Everything else, as an object URL for <audio>, <img> or a download link. */
  blobUrl: string | null;
  size: number;
  receipt: Receipt;
}

const TEXTUAL = /^text\/|json|xml|javascript|x-www-form-urlencoded|graphql/i;

export async function payAndCall(opts: {
  item: CatalogItem;
  wallet: WalletClient;
  address: `0x${string}`;
  query: string;
  body: string;
  onStage?: (s: PayStage) => void;
}): Promise<PaidResponse> {
  const { item, wallet, address, onStage } = opts;
  // Loaded on demand so the x402 client stays out of every other page's bundle.
  const [{ x402Client }, { registerExactEvmScheme }, { wrapFetchWithPayment }, { decodePaymentResponseHeader, decodePaymentRequiredHeader }] = await Promise.all([
    import("@x402/core/client"),
    import("@x402/evm/exact/client"),
    import("@x402/fetch"),
    import("@x402/core/http"),
  ]);

  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer: {
      address,
      signTypedData: (m) => wallet.signTypedData({ account: address, ...m } as Parameters<WalletClient["signTypedData"]>[0]),
    },
    networks: [`eip155:${CHAIN.id}`],
  });
  // Never pay more than the price this page showed.
  client.setSpendControls({ maxAmountPerPayment: `$${atomicToInput(item.priceAtomic)}` });
  client.onBeforePaymentCreation(async ({ selectedRequirements: req }) => {
    if (req.payTo.toLowerCase() !== item.payTo.toLowerCase()) return { abort: true, reason: "The quote pays a different address than this API’s seller." };
    if (BigInt(req.amount) > item.priceAtomic) return { abort: true, reason: `The gateway quoted more than the listed ${usdc(item.priceAtomic)}.` };
    onStage?.("sign");
  });
  client.onAfterPaymentCreation(async () => onStage?.("call"));

  const paidFetch = wrapFetchWithPayment(fetch, client);
  const qs = opts.query.trim().replace(/^\?/, "");
  const init: RequestInit = { method: item.method, headers: { accept: "*/*" } };
  if (item.acceptsBody && opts.body.trim()) {
    init.body = opts.body;
    init.headers = { ...init.headers, "content-type": "application/json" };
  }

  onStage?.("quote");
  const started = performance.now();
  // Same origin: the dashboard proxies /x/* to the gateway.
  const res = await paidFetch(`/x/${encodeURIComponent(item.id)}${qs ? `?${qs}` : ""}`, init);
  const latencyMs = Math.round(performance.now() - started);

  let receipt: Receipt = { paid: false, reason: res.ok ? "The gateway didn’t confirm a payment." : "The API failed, so you weren’t charged." };
  const settled = res.headers.get("payment-response");
  if (settled) {
    try {
      const s = decodePaymentResponseHeader(settled);
      if (s.success) receipt = { paid: true, amountAtomic: BigInt(s.amount ?? item.priceAtomic), tx: s.transaction, payer: s.payer ?? null };
    } catch {
      /* keep "not confirmed" */
    }
  }
  // A 402 after signing means the facilitator rejected the payment.
  const required = res.status === 402 ? res.headers.get("payment-required") : null;
  if (required) {
    try {
      const reason = decodePaymentRequiredHeader(required).error;
      receipt = { paid: false, reason: reason ? `Payment rejected: ${reason}.` : "Payment was not accepted." };
    } catch {
      /* keep the default */
    }
  }

  const contentType = res.headers.get("content-type");
  if (!contentType || TEXTUAL.test(contentType)) {
    const raw = await res.text();
    let text = raw;
    if (contentType?.includes("json")) {
      try {
        text = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        /* show as is */
      }
    }
    return { status: res.status, latencyMs, contentType, text, blobUrl: null, size: raw.length, receipt };
  }
  const blob = await res.blob();
  return { status: res.status, latencyMs, contentType, text: null, blobUrl: URL.createObjectURL(blob), size: blob.size, receipt };
}
