// Ready-made listings for popular credit-based AI services. Picking one fills in
// the technical half of the form (URL, auth, example request, spend guards), so
// a seller only adds their key and a price.
//
// Only APIs a buyer can use in one request/response belong here, or ones that
// deliver the result some other way (Higgsfield: webhook). No LLM chat APIs:
// buyers already reach Tollgate through Claude.

import type { HttpMethod } from "./api";

export type TemplateCategory = "Video" | "Image" | "Voice & audio" | "Web & search";

export interface CreditTemplate {
  id: string;
  provider: string;
  product: string;
  category: TemplateCategory;
  /** One line on the picker card. */
  blurb: string;
  /** Monogram tile colour. */
  color: string;
  initials: string;

  method: HttpMethod;
  url: string;
  auth: {
    type: "header" | "query";
    name: string;
    /** Added in front of the key the seller pastes, e.g. "Bearer ". */
    prefix?: string;
  };
  keyLabel?: string;
  keyPlaceholder: string;
  /** Where the seller finds their key. */
  keyUrl: string;
  headers?: Record<string, string>;
  exampleQuery?: string;
  exampleBody?: unknown;
  bodyOverrides?: Record<string, unknown>;
  maxBodyBytes?: number;

  /** Suggested price per call, USD. */
  price: string;
  /** Default label for the listing's ENS name: elevenlabs.<seller>.<parent>. */
  ensLabel: string;
  name: string;
  description: string;
  /** Returns a job id, not the result; shown as a caveat. */
  async?: string;
}

