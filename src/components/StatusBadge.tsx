import { CircleCheck, CircleDashed, CirclePause, CircleX } from "lucide-react";
import type { CallStatus, EndpointStatus } from "@/lib/api";

// Status never rides on color alone: every badge is icon + label.

const ENDPOINT: Record<EndpointStatus, { label: string; cls: string; Icon: typeof CircleCheck }> = {
  active: { label: "Active", cls: "bg-good/10 text-good-text", Icon: CircleCheck },
  pending: { label: "Pending test", cls: "bg-warn/15 text-warn-text", Icon: CircleDashed },
  paused: { label: "Paused", cls: "bg-surface-3 text-ink-2", Icon: CirclePause },
};

export function EndpointStatusBadge({ status }: { status: EndpointStatus }) {
  const s = ENDPOINT[status] ?? ENDPOINT.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${s.cls}`}>
      <s.Icon className="size-3.5" />
      {s.label}
    </span>
  );
}

export function CallStatusBadge({ status }: { status: CallStatus }) {
  if (status === "settled")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-good-text">
        <CircleCheck className="size-3.5" /> Settled
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-bad-text" title="The upstream API failed, so the buyer was not charged">
      <CircleX className="size-3.5" /> Failed upstream · not charged
    </span>
  );
}
