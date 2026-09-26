import { ChevronDown, ExternalLink, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useSession } from "@/lib/auth";
import { CHAIN } from "@/lib/config";
import { basescanAddress, shortAddr, usdc } from "@/lib/format";
import { Avatar } from "./ui";

/** Short address, live USDC balance, network, and a disconnect menu. */
export function WalletPill() {
  const { address, signOut } = useSession();
  const balance = useUsdcBalance(address);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!address) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-2.5 rounded-full border border-line bg-surface py-1 pr-3 pl-1 shadow-sm hover:border-line-strong"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar seed={address} size={34} />
        <div className="hidden text-left leading-tight sm:block">
          <div className="font-mono text-[13px]">{shortAddr(address)}</div>
          <div className="num text-[11px] text-ink-3">{balance.data === undefined ? "… USDC" : `${usdc(balance.data, 2).slice(1)} USDC`}</div>
        </div>
        <ChevronDown className="size-4 text-ink-3" />
      </button>

      {open && (
        <div role="menu" className="card absolute right-0 z-30 mt-2 w-72 p-2">
          <div className="px-3 pt-2 pb-3">
            <div className="text-xs text-ink-3">Wallet USDC balance</div>
            <div className="num mt-0.5 text-2xl font-semibold">{balance.data === undefined ? "…" : usdc(balance.data, 2)}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">
              <span className="size-1.5 rounded-full bg-good" /> {CHAIN.name}
            </div>
          </div>
          <a role="menuitem" href={basescanAddress(address)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
            <ExternalLink className="size-4 text-ink-3" /> View on BaseScan
          </a>
          <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-bad-text hover:bg-surface-2">
            <LogOut className="size-4" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