export const TEMPLATES: CreditTemplate[] = [
  {
    id: "higgsfield-soul",
    provider: "Higgsfield",
    product: "Soul image",
    category: "Image",
    blurb: "Photoreal images from a prompt with Higgsfield Soul.",
    color: "#111318",
    initials: "Hf",
    method: "POST",
    url: "https://api.higgsfield.ai/higgsfield-ai/soul/v2/standard",
    auth: { type: "header", name: "Authorization", prefix: "Key " },
    keyLabel: "Higgsfield API key (ID:secret)",
    keyPlaceholder: "KEY_ID:KEY_SECRET",
    keyUrl: "https://console.higgsfield.ai",
    exampleBody: { prompt: "Editorial portrait in soft daylight" },
    bodyOverrides: { num_images: 1 },
    maxBodyBytes: 8192,
    price: "0.10",
    ensLabel: "higgsfield",
    name: "Higgsfield Soul images",
    description:
      'Photoreal image generation with Higgsfield Soul, one image per call. Send {"prompt": "..."}. Higgsfield works asynchronously: the call returns a request_id, and the finished image is POSTed to the HTTPS URL you pass as the hf_webhook query parameter.',
    async: "Returns a request_id. The image is delivered to the buyer's hf_webhook URL.",
  },
  {
    id: "higgsfield-kling",
    provider: "Higgsfield",
    product: "Kling 2.5 Turbo video",
    category: "Video",
    blurb: "5-second text-to-video clips with Kling 2.5 Turbo Pro.",
    color: "#111318",
    initials: "Hf",
    method: "POST",
    url: "https://api.higgsfield.ai/kling-video/v2.5-turbo/pro/text-to-video",
    auth: { type: "header", name: "Authorization", prefix: "Key " },
    keyLabel: "Higgsfield API key (ID:secret)",
    keyPlaceholder: "KEY_ID:KEY_SECRET",
    keyUrl: "https://console.higgsfield.ai",
    exampleBody: { prompt: "A paper boat drifting down a rainy street, cinematic", duration: 5 },
    bodyOverrides: { duration: 5 },
    maxBodyBytes: 8192,
    price: "0.75",
    ensLabel: "kling",
    name: "Kling 2.5 Turbo video (Higgsfield)",
    description:
      'Text-to-video with Kling 2.5 Turbo Pro via Higgsfield, 5-second clips. Send {"prompt": "..."}. Higgsfield works asynchronously: the call returns a request_id, and the finished video is POSTed to the HTTPS URL you pass as the hf_webhook query parameter.',
    async: "Returns a request_id. The video is delivered to the buyer's hf_webhook URL.",
  },
  {
    id: "fal-flux",
    provider: "fal",
    product: "FLUX.1 [schnell]",
    category: "Image",
    blurb: "Fast FLUX images, returned as a hosted URL.",
    color: "#5b21b6",
    initials: "fal",
    method: "POST",
    url: "https://fal.run/fal-ai/flux/schnell",
    auth: { type: "header", name: "Authorization", prefix: "Key " },
    keyPlaceholder: "fal key",
    keyUrl: "https://fal.ai/dashboard/keys",
    exampleBody: { prompt: "A lighthouse on a cliff at dawn, watercolor" },
    bodyOverrides: { num_images: 1 },
    maxBodyBytes: 8192,
    price: "0.01",
    ensLabel: "flux",
    name: "FLUX schnell images (fal)",
    description: 'Image generation with FLUX.1 [schnell] on fal, one image per call. Send {"prompt": "..."} and get back JSON with the image URL.',
  },
  {
    id: "replicate-flux",
    provider: "Replicate",
    product: "FLUX 1.1 [pro]",
    category: "Image",
    blurb: "High-quality FLUX images, waits for the result.",
    color: "#e5484d",
    initials: "R",
    method: "POST",
    url: "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions",
    auth: { type: "header", name: "Authorization", prefix: "Bearer " },
    keyPlaceholder: "r8_…",
    keyUrl: "https://replicate.com/account/api-tokens",
    // waits up to 60s for the prediction instead of returning a pending one
    headers: { Prefer: "wait" },
    exampleBody: { input: { prompt: "A lighthouse on a cliff at dawn, watercolor" } },
    maxBodyBytes: 8192,
    price: "0.06",
    ensLabel: "flux-pro",
    name: "FLUX 1.1 pro images (Replicate)",
    description:
      'Image generation with FLUX 1.1 [pro] on Replicate. Send {"input": {"prompt": "..."}} and get back the prediction, with the image URL in "output".',
  },
  {
    id: "elevenlabs-tts",
    provider: "ElevenLabs",
    product: "Text to speech",
    category: "Voice & audio",
    blurb: "Lifelike speech in 29 languages, returned as MP3.",
    color: "#0f0f0f",
    initials: "11",
    method: "POST",
    // "George", one of ElevenLabs' default voices
    url: "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb",
    auth: { type: "header", name: "xi-api-key" },
    keyPlaceholder: "sk_…",
    keyUrl: "https://elevenlabs.io/app/settings/api-keys",
    exampleBody: { text: "Hello from Tollgate. These credits were left over.", model_id: "eleven_multilingual_v2" },
    bodyOverrides: { model_id: "eleven_multilingual_v2" },
    // ElevenLabs bills per character, so the body size caps what one call spends
    maxBodyBytes: 4096,
    price: "0.03",
    ensLabel: "elevenlabs",
    name: "ElevenLabs voice (George)",
    description:
      'Text to speech with ElevenLabs (voice "George", multilingual v2). Send {"text": "..."} and get back MP3 audio. Up to about 4,000 characters per call.',
  },
  {
    id: "elevenlabs-sfx",
    provider: "ElevenLabs",
    product: "Sound effects",
    category: "Voice & audio",
    blurb: "Sound effects from a text description.",
    color: "#0f0f0f",
    initials: "11",
    method: "POST",
    url: "https://api.elevenlabs.io/v1/sound-generation",
    auth: { type: "header", name: "xi-api-key" },
    keyPlaceholder: "sk_…",
    keyUrl: "https://elevenlabs.io/app/settings/api-keys",
    exampleBody: { text: "Heavy rain on a tin roof with distant thunder" },
    maxBodyBytes: 2048,
    price: "0.05",
    ensLabel: "elevenlabs-sfx",
    name: "ElevenLabs sound effects",
    description: 'Sound effect generation with ElevenLabs. Send {"text": "a description of the sound"} and get back MP3 audio.',
  },
  {
    id: "deepgram-tts",
    provider: "Deepgram",
    product: "Aura text to speech",
    category: "Voice & audio",
    blurb: "Low-latency speech with Deepgram Aura voices.",
    color: "#13ef93",
    initials: "Dg",
    method: "POST",
    url: "https://api.deepgram.com/v1/speak",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    keyPlaceholder: "Deepgram API key",
    keyUrl: "https://console.deepgram.com",
    exampleQuery: "model=aura-2-thalia-en",
    exampleBody: { text: "Hello from Tollgate." },
    maxBodyBytes: 4096,
    price: "0.01",
    ensLabel: "deepgram-voice",
    name: "Deepgram Aura voice",
    description: 'Text to speech with Deepgram Aura. Send {"text": "..."} and get back MP3 audio. Pick a voice with the model query parameter, e.g. model=aura-2-thalia-en.',
  },
  {
    id: "deepgram-stt",
    provider: "Deepgram",
    product: "Nova transcription",
    category: "Voice & audio",
    blurb: "Transcribe audio from a URL with Nova.",
    color: "#13ef93",
    initials: "Dg",
    method: "POST",
    url: "https://api.deepgram.com/v1/listen",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    keyPlaceholder: "Deepgram API key",
    keyUrl: "https://console.deepgram.com",
    exampleQuery: "model=nova-3&smart_format=true",
    exampleBody: { url: "https://dpgr.am/spacewalk.wav" },
    maxBodyBytes: 2048,
    price: "0.02",
    ensLabel: "deepgram",
    name: "Deepgram transcription",
    description: 'Speech to text with Deepgram Nova. Send {"url": "https://…/audio.mp3"} and get back a JSON transcript.',
  },
  {
    id: "firecrawl-scrape",
    provider: "Firecrawl",
    product: "Scrape",
    category: "Web & search",
    blurb: "Any web page as clean markdown.",
    color: "#fa5d19",
    initials: "Fc",
    method: "POST",
    url: "https://api.firecrawl.dev/v2/scrape",
    auth: { type: "header", name: "Authorization", prefix: "Bearer " },
    keyPlaceholder: "fc-…",
    keyUrl: "https://www.firecrawl.dev/app/api-keys",
    exampleBody: { url: "https://example.com", formats: ["markdown"] },
    bodyOverrides: { formats: ["markdown"] },
    maxBodyBytes: 4096,
    price: "0.01",
    ensLabel: "firecrawl",
    name: "Firecrawl page scrape",
    description: 'Scrape a web page into clean markdown with Firecrawl. Send {"url": "https://..."} and get back the page content.',
  },
  {
    id: "exa-search",
    provider: "Exa",
    product: "Search",
    category: "Web & search",
    blurb: "Neural web search built for AI.",
    color: "#1f40ed",
    initials: "Exa",
    method: "POST",
    url: "https://api.exa.ai/search",
    auth: { type: "header", name: "x-api-key" },
    keyPlaceholder: "Exa API key",
    keyUrl: "https://dashboard.exa.ai/api-keys",
    exampleBody: { query: "latest research on agent payments", numResults: 5 },
    bodyOverrides: { numResults: 5 },
    maxBodyBytes: 4096,
    price: "0.01",
    ensLabel: "exa-search",
    name: "Exa web search",
    description: 'Web search with Exa, 5 results per call. Send {"query": "..."} and get back titles, URLs and snippets.',
  },
  {
    id: "tavily-search",
    provider: "Tavily",
    product: "Search",
    category: "Web & search",
    blurb: "Search results with an AI-ready answer.",
    color: "#0e7490",
    initials: "Tv",
    method: "POST",
    url: "https://api.tavily.com/search",
    auth: { type: "header", name: "Authorization", prefix: "Bearer " },
    keyPlaceholder: "tvly-…",
    keyUrl: "https://app.tavily.com",
    exampleBody: { query: "What is the x402 payment protocol?", max_results: 5 },
    bodyOverrides: { max_results: 5, search_depth: "basic" },
    maxBodyBytes: 4096,
    price: "0.01",
    ensLabel: "tavily",
    name: "Tavily web search",
    description: 'Web search with Tavily, 5 results per call. Send {"query": "..."} and get back sources and a short answer.',
  },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["Video", "Image", "Voice & audio", "Web & search"];

/** The template an existing listing was made from, going by its URL. */
export function templateFor(url: string): CreditTemplate | undefined {
  return TEMPLATES.find((t) => t.url === url);
}

/** What the gateway should store as the secret: the key with the template's prefix, once. */
export function withKeyPrefix(t: CreditTemplate | null | undefined, key: string): string {
  const k = key.trim();
  if (!k || !t?.auth.prefix) return k;
  return k.toLowerCase().startsWith(t.auth.prefix.trim().toLowerCase()) ? k : t.auth.prefix + k;
}
