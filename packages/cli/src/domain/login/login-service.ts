import type {
  BrowserOpener,
  CallbackQuery,
  CallbackResponse,
  LocalhostServer,
} from "./types.js";
import { LoginError } from "./errors.js";
import type { CredentialsStore } from "../credentials.js";
import { CliInterruptedError } from "../errors.js";
import type { FetchLike } from "@midlyr/sdk";

type SignalName = "SIGINT" | "SIGTERM";
type SignalHandler = () => void;

type Writable = { write(chunk: string): unknown };

export interface LoginServiceDeps {
  localhostServer: LocalhostServer;
  browserOpener: BrowserOpener;
  credentialsStore: CredentialsStore;
  fetch: FetchLike;
  randomUUID: () => string;
  randomBytes: (sizeBytes: number) => Uint8Array;
  sha256: (data: Uint8Array) => Uint8Array;
  setTimeout: (handler: () => void, ms: number) => ReturnType<typeof globalThis.setTimeout>;
  clearTimeout: (handle: ReturnType<typeof globalThis.setTimeout>) => void;
  onSignal: (signal: SignalName, handler: SignalHandler) => void;
  stdout: Writable;
  apiBaseUrl: string; // e.g. "https://api.midlyr.com"
  appBaseUrl: string; // e.g. "https://app.midlyr.com" — used only for error messages
  label: string; // e.g. "cli-2026-04-16"
  timeoutMs?: number; // default 300_000
}

export interface LoginResult {
  apiKey: string;
  keyPrefix: string;
  label: string;
}

const DEFAULT_TIMEOUT_MS = 300_000;
const SUCCESS_HTML = `<html><body><p>Authenticated. You can close this window.</p></body></html>`;
const FAILURE_HTML = `<html><body><p>Authentication failed. You can close this window.</p></body></html>`;

interface SessionStartResponse {
  sessionId: string;
  authorizeUrl: string;
  pairingCode: string;
  expiresAt: string;
  pollIntervalSeconds: number;
}

interface ExchangeResponse {
  apiKey: string;
  keyPrefix: string;
  label: string;
}

export async function runLogin(deps: LoginServiceDeps): Promise<LoginResult> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const abortController = new AbortController();

  // 1. PKCE + state
  const codeVerifier = base64UrlEncode(deps.randomBytes(32));
  const codeChallenge = base64UrlEncode(deps.sha256(asciiBytes(codeVerifier)));
  const state = deps.randomUUID();

  // 2. Register SIGINT BEFORE server.listen (no leak window)
  let interrupted = false;
  deps.onSignal("SIGINT", () => {
    interrupted = true;
    abortController.abort(new CliInterruptedError());
  });

  // 3. Start localhost server
  const session = await deps.localhostServer.listen(abortController.signal);

  // 4. Schedule timeout
  let timedOut = false;
  const timer = deps.setTimeout(() => {
    timedOut = true;
    abortController.abort(new LoginError("login_timeout", `Login timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  // 5. Start session with backend
  let sessionStart: SessionStartResponse;
  try {
    const sessionRes = await deps.fetch(`${deps.apiBaseUrl}/api/v1/auth/cli/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        callbackUrl: `http://localhost:${session.handle.port}/callback`,
        state,
        label: deps.label,
        codeChallenge,
        codeChallengeMethod: "S256",
      }),
    });
    if (!sessionRes.ok) {
      deps.clearTimeout(timer);
      await closeSession(session);
      throw new LoginError(
        "login_session_start_failed",
        `Failed to start CLI auth session (HTTP ${sessionRes.status}) — see ${deps.appBaseUrl} and retry.`,
        { status: sessionRes.status },
      );
    }
    sessionStart = (await sessionRes.json()) as SessionStartResponse;
  } catch (err) {
    if (err instanceof LoginError) throw err;
    deps.clearTimeout(timer);
    await closeSession(session);
    throw new LoginError(
      "login_session_start_failed",
      err instanceof Error ? err.message : String(err),
    );
  }

  // 6. Open browser — non-fatal on failure
  try {
    await deps.browserOpener.open(sessionStart.authorizeUrl);
  } catch {
    deps.stdout.write(
      `Could not open browser automatically. Open this URL to authenticate:\n\n  ${sessionStart.authorizeUrl}\n\n`,
    );
  }

  // 7. Await the callback (race with abort)
  let query: CallbackQuery;
  try {
    query = await session.firstCallback;
  } catch (err) {
    await closeSession(session);
    deps.clearTimeout(timer);
    if (interrupted) throw new CliInterruptedError();
    if (timedOut) throw new LoginError("login_timeout", `Login timed out after ${timeoutMs}ms`);
    throw err;
  }

  deps.clearTimeout(timer);

  // 8. Validate callback
  // 8a. state mismatch (check first so a mismatched state never leaks anything)
  if (query.state !== state) {
    await respondSafely(session, { status: 400, body: FAILURE_HTML });
    await closeSession(session);
    throw new LoginError("login_state_mismatch", "State parameter mismatch");
  }
  // 8b. explicit error param
  if (query.error) {
    await respondSafely(session, { status: 400, body: FAILURE_HTML });
    await closeSession(session);
    throw new LoginError("login_callback_error", `Authentication failed: ${query.error}`, {
      error: query.error,
    });
  }
  // 8c. result must be "authorized"
  if (query.result !== "authorized") {
    await respondSafely(session, { status: 400, body: FAILURE_HTML });
    await closeSession(session);
    throw new LoginError(
      "login_callback_error",
      `Authorization was ${query.result ?? "not granted"}`,
      { result: query.result },
    );
  }
  // 8d. missing sessionId
  if (!query.sessionId) {
    await respondSafely(session, { status: 400, body: FAILURE_HTML });
    await closeSession(session);
    throw new LoginError("login_callback_error", "Callback sessionId missing");
  }

  // 9. Respond 200 to browser, then close the server
  await respondSafely(session, { status: 200, body: SUCCESS_HTML });
  await closeSession(session);

  // 10. Exchange sessionId + codeVerifier for apiKey
  const exchangeRes = await deps.fetch(`${deps.apiBaseUrl}/api/v1/auth/cli/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sessionId: query.sessionId, codeVerifier }),
  });
  if (!exchangeRes.ok) {
    throw new LoginError(
      "login_exchange_failed",
      `Exchange failed (HTTP ${exchangeRes.status})`,
      { status: exchangeRes.status },
    );
  }
  const { apiKey, keyPrefix, label } = (await exchangeRes.json()) as ExchangeResponse;

  // 11. Save credentials
  try {
    await deps.credentialsStore.write({ apiKey });
  } catch (err) {
    deps.stdout.write(
      `\nFailed to save API key to credentials store. Save it manually:\n\n  midlyr config set api-key ${apiKey}\n\n`,
    );
    throw err;
  }

  return { apiKey, keyPrefix, label };
}

async function respondSafely(
  session: { respond: (r: CallbackResponse) => Promise<void> },
  r: CallbackResponse,
): Promise<void> {
  try {
    await session.respond(r);
  } catch {
    // swallow — response may already be sent
  }
}

async function closeSession(session: { handle: { close(): Promise<void> } }): Promise<void> {
  try {
    await session.handle.close();
  } catch {
    // swallow
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  // Encode raw bytes to base64 (no line breaks), then convert to base64url.
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  // btoa is available in modern Node (>=16) and all browsers.
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i) & 0xff;
  }
  return out;
}
