"use client";

import { Check, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import { shortAddr } from "@/lib/format";
import { LiveDot } from "./ui";

type Mode = "cli" | "claude" | "codex";
const MODES: { id: Mode; label: string }[] = [
  { id: "cli", label: "CLI" },
  { id: "claude", label: "Claude Code" },
  { id: "codex", label: "Codex" },
];
const CHAINS = ["hedera", "base", "solana"] as const;

// The agent prompt carries everything the CLI flags carry, because whoever
// pastes it won't know the flags.
function agentPrompt(url: string, wallet: string, chain: string, price: string, tool: string): string {
  return [
    `Use ${tool} to put my API behind x402 pay-per-call so AI agents can pay to use it.`,
    ``,
    `API: ${url}`,
    `Price: $${price} per request, settled on ${chain}`,
    `Payouts go to: ${wallet}`,
    ``,
    `Run:`,
    `  npx x402ify ${url} --price ${price} --chain ${chain} --wallet ${wallet}`,
    ``,
    `Notes:`,
    `- If the API needs a key, keep it on my machine: pass it with --header "Name: value"`,
    `  or --query "key=value" so it never reaches the caller.`,
    `- Add --sample "/some/path" pointing at a cheap real endpoint.`,
    `- Verify: curl the sample path, confirm it answers 402 with a price, and tell me the`,
    `  local gateway URL. Don't report success on a running process alone.`,
  ].join("\n");
}

export function ConnectApiCard({ wallet, hero = false }: { wallet: string; hero?: boolean }) {
  const [mode, setMode] = useState<Mode>("cli");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("0.01");
  const [chain, setChain] = useState<(typeof CHAINS)[number]>("hedera");
  const [copied, setCopied] = useState(false);
  const apiUrl = url.trim() || "https://your-api.com";

  const text =
    mode === "cli"
      ? `npx x402ify ${apiUrl} --price ${price} --chain ${chain} --wallet ${wallet}`
      : agentPrompt(apiUrl, wallet, chain, price, mode === "claude" ? "Claude Code" : "Codex");

  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div id="connect" className={`card card-pad relative overflow-hidden ${hero ? "border-lime/25" : ""}`}>
      <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-lime/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-surface-3">
                <Terminal className="size-4 text-lime" />
              </span>
              <div className="card-title">{hero ? "Connect your first API" : "Connect another API"}</div>
            </div>
            <p className="mt-2 max-w-lg text-sm text-ink-2">
              Wrap any HTTP endpoint with x402 metering in one command. Payments settle to{" "}
              <span className="font-mono text-ink">{shortAddr(wallet)}</span>. No code changes.
            </p>
          </div>
          <div className="flex rounded-full bg-surface-2 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`h-8 rounded-full px-3.5 text-xs transition-colors ${
                  mode === m.id ? "bg-ink text-canvas font-medium" : "text-ink-3 hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
          <input
            className="input font-mono"
            placeholder="https://your-api.com"
            value={url}
            spellCheck={false}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="API URL"
          />
          <label className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-ink-3">$</span>
            <input
              className="input num pl-7 font-mono"
              value={price}
              inputMode="decimal"
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              aria-label="Price per call"
            />
          </label>
          <div className="flex gap-1 rounded-full bg-surface-2 p-1">
            {CHAINS.map((c) => (
              <button
                key={c}
                onClick={() => setChain(c)}
                className={`h-8 flex-1 rounded-full px-3 text-xs capitalize transition-colors ${
                  chain === c ? "bg-surface-3 text-ink" : "text-ink-3 hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-3 rounded-2xl border border-line bg-canvas p-4 pr-24 font-mono text-[13px] leading-relaxed">
          {mode === "cli" ? (
            <div className="break-all">
              <span className="text-lime">$</span> npx x402ify <span className="text-ink">{apiUrl}</span>{" "}
              <span className="text-violet">--price</span> <span className="text-[#f0b35a]">{price}</span>{" "}
              <span className="text-violet">--chain</span> <span className="text-[#f0b35a]">{chain}</span>{" "}
              <span className="text-violet">--wallet</span> <span className="text-ink-2">{shortAddr(wallet)}</span>
            </div>
          ) : (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-ink-2">{text}</pre>
          )}
          <button onClick={copy} className="btn btn-ghost absolute top-3 right-3 h-8 px-3 text-xs">
            {copied ? <Check className="size-3.5 text-lime" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2.5 text-xs text-ink-2">
          <LiveDot />
          {mode === "cli"
            ? "Listening for your gateway. The API appears here the moment it comes online."
            : `Paste this into ${mode === "claude" ? "Claude Code" : "Codex"}. Your API appears here once its gateway is up.`}
        </div>
      </div>
    </div>
  );
}
