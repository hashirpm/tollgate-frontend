/** Validates JSON as you type. Empty is allowed (means "none"). */
export function jsonError(text: string, opts: { object?: boolean } = {}): string | null {
  if (!text.trim()) return null;
  try {
    const v = JSON.parse(text);
    if (opts.object && (v === null || typeof v !== "object" || Array.isArray(v))) return "Must be a JSON object, like {\"key\": \"value\"}";
    return null;
  } catch (e) {
    return e instanceof Error ? e.message.replace(/^JSON\.parse: /, "") : "Invalid JSON";
  }
}
