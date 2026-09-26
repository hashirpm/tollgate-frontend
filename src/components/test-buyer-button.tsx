"use client";

import { Check, Zap } from "lucide-react";
import { useState } from "react";

/**
 * Placeholder for the hub's POST /testbuyer. Backend wiring is pending, so this
 * only acknowledges the click; swap the handler for the real call later.
 */
export function TestBuyerButton({
  lane,
  variant = "primary",
  label = "Send test payment",
}: {
  lane?: string;
  variant?: "primary" | "ghost";
  label?: string;
}) {
  const [sent, setSent] = useState(false);
  const click = () => {
    setSent(true);
    setTimeout(() => setSent(false), 1800);
  };
  return (
    <button
      onClick={click}
      className={`btn ${variant === "primary" ? "btn-primary" : "btn-ghost"} ${variant === "ghost" ? "h-9 text-[13px]" : ""}`}
      title={lane ? `Buy one call from ${lane} as the demo agent` : "Buy one call as the demo agent"}
    >
      {sent ? <Check className="size-4" /> : <Zap className="size-4" />}
      {sent ? "Queued (mock)" : label}
    </button>
  );
}
