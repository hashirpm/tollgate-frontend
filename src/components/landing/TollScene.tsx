"use client";

import { Check, Zap } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import { avatarGradient } from "@/lib/format";
import s from "./landing.module.css";

// Illustrative traffic for the hero animation. Nothing here is real data.
const LANES = [
  { agent: "claude-agent", method: "POST", path: "/v1/text-to-speech", price: 0.03, ms: 412 },
  { agent: "video-agent", method: "POST", path: "/kling/text-to-video", price: 0.75, ms: 690 },
] as const;

/**
 * The hero's centrepiece: two toll lanes. Agent requests drive up, the booth
 * answers 402, a USDC coin flies over, the barrier lifts and the request rolls
 * through as 200 OK. The card tilts and a spotlight follows the pointer.
 */
export function TollScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [earned, setEarned] = useState(0);
  const [paid, setPaid] = useState(0);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--ry", `${(x - 0.5) * 7}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 6}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="relative">
      {/* floating accents behind the card */}
      <div aria-hidden className={`absolute -top-6 -left-4 z-20 hidden rounded-2xl border border-line bg-surface px-3 py-2 shadow-lg sm:block ${s.float}`}>
        <div className="text-[10px] tracking-wider text-ink-3 uppercase">HTTP</div>
        <div className="font-mono text-sm font-semibold">
          402 <span className="text-ink-3">→</span> <span className="text-good-text">200</span>
        </div>
      </div>
      <div aria-hidden className={`absolute -right-3 -bottom-5 z-20 hidden items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-3.5 pl-1.5 shadow-lg sm:flex ${s.floatSlow}`}>
        <span className="grid size-6 place-items-center rounded-full bg-[#2775ca] text-[11px] font-bold text-white">$</span>
        <span className="text-xs font-medium">USDC on Base</span>
      </div>

      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className={`relative overflow-hidden rounded-[28px] border border-line bg-surface/80 shadow-[0_30px_80px_-30px_rgb(15_18_25/0.35)] backdrop-blur-xl ${s.tilt} ${s.spot}`}
        role="img"
        aria-label="Animation: AI agents buying leftover API credits stop at a toll barrier, receive HTTP 402, pay in USDC, and pass through with 200 OK."
      >
        {/* window chrome */}
        <div className="relative z-10 flex items-center justify-between border-b border-line px-5 py-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 hidden font-mono text-[11px] text-ink-3 sm:inline">tollgate · live gateway</span>
          </div>
          <div className="text-right leading-tight">
            <div className="text-[10px] tracking-wider text-ink-3 uppercase">
              Earned <span className="hidden sm:inline">while you watched</span>
            </div>
            <div className="num font-mono text-sm font-semibold">
              ${earned.toFixed(4)} <span className="text-[11px] font-normal text-ink-3">· {paid} {paid === 1 ? "call" : "calls"}</span>
            </div>
          </div>
        </div>

        {/* lanes */}
        <div className="relative z-10 space-y-1 px-4 pt-4 pb-40 sm:px-6 sm:pb-40">
          {LANES.map((l, i) => (
            <Lane
              key={l.path}
              lane={l}
              second={i === 1}
              onPaid={() => {
                setEarned((e) => e + l.price);
                setPaid((n) => n + 1);
              }}
            />
          ))}
        </div>

        {/* HTTP replay of lane A */}
        <div className="absolute right-4 bottom-4 left-4 z-10 rounded-2xl border border-line bg-ink p-3.5 font-mono text-[11px] leading-[1.7] text-white/80 shadow-xl sm:right-auto sm:w-[62%]">
          <div className={s.t1}>
            <span className="text-lime">→</span> POST /v1/text-to-speech
          </div>
          <div className={s.t2}>
            <span className="text-[#f87171]">←</span> 402 Payment Required · <span className="text-white">$0.0300 USDC</span>
          </div>
          <div className={s.t3}>
            <span className="text-lime">→</span> X-PAYMENT: 0x9f3c…e21a <span className="text-white/40">signed</span>
          </div>
          <div className={s.t4}>
            <span className="text-[#4ade80]">←</span> 200 OK · 412ms
            <span className={`ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-lime ${s.caret}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Lane({ lane, second, onPaid }: { lane: (typeof LANES)[number]; second: boolean; onPaid: () => void }) {
  return (
    <div className={`relative h-[150px] ${s.lane} ${second ? s.laneB : ""}`}>
      {/* road */}
      <div className={`absolute inset-x-0 bottom-0 h-[2px] ${s.road}`} />

      {/* request chip */}
      <div
        className={`absolute bottom-2 w-[40%] min-w-0 sm:w-[36%] ${s.car}`}
        // every lap is one paid call
        onAnimationIteration={(e) => e.target === e.currentTarget && onPaid()}
      >
        <div className={s.wait}>
          <div className={`flex items-center gap-2 rounded-2xl border border-line-strong bg-surface px-2.5 py-2 shadow-md ${s.req}`}>
            <span className="hidden size-6 shrink-0 rounded-full sm:block" style={{ background: avatarGradient(lane.agent) }} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[10px] text-ink-3">{lane.agent}</span>
              <span className="block truncate font-mono text-[10px] font-medium sm:text-[11px]">
                <span className="text-violet">{lane.method}</span> {lane.path}
              </span>
            </span>
          </div>
          <div className={`absolute inset-0 flex items-center gap-2 rounded-2xl bg-ink px-2.5 py-2 text-white shadow-md ${s.res}`}>
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[10px] text-white/50">paid ${lane.price.toFixed(4)}</span>
              <span className="block truncate font-mono text-[10px] font-medium sm:text-[11px]">200 OK · {lane.ms}ms</span>
            </span>
          </div>
        </div>
      </div>

      {/* barrier arm, hinged at the post */}
      <div className={`absolute bottom-[46px] left-[43%] h-[9px] w-[19%] rounded-full shadow-sm ${s.arm}`} />

      {/* post + booth display */}
      <div className="absolute bottom-0 left-[62%] -translate-x-1/2">
        <div className="relative mx-auto h-[52px] w-[10px] rounded-t-sm bg-ink">
          <span className="absolute -top-[5px] left-1/2 size-[14px] -translate-x-1/2 rounded-full bg-ink ring-[3px] ring-surface" />
          <span className="absolute -top-[1px] left-1/2 size-[6px] -translate-x-1/2 rounded-full bg-lime" />
        </div>
        <div className="mx-auto h-[4px] w-[30px] rounded-full bg-ink" />
      </div>
      <div className="absolute bottom-[14px] left-[calc(62%+16px)]">
        <div className="relative">
          <span className={`absolute inset-0 rounded-lg ring-2 ring-lime ${s.ping}`} />
          <div className="relative grid h-[26px] w-[58px] place-items-center rounded-lg bg-ink font-mono text-[11px] font-semibold shadow-lg">
            <span className={`absolute text-[#f87171] ${s.show402}`}>
              <span className={s.blink}>402</span>
            </span>
            <span className={`absolute inline-flex items-center gap-1 text-lime ${s.showPaid}`}>
              <Zap className="size-3" /> PAID
            </span>
          </div>
        </div>
      </div>

      {/* USDC coin: car → booth */}
      <div className={`absolute z-10 grid size-[22px] place-items-center rounded-full bg-[#2775ca] text-[11px] font-bold text-white shadow-md ring-2 ring-white ${s.coin}`}>$</div>
      {/* +$ pops over the booth */}
      <div className={`absolute bottom-[50px] left-[calc(62%+45px)] font-mono text-xs font-semibold text-accent ${s.plus}`}>+${lane.price.toFixed(4)}</div>
    </div>
  );
}
