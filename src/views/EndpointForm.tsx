"use client";

import { ArrowLeft, ArrowRight, ChevronDown, CircleCheck, CircleX, Clock, ExternalLink, FlaskConical, Info, Plus, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CopyUrl } from "@/components/CopyButton";
import { JsonField, type KV, KeyValueRows, SecretField } from "@/components/FormFields";
import { jsonError } from "@/lib/json";
import { ErrorState, Field, PageHeader, Skeleton, Spinner } from "@/components/ui";
import { useEndpoint, useSaveEndpoint, useTestEndpoint } from "@/hooks/useEndpoints";
import {
  ApiError,
  type ApiIssue,
  type AuthInput,
  type AuthType,
  DEFAULT_MAX_BODY_BYTES,
  type Endpoint,
  type EndpointInput,
  type EndpointPatch,
  HTTP_METHODS,
  type HttpMethod,
  paidUrl,
  type SavedEndpoint,
  type TestResult,
} from "@/lib/api";
import { atomicToInput, usdToAtomic } from "@/lib/format";
import { type CreditTemplate, TEMPLATE_CATEGORIES, TEMPLATES, templateFor, withKeyPrefix } from "@/lib/templates";

const BODY_METHODS: HttpMethod[] = ["POST", "PUT", "PATCH"];
const MAX_PRICE_ATOMIC = 100_000_000n; // $100, the Worker's cap
const MAX_BODY_LIMIT = 1_048_576;

interface FormState {
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  authType: AuthType;
  authName: string;
  /** Blank = keep the stored secret (edit) or none typed yet (create). */
  authValue: string;
  headers: KV[];
  price: string;
  exampleQuery: string;
  exampleBody: string;
  bodyOverrides: string;
  maxBodyBytes: string;
  screenPayers: boolean;
}

function initialState(ep?: Endpoint): FormState {
  return {
    name: ep?.name ?? "",
    description: ep?.description ?? "",
    method: ep?.method ?? "GET",
    url: ep?.url ?? "",
    authType: ep?.authType ?? "none",
    authName: ep?.authName ?? "",
    authValue: "",
    headers: ep && Object.keys(ep.staticHeaders).length ? Object.entries(ep.staticHeaders).map(([key, value]) => ({ key, value })) : [],
    price: ep ? atomicToInput(ep.priceAtomic) : "0.01",
    exampleQuery: ep?.exampleQuery ?? "",
    exampleBody: ep?.exampleBody ?? "",
    bodyOverrides: ep?.bodyOverrides ?? "",
    maxBodyBytes: String(ep?.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES),
    screenPayers: ep?.screenPayers ?? true,
  };
}

