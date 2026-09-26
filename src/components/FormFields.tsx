import { KeyRound, Plus, X } from "lucide-react";
import { useId } from "react";
import { jsonError } from "@/lib/json";

export function JsonField({
  value,
  onChange,
  placeholder,
  rows = 6,
  object,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  object?: boolean;
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
        aria-invalid={!!err}
        onChange={(e) => onChange(e.target.value)}
        onBlur={format}
      />
      <div className="mt-1.5 flex justify-between text-xs">
        {err ? <span className="text-bad-text">Invalid JSON: {err}</span> : <span className="text-ink-3">{value.trim() ? "Valid JSON" : "Optional"}</span>}
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
 * Write-only secret. On edit, a stored secret is never shown: we display
 * "••• set" with a Replace button. `value === undefined` means "keep".
 */
export function SecretField({
  hasStored,
  value,
  onChange,
  placeholder,
}: {
  hasStored: boolean;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
}) {
  const id = useId();
  if (hasStored && value === undefined) {
    return (
      <div className="flex h-10 items-center justify-between gap-3 rounded-xl border border-line-strong bg-surface-2 pr-1 pl-3.5">
        <span className="flex items-center gap-2 text-sm text-ink-2">
          <KeyRound className="size-4 text-ink-3" />
          <span className="font-mono tracking-widest">•••</span> set
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange("")}>
          Replace
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        id={id}
        className="input font-mono text-[13px]"
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {hasStored && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange(undefined)}>
          Keep current
        </button>
      )}
    </div>
  );
}
