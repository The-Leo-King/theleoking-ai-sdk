export type TheLeoKingApiEnvironment = "production" | "sandbox";

export const PRODUCTION_API_BASE_URL = "https://api.theleokingai.com";
export const SANDBOX_API_BASE_URL = "https://sandbox.api.theleokingai.com";

export interface TheLeoKingApiOptions {
  apiKey?: string;
  baseUrl?: string;
  environment?: TheLeoKingApiEnvironment;
  fetchImpl?: typeof fetch;
}

export interface ApiEnvelope<TData> {
  request_id: string;
  data: TData;
  usage: {
    lane?: "core" | "ai" | "ops";
    credits: number;
    billableUnits?: number;
    tokens?: {
      input?: number;
      output?: number;
      total?: number;
    };
  };
  meta: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  request_id: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface DeveloperMetadataResponse {
  name: string;
  version: string;
  [key: string]: unknown;
}

export interface WebhookSignatureVerificationOptions {
  payload: string;
  signatureHeader?: string | null;
  secret: string;
  nowMs?: number;
  toleranceSeconds?: number;
}

export interface WebhookSignatureCreationOptions {
  payload: string;
  secret: string;
  timestamp?: number;
}

export const LEO_KING_WEBHOOK_SIGNATURE_HEADER = "TheLeoKing-Signature";
export const LEO_KING_WEBHOOK_SIGNATURE_VERSION = "v1";
export const LEO_KING_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;

export interface BirthInput {
  id: string;
  dob: string;
  tob?: string;
  pob?: string;
  latitude?: number;
  longitude?: number;
}

export interface WorldSignalsRequest {
  topic?: "markets" | "politics" | "climate" | "tech" | "culture" | "spirituality" | "all";
  window_days?: number;
  depth?: "surface" | "moderate" | "deep" | "rabbit_hole";
}

export interface WorldSignalJobCreateData {
  job_id: string;
  status: "queued" | "running" | "complete" | "failed";
  endpoint: string;
  status_url: string;
  reserved_credits: number;
  charged_credits: number;
  poll_after_ms: number;
  created_at: string;
  updated_at: string;
}

export interface WorldSignalJobStatusData extends WorldSignalJobCreateData {
  started_at?: string;
  completed_at?: string;
  result?: ApiEnvelope<unknown>;
  error?: {
    code: string;
    message: string;
  };
}

export interface AudienceInsightsRequest {
  customers: Array<{
    id: string;
    dob: string;
    tob?: string;
    pob?: string;
    latitude?: number;
    longitude?: number;
  }>;
  campaign_context?: {
    product_category?: string;
    tone?: string;
    channel?: string;
  };
}

export class TheLeoKingApiError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly code?: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorEnvelope | string) {
    const message = typeof body === "string" ? body : body.error.message;
    super(message);
    this.name = "TheLeoKingApiError";
    this.status = status;

    if (typeof body !== "string") {
      this.requestId = body.request_id;
      this.code = body.error.code;
      this.details = body.error.details;
    }
  }
}

export async function createLeoKingWebhookSignature({
  payload,
  secret,
  timestamp = Math.floor(Date.now() / 1000),
}: WebhookSignatureCreationOptions): Promise<string> {
  const normalizedSecret = secret.trim();

  if (!normalizedSecret) {
    throw new Error("Webhook secret is required");
  }

  const signature = await computeWebhookHmac(payload, normalizedSecret, timestamp);

  return `t=${timestamp},${LEO_KING_WEBHOOK_SIGNATURE_VERSION}=${signature}`;
}

export async function verifyLeoKingWebhookSignature({
  payload,
  signatureHeader,
  secret,
  nowMs = Date.now(),
  toleranceSeconds = LEO_KING_WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS,
}: WebhookSignatureVerificationOptions): Promise<boolean> {
  if (!signatureHeader || !secret.trim()) {
    return false;
  }

  const parts = parseWebhookSignatureHeader(signatureHeader);

  if (!parts || !parts.signatures.length) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - parts.timestamp);

  if (ageSeconds > toleranceSeconds) {
    return false;
  }

  const expected = await computeWebhookHmac(payload, secret.trim(), parts.timestamp);

  return parts.signatures.some((signature) => timingSafeEqualHex(signature, expected));
}

export class TheLeoKingApi {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  readonly environment: TheLeoKingApiEnvironment;