/** Prefill everything but the key and the screening choice. */
function applyTemplate(t: CreditTemplate, f: FormState): FormState {
  const hasBody = BODY_METHODS.includes(t.method);
  return {
    ...f,
    name: t.name,
    description: t.description,
    method: t.method,
    url: t.url,
    authType: t.auth.type,
    authName: t.auth.name,
    headers: Object.entries(t.headers ?? {}).map(([key, value]) => ({ key, value })),
    price: t.price,
    exampleQuery: t.exampleQuery ?? "",
    exampleBody: hasBody && t.exampleBody !== undefined ? JSON.stringify(t.exampleBody, null, 2) : "",
    bodyOverrides: t.bodyOverrides ? JSON.stringify(t.bodyOverrides, null, 2) : "",
    maxBodyBytes: String(t.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES),
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

// Fields that sit under "Advanced" when a template is in use.
const ADVANCED_FIELDS: (keyof FormState)[] = ["method", "url", "authName", "headers", "exampleQuery", "exampleBody", "bodyOverrides", "maxBodyBytes"];

function validate(f: FormState, hasStoredSecret: boolean): Errors {
  const e: Errors = {};
  const hasBody = BODY_METHODS.includes(f.method);
  if (!f.name.trim()) e.name = "Give it a name buyers will recognize.";
  else if (f.name.trim().length > 80) e.name = "Keep it under 80 characters.";
  if (!f.description.trim()) e.description = "Say what a call returns. Buyers and Claude read this to decide whether to buy it.";
  else if (f.description.trim().length > 2000) e.description = "Keep it under 2,000 characters.";
  try {
    const u = new URL(f.url.trim());
    if (u.protocol !== "https:") e.url = "The provider API must be https://";
  } catch {
    e.url = "Enter a full URL, like https://api.example.com/v1/search";
  }
  if (f.authType !== "none") {
    if (!f.authName.trim()) e.authName = f.authType === "header" ? "Header name, e.g. Authorization" : "Query parameter, e.g. api_key";
    if (!f.authValue.trim() && !hasStoredSecret) e.authValue = "The API key your credits are on.";
  }
  const atomic = usdToAtomic(f.price);
  if (atomic === null) e.price = "A dollar amount with up to 6 decimals, e.g. 0.01";
  else if (atomic <= 0n) e.price = "Price must be more than $0.";
  else if (atomic > MAX_PRICE_ATOMIC) e.price = "Price can be at most $100.";
  if (f.headers.some((h) => !h.key.trim() && h.value.trim())) e.headers = "Every header needs a name.";
  else if (f.headers.filter((h) => h.key.trim()).length > 20) e.headers = "At most 20 static headers.";
  if (f.exampleQuery.trim().length > 2000) e.exampleQuery = "Keep it under 2,000 characters.";
  const overrides = hasBody && f.bodyOverrides.trim();
  if (hasBody) {
    if (!f.exampleBody.trim()) e.exampleBody = `${f.method} requests need an example body. The test call sends it to the provider.`;
    else if (jsonError(f.exampleBody)) e.exampleBody = "Fix the JSON first.";
    else if (overrides && jsonError(f.exampleBody, { object: true })) e.exampleBody = "Must be a JSON object, because body overrides are merged into it.";
  }
  if (overrides && jsonError(f.bodyOverrides, { object: true })) e.bodyOverrides = "Must be a JSON object, like {\"max_tokens\": 500}.";
  const maxb = f.maxBodyBytes.trim();
  if (!/^\d+$/.test(maxb) || Number(maxb) > MAX_BODY_LIMIT) e.maxBodyBytes = `Whole number of bytes, 0 to ${MAX_BODY_LIMIT.toLocaleString("en-US")}.`;
  return e;
}

/** Parsed JSON, or the raw text if it doesn't parse (validation stops that for new input). */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toAuth(f: FormState): AuthInput {
  if (f.authType === "none") return { type: "none" };
  const value = f.authValue.trim();
  // write-only secret: only sent when the seller typed one, otherwise the server keeps what it has
  return value ? { type: f.authType, name: f.authName.trim(), value } : { type: f.authType, name: f.authName.trim() };
}

/** The full POST body, in the Worker's field order. */
function toInput(f: FormState): EndpointInput {
  const hasBody = BODY_METHODS.includes(f.method);
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    method: f.method,
    url: f.url.trim(),
    auth: toAuth(f),
    static_headers: Object.fromEntries(f.headers.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value])),
    // normalized so ".5" or "1." still pass the Worker's decimal check
    price_usd: atomicToInput(usdToAtomic(f.price)!),
    example_query: f.exampleQuery.trim().replace(/^\?/, "") || null,
    example_body: hasBody && f.exampleBody.trim() ? parseJson(f.exampleBody) : null,
    body_overrides: hasBody && f.bodyOverrides.trim() ? (parseJson(f.bodyOverrides) as Record<string, unknown>) : null,
    max_body_bytes: Number(f.maxBodyBytes.trim()),
    screen_payers: f.screenPayers,
  };
}

