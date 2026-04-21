import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_TIMEOUT_MS,
  type FetchLike,
  type MidlyrRequestOptions,
} from "./config.js";
import {
  MidlyrAPIError,
  MidlyrError,
  MidlyrNetworkError,
  type MidlyrResponseHeaders,
} from "./errors.js";
import type { ErrorDetail } from "./types/common.js";

export type HttpMethod = "GET" | "POST";

type QueryPrimitive = string | number | boolean;
type QueryValue = QueryPrimitive | readonly QueryPrimitive[];
type QueryParams = object;

export interface TransportOptions {
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetch?: FetchLike;
}

export interface RequestConfig extends MidlyrRequestOptions {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: unknown;
}

export class Transport {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #retryDelayMs: number;
  readonly #fetch: FetchLike;

  constructor(options: TransportOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = normalizeBaseUrl(options.baseUrl);
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.#fetch = options.fetch ?? getDefaultFetch();
  }

  async request<T>(config: RequestConfig): Promise<T> {
    const maxRetries = config.maxRetries ?? this.#maxRetries;
    const retryDelayMs = config.retryDelayMs ?? this.#retryDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await this.fetchOnce(config);

        if (response.ok) {
          return (await parseResponse(response)) as T;
        }

        const body = truncateForLog(
          await response.clone().text().catch(() => ""),
        );
        const retryable = shouldRetryResponse(response, config.method, attempt, maxRetries);
        const serverDelayMs = retryable ? getRetryDelayMs(response, retryDelayMs, attempt) : 0;
        const willRetry = retryable && serverDelayMs <= MAX_RETRY_WAIT_MS;
        if (await logAndMaybeSleep(
          `HTTP ${response.status}${body ? ` ${body}` : ""}`,
          { attempt, maxRetries, willRetry, delayMs: willRetry ? serverDelayMs : 0, serverDelayMs },
        )) continue;

        throw await buildAPIError(response);
      } catch (error) {
        if (error instanceof MidlyrAPIError) {
          throw error;
        }

        const isTimeout = isTimeoutError(error);
        const retryable =
          isRetryableTransportError(error) && shouldRetryError(config.method, attempt, maxRetries);
        const serverDelayMs = retryable ? getRetryDelayMs(undefined, retryDelayMs, attempt) : 0;
        const willRetry = retryable && serverDelayMs <= MAX_RETRY_WAIT_MS;
        const reason = error instanceof Error ? error.message : String(error);
        if (await logAndMaybeSleep(
          `network error "${reason}"`,
          { attempt, maxRetries, willRetry, delayMs: willRetry ? serverDelayMs : 0, serverDelayMs },
        )) continue;

        throw new MidlyrNetworkError(
          isTimeout ? "Midlyr request timed out" : "Midlyr request failed",
          {
            cause: error,
            isTimeout,
          },
        );
      }
    }

    throw new MidlyrNetworkError("Midlyr request failed after retries", { cause: undefined });
  }

  private fetchOnce(config: RequestConfig): Promise<Response> {
    const body = config.body === undefined ? undefined : JSON.stringify(config.body);

    return this.#fetch(buildUrl(this.#baseUrl, config.path, config.query), {
      method: config.method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        "x-api-key": this.#apiKey,
      },
      body,
      signal: createTimeoutSignal(config.timeoutMs ?? this.#timeoutMs),
    });
  }
}

function getDefaultFetch(): FetchLike {
  if (!globalThis.fetch) {
    throw new MidlyrError("A fetch implementation is required in this runtime");
  }

  return globalThis.fetch.bind(globalThis);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const url = new URL(path, `${baseUrl}/`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || !isQueryValue(value)) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (timeoutMs <= 0) {
    return new AbortController().signal;
  }

  return AbortSignal.timeout(timeoutMs);
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (!text) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }

  return text;
}

async function buildAPIError(response: Response): Promise<MidlyrAPIError> {
  const body = await parseErrorBody(response);
  const detail = getErrorDetail(body);

  return new MidlyrAPIError({
    status: response.status,
    code: detail?.code,
    message: detail?.message ?? `Midlyr API request failed with status ${response.status}`,
    headers: headersToObject(response.headers),
    body,
  });
}

async function parseErrorBody(response: Response): Promise<unknown> {
  try {
    return await parseResponse(response);
  } catch {
    return undefined;
  }
}

function getErrorDetail(body: unknown): ErrorDetail | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  const error = body["error"];
  if (!isRecord(error)) {
    return undefined;
  }

  const code = error["code"];
  const message = error["message"];
  if (typeof code !== "string" || typeof message !== "string") {
    return undefined;
  }

  return { code, message };
}

function headersToObject(headers: Headers): MidlyrResponseHeaders {
  const result: MidlyrResponseHeaders = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function shouldRetryResponse(
  response: Response,
  method: HttpMethod,
  attempt: number,
  maxRetries: number,
): boolean {
  return isSafeRetryMethod(method) && attempt < maxRetries && isRetryableStatus(response.status);
}

function shouldRetryError(method: HttpMethod, attempt: number, maxRetries: number): boolean {
  return isSafeRetryMethod(method) && attempt < maxRetries;
}

function isSafeRetryMethod(method: HttpMethod): boolean {
  return method === "GET";
}

function isRetryableStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function getRetryDelayMs(
  response: Response | undefined,
  retryDelayMs: number,
  attempt: number,
): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const parsed = parseRetryAfterMs(retryAfter);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  return retryDelayMs * 2 ** attempt;
}

function parseRetryAfterMs(value: string): number | undefined {
  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000);
  }

  const dateMs = Date.parse(value);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

function isRetryableTransportError(error: unknown): boolean {
  return error instanceof TypeError || isTimeoutError(error);
}

function isTimeoutError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return error["name"] === "TimeoutError" || error["name"] === "AbortError";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQueryValue(value: unknown): value is QueryValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) &&
      value.every(
        (item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean",
      ))
  );
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LOG_PREFIX = "[midlyr]";
const MAX_LOG_BODY_CHARS = 512;
const MAX_RETRY_WAIT_MS = 30_000;

function truncateForLog(raw: string): string {
  return raw.length > MAX_LOG_BODY_CHARS ? `${raw.slice(0, MAX_LOG_BODY_CHARS)}…` : raw;
}

async function logAndMaybeSleep(
  summary: string,
  ctx: {
    attempt: number;
    maxRetries: number;
    willRetry: boolean;
    delayMs: number;
    serverDelayMs: number;
  },
): Promise<boolean> {
  globalThis.console.error(`${LOG_PREFIX} ${summary}`);
  if (ctx.willRetry) {
    globalThis.console.error(
      `${LOG_PREFIX} retrying in ${formatDelay(ctx.delayMs)} (attempt ${ctx.attempt + 1}/${ctx.maxRetries})`,
    );
    await sleep(ctx.delayMs);
    return true;
  }
  if (ctx.serverDelayMs > MAX_RETRY_WAIT_MS) {
    globalThis.console.error(
      `${LOG_PREFIX} server asked us to retry in ${formatDelay(ctx.serverDelayMs)}, which exceeds the ${formatDelay(MAX_RETRY_WAIT_MS)} cap — giving up`,
    );
  }
  return false;
}

function formatDelay(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  const seconds = Math.round(ms / 1_000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
