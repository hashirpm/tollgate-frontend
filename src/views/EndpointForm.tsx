"use client";

import { ArrowLeft, CircleCheck, CircleX, FlaskConical, Info, RotateCcw } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CopyUrl } from "@/components/CopyButton";
import { JsonField, type KV, KeyValueRows, SecretField } from "@/components/FormFields";
import { jsonError } from "@/lib/json";
import { ErrorState, Field, PageHeader, Skeleton, Spinner } from "@/components/ui";
import { useEndpoint, useSaveEndpoint, useTestEndpoint } from "@/hooks/useEndpoints";
import { type AuthType, type Endpoint, type EndpointInput, HTTP_METHODS, type HttpMethod, paidUrl, type TestResult } from "@/lib/api";
import { atomicToInput, usdToAtomic } from "@/lib/format";

const BODY_METHODS: HttpMethod[] = ["POST", "PUT", "PATCH"];

interface FormState {
  name: string;
  description: string;
  method: HttpMethod;
  url: string;
  authType: AuthType;
  authName: string;
  authValue: string | undefined; // undefined = keep the stored secret
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
    authValue: ep?.hasAuthValue ? undefined : "",
    headers: ep && Object.keys(ep.staticHeaders).length ? Object.entries(ep.staticHeaders).map(([key, value]) => ({ key, value })) : [],
    price: ep ? atomicToInput(ep.priceAtomic) : "0.01",
    exampleQuery: ep?.exampleQuery ?? "",
    exampleBody: ep?.exampleBody ?? "",
    bodyOverrides: ep?.bodyOverrides ?? "",
    maxBodyBytes: ep?.maxBodyBytes != null ? String(ep.maxBodyBytes) : "",
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState, hasStoredSecret: boolean): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "Give it a name buyers will recognize.";
  try {
    const u = new URL(f.url.trim());
    if (u.protocol !== "https:") e.url = "Upstream must be https://";
  } catch {
    e.url = "Enter a full URL, like https://api.example.com/v1/search";
  }
  if (f.authType !== "none") {
    if (!f.authName.trim()) e.authName = f.authType === "header" ? "Header name, e.g. Authorization" : "Query parameter, e.g. api_key";
    if (f.authValue !== undefined && !f.authValue.trim()) e.authValue = hasStoredSecret ? "Enter the new secret, or keep the current one." : "The secret the gateway injects.";
  }
  const atomic = usdToAtomic(f.price);
  if (atomic === null) e.price = "A dollar amount with up to 6 decimals, e.g. 0.01";
  else if (atomic <= 0n) e.price = "Price must be more than $0.";
  if (f.headers.some((h) => !h.key.trim() && h.value.trim())) e.headers = "Every header needs a name.";
  if (BODY_METHODS.includes(f.method) && jsonError(f.exampleBody)) e.exampleBody = "Fix the JSON first.";
  if (jsonError(f.bodyOverrides, { object: true })) e.bodyOverrides = "Must be a JSON object.";
  if (f.maxBodyBytes.trim() && !/^\d+$/.test(f.maxBodyBytes.trim())) e.maxBodyBytes = "Whole number of bytes.";
  return e;
}