/** Only the fields that differ from what the server has. */
function toPatch(saved: Endpoint, f: FormState): EndpointPatch {
  const before = toInput(initialState(saved));
  const after = toInput(f);
  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(after) as (keyof EndpointInput)[]) {
    if (k !== "auth" && JSON.stringify(after[k]) !== JSON.stringify(before[k])) patch[k] = after[k];
  }
  const a = after.auth;
  const b = before.auth;
  const sameAuth = a.type === b.type && (a.type === "none" || (b.type !== "none" && a.name === b.name));
  if (!sameAuth || (a.type !== "none" && a.value)) patch.auth = a;
  return patch as EndpointPatch;
}

// Worker issue paths → form fields. Longest prefix first.
const ISSUE_FIELDS: [string, keyof FormState][] = [
  ["auth.value", "authValue"],
  ["auth", "authName"],
  ["static_headers", "headers"],
  ["price_usd", "price"],
  ["example_query", "exampleQuery"],
  ["example_body", "exampleBody"],
  ["body_overrides", "bodyOverrides"],
  ["max_body_bytes", "maxBodyBytes"],
  ["screen_payers", "screenPayers"],
  ["description", "description"],
  ["method", "method"],
  ["name", "name"],
  ["url", "url"],
];

/** Some errors come without a path but name the field, e.g. "auth.value is required" or "url must use https". */
function fieldFor(issue: ApiIssue): keyof FormState | undefined {
  const path = issue.path || issue.message.match(/^([a-z_]+(?:\.[a-z_]+)*)\b/)?.[1] || "";
  return ISSUE_FIELDS.find(([p]) => path === p || path.startsWith(`${p}.`))?.[1];
}

function splitIssues(err: unknown): { fields: Errors; rest: string[] } {
  const fields: Errors = {};
  const rest: string[] = [];
  if (!(err instanceof ApiError)) return { fields, rest };
  for (const issue of err.issues) {
    const k = fieldFor(issue);
    if (k) fields[k] ??= issue.message;
    else rest.push(issue.path ? `${issue.path}: ${issue.message}` : issue.message);
  }
  return { fields, rest };
}