  constructor(options: TheLeoKingApiOptions) {
    const configuration = resolveApiConfiguration(options);

    this.apiKey = configuration.apiKey;
    this.baseUrl = configuration.baseUrl;
    this.environment = configuration.environment;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async apiIndex(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1");
  }

  async openApi(): Promise<Record<string, unknown>> {
    return this.publicGet("/v1/openapi");
  }

  async status(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/status");
  }

  async sla(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/sla");
  }

  async incidents(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/incidents");
  }

  async accessControl(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/access-control");
  }

  async onboarding(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/onboarding");
  }

  async versioning(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/versioning");
  }

  async examples(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/examples");
  }

  async support(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/support");
  }

  async sdks(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/sdks");
  }

  async migrations(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/migrations");
  }

  async procurement(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/procurement");
  }

  async conformance(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/conformance");
  }

  async dataProcessing(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/data-processing");
  }

  async compliance(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/compliance");
  }

  async aiGovernance(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/ai-governance");
  }

  async changelog(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/changelog");
  }

  async webhooks(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/webhooks");
  }

  async errors(): Promise<DeveloperMetadataResponse> {
    return this.publicGet("/v1/errors");
  }

  async postmanCollection(): Promise<Record<string, unknown>> {
    return this.publicGet("/v1/postman");
  }

  async audienceInsights(body: AudienceInsightsRequest, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/audience/insights", body, idempotencyKey);
  }

  async natalChart(body: { subject: BirthInput }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/charts/natal", body, idempotencyKey);
  }

  async currentSky(body: {
    datetime?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    house_system?: string;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/charts/current-sky", body, idempotencyKey);
  }

  async transitChart(body: {
    subject: BirthInput;
    transit_date?: string;
    transit_datetime?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    max_aspects?: number;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/charts/transits", body, idempotencyKey);
  }

  async synastryChart(body: {
    subject: BirthInput;
    partner: BirthInput;
    max_aspects?: number;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/charts/synastry", body, idempotencyKey);
  }

  async compatibilityScore(body: {
    subject: BirthInput;
    partner: BirthInput;
    context?: Record<string, unknown>;
    scoring_profile?: "balanced" | "romantic" | "long_term" | "chemistry";
    include_helio_background?: boolean;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/compatibility/score", body, idempotencyKey);
  }

  async lunarPhase(body: {
    date?: string;
    datetime?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/lunar/phase", body, idempotencyKey);
  }

  async helioPatterns(body: {
    subjects: Array<{
      id: string;
      dob: string;
      tob?: string;
    }>;
    context?: Record<string, unknown>;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/helio/patterns", body, idempotencyKey);
  }

  async futurePartnerVision(body: {
    subject: BirthInput;
    intent?: string;
    context?: Record<string, unknown>;
    include_image_prompt?: boolean;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/experiences/future-partner-vision", body, idempotencyKey);
  }

  async loveReveal(body: {
    question: string;
    subject?: BirthInput;
    partner?: BirthInput;
    context?: Record<string, unknown>;
    include_tarot_symbols?: boolean;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/experiences/love-reveal", body, idempotencyKey);
  }

  async crystalBall(body: {
    question: string;
    topic?: "love" | "career" | "money" | "spirituality" | "family" | "timing" | "general";
    subject?: BirthInput;
    style?: string;
    generate_image_prompt?: boolean;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/experiences/crystal-ball", body, idempotencyKey);
  }

  async oracleAsk(body: {
    question: string;
    birth_date?: string;
    topic?: "love" | "career" | "money" | "spirituality" | "timing" | "family" | "general";
    context?: Record<string, unknown>;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/oracle/ask", body, idempotencyKey);
  }

  async tarotDraw(body: {
    question: string;
    spread_type?: "single" | "three_card" | "past_present_future" | "celtic_cross";
    topic?: "love" | "career" | "money" | "spirituality" | "timing" | "general";
    seed?: string;
    include_image_prompt?: boolean;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/tarot/draw", body, idempotencyKey);
  }

  async pastLifeReading(body: {
    subject?: BirthInput;
    question?: string;
    focus?: "relationship" | "career" | "family" | "spiritual_gift" | "fear_pattern" | "soul_mission" | "general";
    depth?: "summary" | "full";
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/past-life/reading", body, idempotencyKey);
  }

  async dailyHoroscope(body: {
    sign?: "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo" | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";
    subject?: BirthInput;
    date?: string;
    tone?: string;
    sections?: Array<"theme" | "love" | "work" | "money" | "spiritual" | "action">;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/horoscope/daily", body, idempotencyKey);
  }

  async timingWindows(body: {
    subject?: BirthInput;
    topic?: "love" | "career" | "money" | "launch" | "content" | "spirituality" | "general";
    start_date?: string;
    end_date?: string;
    objective?: string;
    max_windows?: number;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/timing/windows", body, idempotencyKey);
  }

  async worldSignals(body: WorldSignalsRequest, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/world/signals", body, idempotencyKey);
  }

  async createWorldSignalsJob(
    body: WorldSignalsRequest,
    idempotencyKey: string,
  ): Promise<ApiEnvelope<WorldSignalJobCreateData>> {
    return this.post("/v1/world/signals/jobs", body, idempotencyKey);
  }

  async getWorldSignalsJob(jobId: string): Promise<ApiEnvelope<WorldSignalJobStatusData>> {
    return this.get(`/v1/world/signals/jobs/${encodeURIComponent(jobId)}`);
  }

  async mundaneHotZones(body: {
    topic?: "markets" | "politics" | "climate" | "tech" | "culture" | "spirituality" | "all";
    regions?: string[];
    window_days?: number;
    depth?: "surface" | "moderate" | "deep";
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/mundane/hot-zones", body, idempotencyKey);
  }

  async mundaneEventAnalysis(body: {
    event: string;
    event_date?: string;
    location?: string;
    topic?: "markets" | "politics" | "climate" | "tech" | "culture" | "spirituality" | "all";
    window_days?: number;
  }, idempotencyKey: string): Promise<ApiEnvelope<unknown>> {
    return this.post("/v1/mundane/analyze-event", body, idempotencyKey);
  }

  private async post<TBody extends object, TData>(
    path: string,
    body: TBody,
    idempotencyKey?: string,
  ): Promise<ApiEnvelope<TData>> {
    const normalizedIdempotencyKey = requireIdempotencyKey(idempotencyKey);
    const headers = this.authHeaders();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Idempotency-Key": normalizedIdempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) as ApiEnvelope<TData> | ApiErrorEnvelope : undefined;

    if (!response.ok) {
      throw new TheLeoKingApiError(response.status, parsed ? parsed as ApiErrorEnvelope : text);
    }

    return parsed as ApiEnvelope<TData>;
  }

  private async get<TData>(path: string): Promise<ApiEnvelope<TData>> {
    const headers = this.authHeaders();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers,
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) as ApiEnvelope<TData> | ApiErrorEnvelope : undefined;

    if (!response.ok) {
      throw new TheLeoKingApiError(response.status, parsed ? parsed as ApiErrorEnvelope : text);
    }

    return parsed as ApiEnvelope<TData>;
  }

  private async publicGet<TData>(path: string): Promise<TData> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) as TData | ApiErrorEnvelope : undefined;

    if (!response.ok) {
      throw new TheLeoKingApiError(response.status, parsed ? parsed as ApiErrorEnvelope : text);
    }

    return parsed as TData;
  }

  private authHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new TheLeoKingApiError(401, {
        request_id: "client",
        error: {
          code: "AUTH_REQUIRED",
          message: "apiKey is required for authenticated API routes",
        },
      });
    }

    return {
      "x-api-key": this.apiKey,
    };
  }
}

interface ResolvedApiConfiguration {
  apiKey?: string;
  baseUrl: string;
  environment: TheLeoKingApiEnvironment;
}

function resolveApiConfiguration(options: TheLeoKingApiOptions): ResolvedApiConfiguration {
  const parsedBaseUrl = options.baseUrl === undefined ? undefined : parseBaseUrl(options.baseUrl);
  const canonicalEnvironment = parsedBaseUrl ? environmentForCanonicalHost(parsedBaseUrl.hostname) : undefined;
  const environment = options.environment ?? canonicalEnvironment ?? "production";

  assertEnvironment(environment);

  if (canonicalEnvironment && canonicalEnvironment !== environment) {
    throw new Error("The selected base URL is incompatible with the selected environment");
  }

  if (parsedBaseUrl && canonicalEnvironment && parsedBaseUrl.protocol !== "https:") {
    throw new Error("Canonical API base URLs must use HTTPS");
  }

  if (parsedBaseUrl && !canonicalEnvironment && !isAllowedCustomHost(parsedBaseUrl.hostname)) {
    throw new Error("Custom base URLs must use localhost, loopback, or a .test host");
  }

  const baseUrl = parsedBaseUrl
    ? normalizeBaseUrl(parsedBaseUrl)
    : environment === "sandbox"
      ? SANDBOX_API_BASE_URL
      : PRODUCTION_API_BASE_URL;

  assertApiKeyEnvironment(options.apiKey, environment);

  return {
    apiKey: options.apiKey,
    baseUrl,
    environment,
  };
}

function assertEnvironment(environment: string): asserts environment is TheLeoKingApiEnvironment {
  if (environment !== "production" && environment !== "sandbox") {
    throw new Error("environment must be either production or sandbox");
  }
}

function assertApiKeyEnvironment(apiKey: string | undefined, environment: TheLeoKingApiEnvironment): void {
  if (apiKey === undefined) {
    return;
  }

  const keyEnvironment = apiKey.startsWith("lk_live_")
    ? "production"
    : apiKey.startsWith("lk_test_")
      ? "sandbox"
      : undefined;

  if (!keyEnvironment) {
    throw new Error("API keys must use the lk_live_ or lk_test_ prefix");
  }

  if (keyEnvironment !== environment) {
    throw new Error("API key prefix is incompatible with the selected environment");
  }
}

function parseBaseUrl(value: string): URL {
  let baseUrl: URL;

  try {
    baseUrl = new URL(value);
  } catch {
    throw new Error("baseUrl must be an absolute HTTP(S) URL");
  }

  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    throw new Error("baseUrl must be an absolute HTTP(S) URL");
  }

  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error("baseUrl must not include credentials, a query string, or a fragment");
  }

  return baseUrl;
}

function environmentForCanonicalHost(hostname: string): TheLeoKingApiEnvironment | undefined {
  const normalizedHostname = hostname.toLowerCase();

  if (normalizedHostname === "api.theleokingai.com") {
    return "production";
  }

  if (normalizedHostname === "sandbox.api.theleokingai.com") {
    return "sandbox";
  }

  return undefined;
}

function isAllowedCustomHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return normalizedHostname === "localhost"
    || normalizedHostname.endsWith(".localhost")
    || normalizedHostname === "::1"
    || normalizedHostname === "0:0:0:0:0:0:0:1"
    || /^127(?:\.\d{1,3}){3}$/.test(normalizedHostname)
    || normalizedHostname === "test"
    || normalizedHostname.endsWith(".test");
}

function normalizeBaseUrl(baseUrl: URL): string {
  const pathname = baseUrl.pathname.replace(/\/+$/, "");

  return `${baseUrl.origin}${pathname}`;
}

function requireIdempotencyKey(value: string | undefined): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error("idempotencyKey is required for paid POST methods; reuse it for a retry of the same request");
  }

  if (normalized.length > 255) {
    throw new Error("idempotencyKey cannot exceed 255 characters");
  }

  return normalized;
}

function parseWebhookSignatureHeader(header: string): { timestamp: number; signatures: string[] } | null {
  const pairs = header.split(",").map((part) => part.trim()).filter(Boolean);
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");

    if (separatorIndex <= 0) {
      return null;
    }

    const key = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);

    if (key === "t") {
      timestamp = parseWebhookTimestamp(value);
      continue;
    }

    if (key === LEO_KING_WEBHOOK_SIGNATURE_VERSION && /^[a-f0-9]{64}$/i.test(value)) {
      signatures.push(value.toLowerCase());
    }
  }

  if (!timestamp) {
    return null;
  }

  return { timestamp, signatures };
}

function parseWebhookTimestamp(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const timestamp = Number(value);

  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    return null;
  }

  return timestamp;
}

async function computeWebhookHmac(payload: string, secret: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );

  return bytesToHex(new Uint8Array(signature));
}

function timingSafeEqualHex(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) {
    return false;
  }

  const actualBytes = hexToBytes(actual);
  const expectedBytes = hexToBytes(expected);
  let diff = actualBytes.length ^ expectedBytes.length;

  for (let index = 0; index < actualBytes.length && index < expectedBytes.length; index += 1) {
    diff |= actualBytes[index] ^ expectedBytes[index];
  }

  return diff === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}
