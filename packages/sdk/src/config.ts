export const DEFAULT_BASE_URL = "https://api.midlyr.com";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 1;
export const DEFAULT_RETRY_DELAY_MS = 500;

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface MidlyrClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetch?: FetchLike;
}

export interface MidlyrRequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}
