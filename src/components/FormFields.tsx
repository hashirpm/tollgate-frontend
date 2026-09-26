"use client";

import { KeyRound, Plus, X } from "lucide-react";
import { jsonError } from "@/lib/json";

export function JsonField({
  value,
  onChange,
  placeholder,
  rows = 6,
  object,
  required,
  invalid,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  object?: boolean;
  required?: boolean;
  /** Set by the form when it has its own error for this field. */
  invalid?: boolean;
  id?: string;
}) {
  const err = jsonError(value, { object });
  const format = () => {
    if (err || !value.trim()) return;
    onChange(JSON.stringify(JSON.parse(value), null, 2));
  };
  return (
    <div>
      <textarea
        id={id}
        className="input h-auto min-h-24 resize-y py-2.5 font-mono text-[13px] leading-relaxed"
        rows={rows}
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        aria-invalid={!!err || !!invalid}
        onChange={(e) => onChange(e.target.value)}
        onBlur={format}
      />
      <div className="mt-1.5 flex justify-between text-xs">
        {err ? <span className="text-bad-text">Invalid JSON: {err}</span> : <span className="text-ink-3">{value.trim() ? "Valid JSON" : required ? "Required" : "Optional"}</span>}
      </div>
    </div>
  );
}

export type KV = { key: string; value: string };

/** Editable key/value rows (static headers). Always keeps one blank row to type into. */
export function KeyValueRows({ rows, onChange, keyPlaceholder = "Header", valuePlaceholder = "Value" }: { rows: KV[]; onChange: (r: KV[]) => void; keyPlaceholder?: string; valuePlaceholder?: string }) {
  const set = (i: number, patch: Partial<KV>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <input className="input font-mono text-[13px]" placeholder={keyPlaceholder} value={r.key} onChange={(e) => set(i, { key: e.target.value })} aria-label={`${keyPlaceholder} ${i + 1}`} />
          <input className="input font-mono text-[13px]" placeholder={valuePlaceholder} value={r.value} onChange={(e) => set(i, { value: e.target.value })} aria-label={`${valuePlaceholder} ${i + 1}`} />
          <button type="button" className="btn btn-ghost size-10 px-0" onClick={() => remove(i)} aria-label="Remove row">
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...rows, { key: "", value: "" }])}>
        <Plus className="size-3.5" /> Add header
      </button>
    </div>
  );
}

/**
 * Write-only secret. A stored secret is never sent back, so on edit the input
 * starts empty and blank means "keep the saved one".
 */
export function SecretField({
  id,
  hasStored,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id?: string;
  hasStored: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      {hasStored && <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />}
      <input
        id={id}
        className={`input font-mono text-[13px] ${hasStored ? "pl-10" : ""}`}
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder={hasStored ? "•••••• saved — leave blank to keep" : placeholder}
        value={value}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
