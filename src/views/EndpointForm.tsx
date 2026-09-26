"use client";

import { ArrowLeft, CircleCheck, CircleX, FlaskConical, Info, RotateCcw, Save } from "lucide-react";
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
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState, hasStoredSecret: boolean): Errors {
  const e: Errors = {};
  const hasBody = BODY_METHODS.includes(f.method);
  if (!f.name.trim()) e.name = "Give it a name buyers will recognize.";
  else if (f.name.trim().length > 80) e.name = "Keep it under 80 characters.";
  if (!f.description.trim()) e.description = "Say what it returns. Buyers and Claude read this to decide whether to call it.";
  else if (f.description.trim().length > 2000) e.description = "Keep it under 2,000 characters.";
  try {
    const u = new URL(f.url.trim());
    if (u.protocol !== "https:") e.url = "Upstream must be https://";
  } catch {
    e.url = "Enter a full URL, like https://api.example.com/v1/search";
  }
  if (f.authType !== "none") {
    if (!f.authName.trim()) e.authName = f.authType === "header" ? "Header name, e.g. Authorization" : "Query parameter, e.g. api_key";
    if (!f.authValue.trim() && !hasStoredSecret) e.authValue = "The secret the gateway sends to your upstream.";
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
    if (!f.exampleBody.trim()) e.exampleBody = `${f.method} endpoints need an example body. The activation test sends it to your upstream.`;
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

  const onSaveError = (err: unknown) => {
    const { fields } = splitIssues(err);
    setServerErrors(fields);
    if (Object.keys(fields).length) scrollToInvalid();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setServerErrors({});
    if (Object.keys(errors).length) return scrollToInvalid();

    if (!saved) {
      save.mutate({ input: toInput(f) }, { onSuccess: onSaved, onError: onSaveError });
      return;
    }
    const patch = toPatch(saved, f);
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

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={existing ? `Edit ${existing.name}` : "Add endpoint"}
        sub={existing ? "Name, description, price and examples apply right away. Changing where or how we call your API needs a new test." : "Point Tollgate at an API, set a price, then test it to go live."}
      >
        <Link href={existing ? `/endpoints/${existing.id}` : "/endpoints"} className="btn btn-ghost">
          <ArrowLeft className="size-4" /> Cancel
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" error={show("name")}>
                <input id="name" className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Weather forecast" aria-invalid={!!show("name")} />
              </Field>
              <Field label="Method" htmlFor="method" error={show("method")}>
                <select id="method" className="input" value={f.method} onChange={(e) => set("method", e.target.value as HttpMethod)}>
                  {HTTP_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Description"
              htmlFor="desc"
              error={show("description")}
              hint={<ClaudeHint>Buyers and Claude read this to decide when to call your API. Say what it returns and when it’s useful.</ClaudeHint>}
            >
              <textarea
                id="desc"
                aria-invalid={!!show("description")}
                className="input h-auto min-h-20 resize-y py-2.5"
                rows={3}
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="7-day forecast for any city: temperature, precipitation and wind, hourly."
              />
            </Field>
            <Field label="Upstream URL" htmlFor="url" error={show("url")} hint="Must be https. The server also checks it isn't a private address.">
              <input
                id="url"
                className="input font-mono text-[13px]"
                value={f.url}
                inputMode="url"
                spellCheck={false}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://api.example.com/v1/forecast"
                aria-invalid={!!show("url")}
              />
            </Field>
          </Section>

          <Section title="Auth" sub="How the gateway authenticates to your upstream. Buyers never see this.">
            <div className="seg w-fit">
              {(["none", "header", "query"] as AuthType[]).map((t) => (
                <button type="button" key={t} data-active={f.authType === t} className="seg-btn px-4 capitalize" onClick={() => set("authType", t)}>
                  {t === "none" ? "None" : t === "header" ? "Header" : "Query param"}
                </button>
              ))}
            </div>
            {f.authType !== "none" && (
              <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
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
                <Field
                  label="Value"
                  htmlFor="authValue"
                  error={show("authValue")}
                  hint={hasStoredSecret ? "A secret is saved. Type a new one to replace it." : "Write-only. Kept encrypted on the server and never shown again."}
                >
                  <SecretField
                    id="authValue"
                    invalid={!!show("authValue")}
                    hasStored={hasStoredSecret}
                    value={f.authValue}
                    onChange={(v) => set("authValue", v)}
                    placeholder={f.authType === "header" ? "Bearer sk-…" : "your-api-key"}
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Static headers" sub="Sent on every upstream call, e.g. anthropic-version or content-type.">
            <KeyValueRows rows={f.headers} onChange={(r) => set("headers", r)} keyPlaceholder="anthropic-version" valuePlaceholder="2023-06-01" />
            {show("headers") && <div className="text-xs text-bad-text">{show("headers")}</div>}
          </Section>

          <Section title="Example request" sub={<ClaudeHint>Claude copies this when it calls you, so make it a real, working request.</ClaudeHint>}>
            <Field label="Query string" htmlFor="q" error={show("exampleQuery")} hint="Without the leading ?">
              <input id="q" aria-invalid={!!show("exampleQuery")} className="input font-mono text-[13px]" value={f.exampleQuery} onChange={(e) => set("exampleQuery", e.target.value)} placeholder="city=Lisbon&days=3" spellCheck={false} />
            </Field>
            {hasBody ? (
              <Field label="JSON body" htmlFor="exampleBody" error={show("exampleBody")}>
                <JsonField
                  id="exampleBody"
                  value={f.exampleBody}
                  onChange={(v) => set("exampleBody", v)}
                  placeholder={'{\n  "city": "Lisbon"\n}'}
                  required
                  invalid={!!show("exampleBody")}
                />
              </Field>
            ) : (
              <p className="text-xs text-ink-3">{f.method} requests have no body. Switch the method to POST/PUT/PATCH to add one.</p>
            )}
          </Section>

          <Section title="Guards" sub="Limits the gateway enforces before anything reaches your upstream.">
            <Field
              label="Body overrides"
              htmlFor="bodyOverrides"
              error={show("bodyOverrides")}
              hint={hasBody ? "JSON object merged over every buyer's body, e.g. to cap cost." : "Only applies to requests with a body."}
            >
              <JsonField
                id="bodyOverrides"
                value={f.bodyOverrides}
                onChange={(v) => set("bodyOverrides", v)}
                placeholder='{"max_tokens": 500}'
                rows={3}
                object
                invalid={!!show("bodyOverrides")}
              />
            </Field>
            <Field label="Max body size" htmlFor="maxb" error={show("maxBodyBytes")} hint="Bytes, up to 1,048,576. Larger requests are rejected before payment.">
              <input id="maxb" aria-invalid={!!show("maxBodyBytes")} className="input num w-48 font-mono" inputMode="numeric" value={f.maxBodyBytes} onChange={(e) => set("maxBodyBytes", e.target.value)} placeholder="65536" />
            </Field>
          </Section>
        </div>

        {/* sticky summary / submit */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="card card-pad space-y-5">
            <Field label="Price per request" htmlFor="price" error={show("price")} hint="In USD, paid in USDC. Converted to atomic units (×10⁶) on save.">
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
                ? "If you change the URL, method, auth, headers or body overrides, we re-run the test before buyers can call it again."
                : "We make one real call to your upstream. A 2xx response makes the endpoint active."}
            </p>
          </div>
        </aside>
      </div>
    </form>
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
            ? "You changed how we call your upstream, so buyers can’t call it until this test passes again."
            : "One real call through the gateway to your upstream."
        }
      />
      <div className="card card-pad">
        {running ? (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-ink-2">
            <Spinner className="size-6" />
            Calling your upstream…
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
                  {passed ? (result.activated ? "It works. Your endpoint is live." : "It works.") : "The upstream didn’t return a 2xx"}
                </div>
                <div className="mt-0.5 text-sm text-ink-2">
                  Upstream status <span className="num font-mono text-ink">{result.status ?? "no response"}</span>
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
                    View endpoint
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
