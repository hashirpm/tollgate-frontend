import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };
  return (
    <button type="button" onClick={copy} className={`btn btn-ghost btn-sm ${className}`} aria-label={`${label}: ${text}`}>
      {copied ? <Check className="size-3.5 text-good-text" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** A monospace block with a copy button, for commands and config snippets. */
export function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <span className="text-xs text-ink-3">{title}</span>
          <CopyButton text={code} />
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-ink">{code}</pre>
        {!title && (
          <div className="absolute top-2.5 right-2.5">
            <CopyButton text={code} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Inline URL chip that copies on click. `label` can shorten what's shown; the full URL is copied. */
export function CopyUrl({ url, label }: { url: string; label?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 truncate rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-ink-2" title={url}>
        {label ?? url}
      </code>
      <CopyButton text={url} label="Copy" className="shrink-0" />
    </div>
  );
}