export function EndpointFormPage() {
  const { id } = useParams<{ id?: string }>();
  const existing = useEndpoint(id);

  if (id && existing.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (id && existing.error) return <ErrorState error={existing.error} onRetry={() => existing.refetch()} />;
  // keyed so the form re-initializes if you jump between endpoints
  return <EndpointForm key={id ?? "new"} existing={existing.data} />;
}

function EndpointForm({ existing }: { existing?: Endpoint }) {
  const router = useRouter();
  const save = useSaveEndpoint();
  const test = useTestEndpoint();
  const [f, setF] = useState<FormState>(() => initialState(existing));
  const [touched, setTouched] = useState(false);
  // what the server has now: the baseline for PATCH diffs, and the source of auth_set
  const [saved, setSaved] = useState<Endpoint | undefined>(existing);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [step, setStep] = useState<"form" | "test">("form");
  const [retestReason, setRetestReason] = useState(false);
  // undefined: still choosing a provider (new listings only); null: custom API
  const [template, setTemplate] = useState<CreditTemplate | null | undefined>(() => (existing ? (templateFor(existing.url) ?? null) : undefined));
  const [advanced, setAdvanced] = useState(false);

  const hasStoredSecret = !!saved?.hasAuthValue;
  const errors = validate(f, hasStoredSecret);
  const show = (k: keyof FormState) => (touched ? errors[k] : undefined) ?? serverErrors[k];
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setServerErrors((e) => {
      if (!(k in e)) return e;
      const next = { ...e };
      delete next[k];
      return next;
    });
  };
  const hasBody = BODY_METHODS.includes(f.method);
  const { rest: otherErrors } = splitIssues(save.error);
  const fieldErrorCount = Object.keys(serverErrors).length;

  const scrollToInvalid = () =>
    requestAnimationFrame(() => document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));

  const runTest = (id: string, afterEdit: boolean) => {
    setRetestReason(afterEdit);
    setStep("test");
    test.mutate(id);
  };

  const onSaved = ({ endpoint, retestRequired }: SavedEndpoint) => {
    const created = !saved;
    setSaved(endpoint);
    // re-seed from the server's copy so the next diff starts from what it stored
    setF(initialState(endpoint));
    setTouched(false);
    if (created) runTest(endpoint.id, false);
    else if (retestRequired || endpoint.status === "pending") runTest(endpoint.id, retestRequired);
    else router.push(`/endpoints/${endpoint.id}`);
  };

  const revealAdvanced = (errs: Errors) => {
    if (template && ADVANCED_FIELDS.some((k) => errs[k])) setAdvanced(true);
  };

  const onSaveError = (err: unknown) => {
    const { fields } = splitIssues(err);
    setServerErrors(fields);
    revealAdvanced(fields);
    if (Object.keys(fields).length) scrollToInvalid();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerErrors({});
    if (Object.keys(errors).length) {
      revealAdvanced(errors);
      return scrollToInvalid();
    }
    // templates ask for the bare key; the provider's scheme ("Bearer ", "Key ") is added here
    const out = { ...f, authValue: withKeyPrefix(template, f.authValue) };

    if (!saved) {
      save.mutate({ input: toInput(out) }, { onSuccess: onSaved, onError: onSaveError });
      return;
    }
    const patch = toPatch(saved, out);
    if (!Object.keys(patch).length) {
      // nothing changed: a pending endpoint still needs its test, anything else is done
      if (saved.status === "pending") runTest(saved.id, false);
      else router.push(`/endpoints/${saved.id}`);
      return;
    }
    save.mutate({ id: saved.id, input: patch }, { onSuccess: onSaved, onError: onSaveError });
  };

  if (step === "test" && saved) {
    return (
      <TestStep
        id={saved.id}
        name={saved.name}
        retest={retestReason}
        result={test.data}
        error={test.error}
        running={test.isPending}
        onRetest={() => test.mutate(saved.id)}
        onEdit={() => {
          test.reset();
          setStep("form");
        }}
        onDone={() => router.push(`/endpoints/${saved.id}`)}
      />
    );
  }

  if (template === undefined) {
    return (
      <TemplatePicker
        onPick={(t) => {
          setTemplate(t);
          if (t) setF((s) => applyTemplate(t, s));
        }}
      />
    );
  }

  const nameField = (
    <Field label="Name" htmlFor="name" error={show("name")}>
      <input id="name" className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Spare ElevenLabs credits" aria-invalid={!!show("name")} />
    </Field>
  );
  const methodField = (
    <Field label="Method" htmlFor="method" error={show("method")}>
      <select id="method" className="input" value={f.method} onChange={(e) => set("method", e.target.value as HttpMethod)}>
        {HTTP_METHODS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
    </Field>
  );
  const descriptionField = (
    <Field
      label="Description"
      htmlFor="desc"
      error={show("description")}
      hint={<ClaudeHint>Buyers and Claude read this to decide whether to buy a call. Say what it returns and what it’s good for.</ClaudeHint>}
    >
      <textarea
        id="desc"
        aria-invalid={!!show("description")}
        className="input h-auto min-h-20 resize-y py-2.5"
        rows={3}
        value={f.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="Text to speech with ElevenLabs. Send {&quot;text&quot;: &quot;...&quot;} and get back MP3 audio."
      />
    </Field>
  );
  const urlField = (
    <Field label="Provider API URL" htmlFor="url" error={show("url")} hint="Must be https. The server also checks it isn't a private address.">
      <input
        id="url"
        className="input font-mono text-[13px]"
        value={f.url}
        inputMode="url"
        spellCheck={false}
        onChange={(e) => set("url", e.target.value)}
        placeholder="https://api.elevenlabs.io/v1/text-to-speech/…"
        aria-invalid={!!show("url")}
      />
    </Field>
  );
  const keyField = (label: string, placeholder: string, hint?: ReactNode) => (
    <Field
      label={label}
      htmlFor="authValue"
      error={show("authValue")}
      hint={
        <>
          {hint}
          {hasStoredSecret ? "A key is saved. Paste a new one to replace it." : "Write-only. Kept encrypted on the server and never shown again."}
        </>
      }
    >
      <SecretField id="authValue" invalid={!!show("authValue")} hasStored={hasStoredSecret} value={f.authValue} onChange={(v) => set("authValue", v)} placeholder={placeholder} />
    </Field>
  );
  // with a template the key is asked for up top, so this only covers where it goes
  const authSection = (withValue: boolean) => (
    <Section title={withValue ? "API key" : "How the key is sent"} sub="The key your credits are on. The gateway attaches it to each call; buyers never see it.">
      <div className="seg w-fit">
        {(["none", "header", "query"] as AuthType[]).map((t) => (
          <button type="button" key={t} data-active={f.authType === t} className="seg-btn px-4 capitalize" onClick={() => set("authType", t)}>
            {t === "none" ? "None" : t === "header" ? "Header" : "Query param"}
          </button>
        ))}
      </div>
      {f.authType !== "none" && (
        <div className={withValue ? "grid gap-4 sm:grid-cols-[1fr_1.4fr]" : "max-w-xs"}>
          <Field label={f.authType === "header" ? "Header name" : "Parameter name"} htmlFor="authName" error={show("authName")}>
            <input
              id="authName"
              className="input font-mono text-[13px]"
              value={f.authName}
              onChange={(e) => set("authName", e.target.value)}
              placeholder={f.authType === "header" ? "Authorization" : "api_key"}
              aria-invalid={!!show("authName")}
            />
          </Field>
          {withValue && keyField("Value", f.authType === "header" ? "Bearer sk-…" : "your-api-key")}
        </div>
      )}
      {!withValue && template?.auth.prefix && (
        <p className="text-xs text-ink-3">
          Sent as <span className="font-mono text-ink-2">{template.auth.prefix.trim()} &lt;your key&gt;</span>. The prefix is added for you.
        </p>
      )}
    </Section>
  );
  const technical = (
    <>
      <Section title="Static headers" sub="Sent on every call to the provider, e.g. anthropic-version or content-type.">
        <KeyValueRows rows={f.headers} onChange={(r) => set("headers", r)} keyPlaceholder="Prefer" valuePlaceholder="wait" />
        {show("headers") && <div className="text-xs text-bad-text">{show("headers")}</div>}
      </Section>

      <Section title="Example request" sub={<ClaudeHint>Claude copies this when it calls you, so make it a real, working request.</ClaudeHint>}>
        <Field label="Query string" htmlFor="q" error={show("exampleQuery")} hint="Without the leading ?">
          <input id="q" aria-invalid={!!show("exampleQuery")} className="input font-mono text-[13px]" value={f.exampleQuery} onChange={(e) => set("exampleQuery", e.target.value)} placeholder="model=nova-3" spellCheck={false} />
        </Field>
        {hasBody ? (
          <Field label="JSON body" htmlFor="exampleBody" error={show("exampleBody")}>
            <JsonField
              id="exampleBody"
              value={f.exampleBody}
              onChange={(v) => set("exampleBody", v)}
              placeholder={'{\n  "text": "Hello"\n}'}
              required
              invalid={!!show("exampleBody")}
            />
          </Field>
        ) : (
          <p className="text-xs text-ink-3">{f.method} requests have no body. Switch the method to POST/PUT/PATCH to add one.</p>
        )}
      </Section>

      <Section title="Spend guards" sub="Stop any single call from burning through your credits. Enforced before anything reaches the provider.">
        <Field
          label="Body overrides"
          htmlFor="bodyOverrides"
          error={show("bodyOverrides")}
          hint={hasBody ? "JSON object merged over every buyer's body, e.g. {\"num_images\": 1} to cap what one call can spend." : "Only applies to requests with a body."}
        >
          <JsonField id="bodyOverrides" value={f.bodyOverrides} onChange={(v) => set("bodyOverrides", v)} placeholder='{"num_images": 1}' rows={3} object invalid={!!show("bodyOverrides")} />
        </Field>
        <Field label="Max body size" htmlFor="maxb" error={show("maxBodyBytes")} hint="Bytes, up to 1,048,576. Larger requests are rejected before payment.">
          <input id="maxb" aria-invalid={!!show("maxBodyBytes")} className="input num w-48 font-mono" inputMode="numeric" value={f.maxBodyBytes} onChange={(e) => set("maxBodyBytes", e.target.value)} placeholder="65536" />
        </Field>
      </Section>
    </>
  );

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={existing ? `Edit ${existing.name}` : template ? `List ${template.provider} credits` : "List credits"}
        sub={
          existing
            ? "Name, description, price and examples apply right away. Changing the provider API, key or spend guards needs a new test."
            : template
              ? "Paste your key and set a price. Everything else is filled in for you."
              : "Connect the API your leftover credits are on, set a price per call, then test it to go live."
        }
      >
        {!existing && (
          <button type="button" className="btn btn-ghost" onClick={() => setTemplate(undefined)}>
            <ArrowLeft className="size-4" /> Providers
          </button>
        )}
        <Link href={existing ? `/endpoints/${existing.id}` : "/endpoints"} className="btn btn-ghost">
          Cancel
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {template ? (
            <>
              <section className="card card-pad">
                <div className="flex items-center gap-4">
                  <ProviderTile t={template} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {template.provider} · {template.product}
                    </div>
                    <div className="text-sm text-ink-2">{template.blurb}</div>
                  </div>
                </div>
                {template.async && (
                  <p className="mt-4 flex items-start gap-2 rounded-2xl bg-warn/10 p-3 text-xs text-warn-text">
                    <Clock className="mt-px size-3.5 shrink-0" /> Asynchronous: {template.async}
                  </p>
                )}
                <div className="mt-5">
                  {keyField(
                    template.keyLabel ?? `${template.provider} API key`,
                    template.keyPlaceholder,
                    <>
                      <a href={template.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent-text underline-offset-2 hover:underline">
                        Get your key <ExternalLink className="size-3" />
                      </a>
                      {" · "}
                    </>,
                  )}
                </div>
              </section>

              <Section title="Listing" sub="What buyers and Claude see. Pre-filled; edit if you like.">
                {nameField}
                {descriptionField}
              </Section>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4 text-left text-sm hover:bg-surface-2"
                onClick={() => setAdvanced((a) => !a)}
                aria-expanded={advanced}
              >
                <span>
                  <span className="font-medium">Advanced</span>
                  <span className="ml-2 text-ink-3">Provider URL, headers, example request and spend guards</span>
                </span>
                <ChevronDown className={`size-4 text-ink-3 transition-transform ${advanced ? "rotate-180" : ""}`} />
              </button>
              {advanced && (
                <>
                  <Section title="Provider API">
                    <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                      {methodField}
                      {urlField}
                    </div>
                  </Section>
                  {authSection(false)}
                  {technical}
                </>
              )}
            </>
          ) : (
            <>
              <Section title="Basics">
                <div className="grid gap-4 sm:grid-cols-2">
                  {nameField}
                  {methodField}
                </div>
                {descriptionField}
                {urlField}
              </Section>
              {authSection(true)}
              {technical}
            </>
          )}
        </div>

        {/* sticky summary / submit */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="card card-pad space-y-5">
            <Field
              label="Price per request"
              htmlFor="price"
              error={show("price")}
              hint={
                template
                  ? `What a buyer pays per call, in USDC. Suggested: $${template.price}. Price it above what one call costs you in credits.`
                  : "What a buyer pays per call, in USDC. Price it above what one call costs you in credits."
              }
            >
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3">$</span>
                <input
                  id="price"
                  className="input num h-12 pl-7 font-mono text-lg"
                  inputMode="decimal"
                  value={f.price}
                  onChange={(e) => set("price", e.target.value.replace(/[^0-9.]/g, ""))}
                  aria-invalid={!!show("price")}
                />
              </div>
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-3.5 hover:bg-surface-2">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-accent)]"
                checked={f.screenPayers}
                onChange={(e) => set("screenPayers", e.target.checked)}
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <ShieldCheck className="size-4 text-good-text" /> Screen payers with Intercepta
                </span>
                <span className="mt-0.5 block text-xs text-ink-2">
                  Refuse payments from sanctioned, scam or phishing wallets before they settle. Changing this needs no re-test.
                </span>
              </span>
            </label>

            {saved && (
              <div>
                <div className="label">Paid URL</div>
                <CopyUrl url={paidUrl(saved.id)} />
              </div>
            )}

            {save.error &&
              (otherErrors.length || !fieldErrorCount ? (
                <ErrorState title="Couldn’t save" error={otherErrors.length ? new Error(otherErrors.join(" · ")) : save.error} />
              ) : (
                <ErrorState title="Couldn’t save" error={new Error(`Fix the ${fieldErrorCount === 1 ? "highlighted field" : `${fieldErrorCount} highlighted fields`} and try again.`)} />
              ))}

            <button type="submit" className="btn btn-primary h-12 w-full text-[15px]" disabled={save.isPending}>
              {save.isPending ? <Spinner /> : saved ? <Save className="size-4" /> : <FlaskConical className="size-4" />}
              {save.isPending ? "Saving…" : saved ? "Save changes" : "Save and test"}
            </button>
            <p className="text-xs text-ink-3">
              {saved
                ? "If you change the provider API, key, headers or spend guards, we re-run the test before agents can buy again."
                : "We make one real call with your key. A 2xx response puts your credits up for sale."}
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

function TemplatePicker({ onPick }: { onPick: (t: CreditTemplate | null) => void }) {
  return (
    <>
      <PageHeader title="List credits" sub="Which service are your leftover credits on? Pick one and we fill in the technical details. You just add your key and a price.">
        <Link href="/endpoints" className="btn btn-ghost">
          <ArrowLeft className="size-4" /> Cancel
        </Link>
      </PageHeader>
      <div className="space-y-8">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <section key={cat}>
            <h2 className="mb-3 text-xs font-medium tracking-[0.14em] text-ink-3 uppercase">{cat}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onPick(t)}
                  className="card group flex items-start gap-4 p-4 text-left transition-colors hover:border-ink-3 hover:bg-surface-2"
                >
                  <ProviderTile t={t} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t.provider}</span>
                    <span className="block text-sm text-ink-2">{t.product}</span>
                    <span className="mt-1 block text-xs text-ink-3">{t.blurb}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-lime/40 px-2 py-0.5 text-lime-ink">from ${t.price} / call</span>
                      {t.async && (
                        <span className="inline-flex items-center gap-1 text-ink-3">
                          <Clock className="size-3" /> async
                        </span>
                      )}
                    </span>
                  </span>
                  <ArrowRight className="mt-1 size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </section>
        ))}
        <section>
          <h2 className="mb-3 text-xs font-medium tracking-[0.14em] text-ink-3 uppercase">Something else</h2>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="flex w-full items-center gap-4 rounded-[20px] border border-dashed border-line-strong p-4 text-left transition-colors hover:border-ink-3 hover:bg-surface-2 sm:max-w-md"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2">
              <Plus className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Custom API</span>
              <span className="block text-xs text-ink-3">Any HTTPS API with a key. You fill in the URL, auth and example request.</span>
            </span>
            <ArrowRight className="size-4 text-ink-3" />
          </button>
        </section>
      </div>
    </>
  );
}