function toInput(f: FormState): EndpointInput {
  const hasBody = BODY_METHODS.includes(f.method);
  const input: EndpointInput = {
    name: f.name.trim(),
    description: f.description.trim(),
    method: f.method,
    url: f.url.trim(),
    auth_type: f.authType,
    auth_name: f.authType === "none" ? null : f.authName.trim(),
    static_headers: Object.fromEntries(f.headers.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value])),
    // ×1e6 happens here and only here, exactly (string math, no floats)
    price_atomic: usdToAtomic(f.price)!.toString(),
    example_query: f.exampleQuery.trim().replace(/^\?/, "") || null,
    example_body: hasBody && f.exampleBody.trim() ? f.exampleBody.trim() : null,
    body_overrides: hasBody && f.bodyOverrides.trim() ? f.bodyOverrides.trim() : null,
    max_body_bytes: f.maxBodyBytes.trim() ? Number(f.maxBodyBytes.trim()) : null,
  };
  // write-only secret: only sent when the seller typed a new one
  if (f.authType !== "none" && f.authValue !== undefined) input.auth_value = f.authValue;
  return input;
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
  const [savedId, setSavedId] = useState<string | undefined>(existing?.id);
  const [hasStoredSecret, setHasStoredSecret] = useState(!!existing?.hasAuthValue);
  const [step, setStep] = useState<"form" | "test">("form");

  const errors = validate(f, hasStoredSecret);
  const show = (k: keyof FormState) => (touched ? errors[k] : undefined);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const hasBody = BODY_METHODS.includes(f.method);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) {
      document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    save.mutate(
      { id: savedId, input: toInput(f) },
      {
        onSuccess: (ep) => {
          setSavedId(ep.id);
          // the secret is now stored; the field goes back to "••• set"
          if (f.authType !== "none") {
            setHasStoredSecret(true);
            set("authValue", undefined);
          }
          setStep("test");
          test.mutate(ep.id);
        },
      },
    );
  };

  if (step === "test" && savedId) {
    return (
      <TestStep
        id={savedId}
        name={f.name}
        result={test.data}
        error={test.error}
        running={test.isPending}
        onRetest={() => test.mutate(savedId)}
        onEdit={() => {
          test.reset();
          setStep("form");
        }}
        onDone={() => router.push(`/endpoints/${savedId}`)}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={existing ? `Edit ${existing.name}` : "Add endpoint"}
        sub={existing ? "Changes apply to new calls right away." : "Point Tollgate at an API, set a price, then test it to go live."}
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
              <Field label="Method" htmlFor="method">
                <select id="method" className="input" value={f.method} onChange={(e) => set("method", e.target.value as HttpMethod)}>
                  {HTTP_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Description" htmlFor="desc" hint={<ClaudeHint>Claude reads this to decide when to call your API. Say what it returns and when it’s useful.</ClaudeHint>}>
              <textarea
                id="desc"
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
                <Field label="Value" error={show("authValue")} hint="Write-only. Kept on the server and never shown again.">
                  <SecretField
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
            <Field label="Query string" htmlFor="q" hint="Without the leading ?">
              <input id="q" className="input font-mono text-[13px]" value={f.exampleQuery} onChange={(e) => set("exampleQuery", e.target.value)} placeholder="city=Lisbon&days=3" spellCheck={false} />
            </Field>
            {hasBody ? (
              <Field label="JSON body" error={show("exampleBody")}>
                <JsonField value={f.exampleBody} onChange={(v) => set("exampleBody", v)} placeholder={'{\n  "city": "Lisbon"\n}'} />
              </Field>
            ) : (
              <p className="text-xs text-ink-3">{f.method} requests have no body. Switch the method to POST/PUT/PATCH to add one.</p>
            )}
          </Section>

          <Section title="Guards" sub="Limits the gateway enforces before anything reaches your upstream.">
            <Field
              label="Body overrides"
              error={show("bodyOverrides")}
              hint={hasBody ? "JSON object merged over every buyer's body, e.g. to cap cost." : "Only applies to requests with a body."}
            >
              <JsonField value={f.bodyOverrides} onChange={(v) => set("bodyOverrides", v)} placeholder='{"max_tokens": 500}' rows={3} object />
            </Field>
            <Field label="Max body size" htmlFor="maxb" error={show("maxBodyBytes")} hint="Bytes. Larger requests are rejected before payment. Empty = server default.">
              <input id="maxb" className="input num w-48 font-mono" inputMode="numeric" value={f.maxBodyBytes} onChange={(e) => set("maxBodyBytes", e.target.value)} placeholder="65536" />
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

            {savedId && (
              <div>
                <div className="label">Paid URL</div>
                <CopyUrl url={paidUrl(savedId)} />
              </div>
            )}

            {save.error && <ErrorState error={save.error} />}

            <button type="submit" className="btn btn-primary h-12 w-full text-[15px]" disabled={save.isPending}>
              {save.isPending ? <Spinner /> : <FlaskConical className="size-4" />}
              {save.isPending ? "Saving…" : "Save and test"}
            </button>
            <p className="text-xs text-ink-3">We make one real call to your upstream. A 2xx response makes the endpoint active.</p>
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
  result,
  error,
  running,
  onRetest,
  onEdit,
  onDone,
}: {
  id: string;
  name: string;
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
      <PageHeader title={`Test ${name}`} sub="One real call through the gateway to your upstream." />
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
                  {passed ? "It works. Your endpoint is live." : "The upstream didn't return a 2xx"}
                </div>
                <div className="mt-0.5 text-sm text-ink-2">
                  Upstream status <span className="num font-mono text-ink">{result.status ?? "no response"}</span>
                  {result.error && <> · {result.error}</>}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="label">Response (truncated)</div>
              <pre className="max-h-72 overflow-auto rounded-2xl border border-line bg-surface-2 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink">
                {result.body || "(empty body)"}
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
