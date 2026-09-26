"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { CLAUDE_CONNECTOR_LINK, MCP_URL } from "@/lib/config";

/**
 * Claude's install link: opens "Add custom connector" with Tollgate prefilled.
 * Claude doesn't always show that dialog (e.g. a Free plan already at its one
 * custom connector), so the click also copies the URL for Add → Custom connector.
 */
export function AddToClaudeButton({ onCopied, className = "h-14 rounded-2xl px-6 text-base" }: { onCopied?: () => void; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    // the manual fallback is shown even if the clipboard write fails
    onCopied?.();
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
      className={`btn group bg-ink text-white shadow-[0_12px_30px_-12px_rgb(14_17_22/0.6)] hover:bg-ink/90 ${className}`}
    >
      {copied ? <Check className="size-5 text-lime" /> : <Plus className="size-5 transition-transform group-hover:rotate-90" />}
      {copied ? "Opened Claude · URL copied" : "Add to Claude"}
    </a>
  );
}