function ProviderTile({ t, size = "md" }: { t: CreditTemplate; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl font-semibold text-white ${size === "lg" ? "size-12 text-base" : "size-11 text-sm"}`}
      style={{ background: t.color }}
    >
      {t.initials}
    </span>
  );
}

function Section({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="card card-pad">
      <div className="mb-5">
        <h2 className="card-title">{title}</h2>
        {sub && <div className="mt-0.5 text-sm text-ink-2">{sub}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ClaudeHint({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1.5">
      <Info className="mt-0.5 size-3.5 shrink-0 text-violet" />
      <span>{children}</span>
    </span>
  );
}

function TestStep({
  id,
  name,
  retest,
  result,
  error,
  running,
  onRetest,
  onEdit,
  onDone,
}: {
  id: string;
  name: string;
  /** An edit put the endpoint back to pending. */
  retest: boolean;
  result?: TestResult;
  error: Error | null;
  running: boolean;
  onRetest: () => void;
  onEdit: () => void;
  onDone: () => void;
}) {
  const passed = !!result?.ok;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`Test ${name}`}
        sub={
          retest
            ? "You changed how we call the provider, so agents can’t buy until this test passes again."
            : "One real call through the gateway, using your key."
        }
      />
      <div className="card card-pad">
        {running ? (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-ink-2">
            <Spinner className="size-6" />
            Calling the provider with your key…
          </div>
        ) : error ? (
          <>
            <ErrorState error={error} />
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={onEdit}>
                Edit and retry
              </button>
              <button className="btn btn-ghost" onClick={onRetest}>
                <RotateCcw className="size-4" /> Run test again
              </button>
            </div>
          </>
        ) : result ? (
          <>
            <div className={`flex items-start gap-3 rounded-2xl p-4 ${passed ? "bg-good/10" : "bg-bad/5"}`}>
              {passed ? <CircleCheck className="mt-0.5 size-5 text-good-text" /> : <CircleX className="mt-0.5 size-5 text-bad-text" />}
              <div>
                <div className={`font-medium ${passed ? "text-good-text" : "text-bad-text"}`}>
                  {passed ? (result.activated ? "It works. Your credits are listed." : "It works.") : "The provider didn’t return a 2xx"}
                </div>
                <div className="mt-0.5 text-sm text-ink-2">
                  Provider status <span className="num font-mono text-ink">{result.status ?? "no response"}</span>
                  {result.latencyMs != null && (
                    <>
                      {" "}
                      · <span className="num">{result.latencyMs} ms</span>
                    </>
                  )}
                  {result.contentType && <> · {result.contentType}</>}
                  {result.error && <> · {result.error}</>}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="label">Response (truncated)</div>
              <pre className="max-h-72 overflow-auto rounded-2xl border border-line bg-surface-2 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink">
                {isBinary(result.contentType) ? `Binary response (${result.contentType}), not shown.` : result.body || "(empty body)"}
              </pre>
            </div>

            {passed ? (
              <div className="mt-5 space-y-4">
                <div>
                  <div className="label">Paid URL</div>
                  <CopyUrl url={paidUrl(id)} />
                  <div className="hint">Buyers who call this get a 402 with your price, pay in USDC, then get the response.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary" onClick={onDone}>
                    View listing
                  </button>
                  <Link href="/claude" className="btn btn-ghost">
                    Use with Claude
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={onEdit}>
                  Edit and retry
                </button>
                <button className="btn btn-ghost" onClick={onRetest}>
                  <RotateCcw className="size-4" /> Run test again
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Audio, images and other bytes would print as garbage. */
function isBinary(contentType: string | null) {
  if (!contentType) return false;
  return !/^text\/|json|xml|javascript|x-www-form-urlencoded|graphql/i.test(contentType);
}
