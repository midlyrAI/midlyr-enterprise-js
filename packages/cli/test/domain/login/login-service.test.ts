import { describe, expect, it } from "vitest";
import { runLogin, type LoginServiceDeps } from "../../../src/domain/login/login-service.js";
import { LoginError } from "../../../src/domain/login/errors.js";
import { CliInterruptedError } from "../../../src/domain/errors.js";
import type {
  BrowserOpener,
  CallbackQuery,
  CallbackResponse,
  LocalhostServer,
  LocalhostServerSession,
} from "../../../src/domain/login/types.js";
import type { CredentialsStore, Credentials } from "../../../src/domain/credentials.js";
import type { FetchLike } from "@midlyr/sdk";

interface ScriptedServer {
  instance: LocalhostServer;
  resolveFirstCallback(q: CallbackQuery): void;
  rejectFirstCallback(err: Error): void;
  respondCalls: CallbackResponse[];
  closed: boolean;
  closeCount: number;
  listenCount: number;
  port: number;
  session: LocalhostServerSession | null;
}

function scriptedServer(port = 53100): ScriptedServer {
  const respondCalls: CallbackResponse[] = [];
  let resolveFirstCallback!: (q: CallbackQuery) => void;
  let rejectFirstCallback!: (err: Error) => void;
  const firstCallback = new Promise<CallbackQuery>((resolve, reject) => {
    resolveFirstCallback = resolve;
    rejectFirstCallback = reject;
  });

  const state: ScriptedServer = {
    respondCalls,
    closed: false,
    closeCount: 0,
    listenCount: 0,
    port,
    session: null,
    resolveFirstCallback: (q) => resolveFirstCallback(q),
    rejectFirstCallback: (err) => rejectFirstCallback(err),
    instance: null as unknown as LocalhostServer,
  };

  const session: LocalhostServerSession = {
    handle: {
      port,
      close: async () => {
        state.closed = true;
        state.closeCount++;
      },
    },
    firstCallback,
    respond: async (r: CallbackResponse) => {
      respondCalls.push(r);
    },
  };
  state.session = session;

  state.instance = {
    listen: async (signal?: AbortSignal) => {
      state.listenCount++;
      if (signal) {
        if (signal.aborted) {
          rejectFirstCallback(signal.reason instanceof Error ? signal.reason : new Error("aborted"));
        } else {
          signal.addEventListener(
            "abort",
            () => {
              rejectFirstCallback(signal.reason instanceof Error ? signal.reason : new Error("aborted"));
            },
            { once: true },
          );
        }
      }
      return session;
    },
  };

  return state;
}

interface ScriptedCredStore {
  store: CredentialsStore;
  writes: Credentials[];
  writeError?: Error;
}

function scriptedCredStore(writeError?: Error): ScriptedCredStore {
  const writes: Credentials[] = [];
  const state: ScriptedCredStore = {
    writes,
    writeError,
    store: {
      read: async () => ({}),
      write: async (c: Credentials) => {
        writes.push(c);
        if (writeError) throw writeError;
      },
      path: () => "/tmp/credentials.json",
    },
  };
  return state;
}

interface ScriptedBrowser {
  opener: BrowserOpener;
  opened: string[];
  openError?: Error;
}

function scriptedBrowser(openError?: Error): ScriptedBrowser {
  const opened: string[] = [];
  return {
    opened,
    openError,
    opener: {
      open: async (url: string) => {
        opened.push(url);
        if (openError) throw openError;
      },
    },
  };
}

interface FetchCall {
  url: string;
  init: RequestInit;
}

interface ScriptedFetch {
  fetch: FetchLike;
  calls: FetchCall[];
}

type FetchResponder =
  | { ok: true; status?: number; json: unknown }
  | { ok: false; status: number; json?: unknown };

function scriptedFetch(responders: FetchResponder[]): ScriptedFetch {
  const calls: FetchCall[] = [];
  let index = 0;
  const fetch: FetchLike = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    const r = responders[index++];
    if (!r) {
      throw new Error(`Unexpected fetch call #${index} to ${String(input)}`);
    }
    const status = "status" in r && typeof r.status === "number" ? r.status : r.ok ? 200 : 500;
    return {
      ok: r.ok,
      status,
      async json() {
        return r.json;
      },
    } as unknown as Response;
  };
  return { fetch, calls };
}

interface Harness {
  deps: LoginServiceDeps;
  server: ScriptedServer;
  browser: ScriptedBrowser;
  creds: ScriptedCredStore;
  fetcher: ScriptedFetch;
  stdout: { write(chunk: string): unknown; text: string };
  calls: string[];
  fireSignal(signal: "SIGINT" | "SIGTERM"): void;
  fireTimeout(): void;
  setTimeoutCalls: Array<{ ms: number }>;
  clearTimeoutCalls: number;
  randomBytesCalls: number[];
  sha256Calls: Uint8Array[];
}

function captureWritable(): { write(chunk: string): unknown; text: string } {
  const w = {
    text: "",
    write(chunk: string) {
      w.text += chunk;
      return true;
    },
  };
  return w;
}

const DEFAULT_SESSION_JSON = {
  sessionId: "sess_abc",
  authorizeUrl: "https://app.midlyr.com/cli-auth?session=sess_abc",
  pairingCode: "ABCD-1234",
  expiresAt: "2026-04-16T23:59:00.000Z",
  pollIntervalSeconds: 2,
};

// Backend zod requires authorizationCode to be min 32 / max 160.
const VALID_AUTH_CODE = "c".repeat(40);

const DEFAULT_EXCHANGE_JSON = {
  apiKey: "mlyr_test_abc_secret",
  keyPrefix: "mlyr_test_abc",
  label: "cli-2026-04-16",
};

function makeHarness(opts: {
  server?: ScriptedServer;
  browser?: ScriptedBrowser;
  creds?: ScriptedCredStore;
  fetcher?: ScriptedFetch;
  timeoutMs?: number;
  randomBytes?: (size: number) => Uint8Array;
  sha256?: (data: Uint8Array) => Uint8Array;
} = {}): Harness {
  const server = opts.server ?? scriptedServer();
  const browser = opts.browser ?? scriptedBrowser();
  const creds = opts.creds ?? scriptedCredStore();
  const fetcher = opts.fetcher ?? scriptedFetch([
    { ok: true, status: 200, json: DEFAULT_SESSION_JSON },
    { ok: true, status: 200, json: DEFAULT_EXCHANGE_JSON },
  ]);
  const stdout = captureWritable();
  const calls: string[] = [];
  const setTimeoutCalls: Array<{ ms: number }> = [];
  let clearTimeoutCalls = 0;
  const randomBytesCalls: number[] = [];
  const sha256Calls: Uint8Array[] = [];

  let timerHandler: (() => void) | null = null;

  const signalHandlers: Record<string, (() => void)[]> = { SIGINT: [], SIGTERM: [] };

  // Track order: onSignal must be called before localhostServer.listen.
  const originalListen = server.instance.listen.bind(server.instance);
  server.instance = {
    listen: async (signal?: AbortSignal) => {
      calls.push("listen");
      return originalListen(signal);
    },
  };

  const defaultRandomBytes = (size: number): Uint8Array => {
    randomBytesCalls.push(size);
    // Deterministic bytes: 0, 1, 2, ..., size-1
    const out = new Uint8Array(size);
    for (let i = 0; i < size; i++) out[i] = i & 0xff;
    return out;
  };

  const defaultSha256 = (data: Uint8Array): Uint8Array => {
    sha256Calls.push(data);
    // Return a deterministic 32-byte output — NOT cryptographically real, just a fixed tag.
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = (i * 7 + 3) & 0xff;
    return out;
  };

  const deps: LoginServiceDeps = {
    localhostServer: server.instance,
    browserOpener: browser.opener,
    credentialsStore: creds.store,
    fetch: fetcher.fetch,
    randomUUID: () => "STATE_UUID",
    randomBytes: opts.randomBytes ?? defaultRandomBytes,
    sha256: opts.sha256 ?? defaultSha256,
    setTimeout: ((handler: () => void, ms: number) => {
      setTimeoutCalls.push({ ms });
      timerHandler = handler;
      return { id: 1 } as unknown as ReturnType<typeof globalThis.setTimeout>;
    }) as LoginServiceDeps["setTimeout"],
    clearTimeout: () => {
      clearTimeoutCalls++;
    },
    onSignal: (signal, handler) => {
      calls.push(`onSignal:${signal}`);
      signalHandlers[signal]!.push(handler);
    },
    stdout,
    apiBaseUrl: "https://api.midlyr.com",
    appBaseUrl: "https://app.midlyr.com",
    label: "cli-2026-04-16",
    timeoutMs: opts.timeoutMs,
  };

  return {
    deps,
    server,
    browser,
    creds,
    fetcher,
    stdout,
    calls,
    fireSignal: (sig) => {
      for (const h of signalHandlers[sig]!) h();
    },
    fireTimeout: () => {
      if (timerHandler) timerHandler();
    },
    setTimeoutCalls,
    get clearTimeoutCalls() {
      return clearTimeoutCalls;
    },
    randomBytesCalls,
    sha256Calls,
  };
}

function base64UrlOfBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// Flush microtasks enough times to let async code past listen() + fetch() + browser.open().
async function flush(n = 20): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve();
}

describe("runLogin", () => {
  it("happy path: calls sessions + exchange, writes credentials, returns {apiKey, keyPrefix, label}", async () => {
    const h = makeHarness();
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    const result = await p;

    expect(result).toEqual({
      apiKey: "mlyr_test_abc_secret",
      keyPrefix: "mlyr_test_abc",
      label: "cli-2026-04-16",
    });
    expect(h.creds.writes).toEqual([{ apiKey: "mlyr_test_abc_secret" }]);

    // Two fetch calls in order
    expect(h.fetcher.calls).toHaveLength(2);
    expect(h.fetcher.calls[0]!.url).toBe("https://api.midlyr.com/api/v1/auth/cli/sessions");
    expect(h.fetcher.calls[0]!.init.method).toBe("POST");
    const sessionsBody = JSON.parse(String(h.fetcher.calls[0]!.init.body));
    expect(sessionsBody.state).toBe("STATE_UUID");
    expect(sessionsBody.label).toBe("cli-2026-04-16");
    expect(sessionsBody.codeChallengeMethod).toBe("S256");
    expect(sessionsBody.callbackUrl).toBe("http://localhost:53100/callback");

    expect(h.fetcher.calls[1]!.url).toBe("https://api.midlyr.com/api/v1/auth/cli/exchange");
    const exchangeBody = JSON.parse(String(h.fetcher.calls[1]!.init.body));
    expect(exchangeBody.sessionId).toBe("sess_abc");
    expect(typeof exchangeBody.codeVerifier).toBe("string");

    // Browser opened with the authorizeUrl FROM the server, not constructed
    expect(h.browser.opened).toEqual(["https://app.midlyr.com/cli-auth?session=sess_abc"]);

    // Success response, server closed
    expect(h.server.respondCalls).toHaveLength(1);
    expect(h.server.respondCalls[0]!.status).toBe(200);
    expect(h.server.respondCalls[0]!.body).toContain("close this window");
    expect(h.server.closed).toBe(true);
  });

  it("PKCE: codeChallenge equals base64url(sha256(codeVerifier))", async () => {
    const fixedVerifierBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) fixedVerifierBytes[i] = (i * 3 + 1) & 0xff;
    const fixedSha = new Uint8Array(32);
    for (let i = 0; i < 32; i++) fixedSha[i] = (i * 5 + 9) & 0xff;

    const h = makeHarness({
      randomBytes: (size) => {
        expect(size).toBe(32);
        return fixedVerifierBytes;
      },
      sha256: (data) => {
        // sha256 is called with ASCII bytes of the codeVerifier string
        const expectedVerifier = base64UrlOfBytes(fixedVerifierBytes);
        let asAscii = "";
        for (let i = 0; i < data.length; i++) asAscii += String.fromCharCode(data[i]!);
        expect(asAscii).toBe(expectedVerifier);
        return fixedSha;
      },
    });
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    await p;

    const sessionsBody = JSON.parse(String(h.fetcher.calls[0]!.init.body));
    expect(sessionsBody.codeChallenge).toBe(base64UrlOfBytes(fixedSha));
    // And the exchange carries the original verifier
    const exchangeBody = JSON.parse(String(h.fetcher.calls[1]!.init.body));
    expect(exchangeBody.codeVerifier).toBe(base64UrlOfBytes(fixedVerifierBytes));
  });

  it("registers SIGINT before calling localhostServer.listen", async () => {
    const h = makeHarness();
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    await p;

    const signalIdx = h.calls.indexOf("onSignal:SIGINT");
    const listenIdx = h.calls.indexOf("listen");
    expect(signalIdx).toBeGreaterThanOrEqual(0);
    expect(listenIdx).toBeGreaterThanOrEqual(0);
    expect(signalIdx).toBeLessThan(listenIdx);
  });

  it("session start fails (500): throws login_session_start_failed, closes server, no exchange call", async () => {
    const fetcher = scriptedFetch([
      { ok: false, status: 500, json: { error: "boom" } },
    ]);
    const h = makeHarness({ fetcher });
    const p = runLogin(h.deps);
    await expect(p).rejects.toMatchObject({
      name: "LoginError",
      code: "login_session_start_failed",
    });
    expect(h.server.closed).toBe(true);
    expect(h.fetcher.calls).toHaveLength(1);
    expect(h.browser.opened).toEqual([]);
    expect(h.creds.writes).toEqual([]);
  });

  it("timeout: throws LoginError(login_timeout), closes server, no credential write", async () => {
    const h = makeHarness({ timeoutMs: 5000 });
    const p = runLogin(h.deps);
    await flush();
    h.fireTimeout();
    await expect(p).rejects.toBeInstanceOf(LoginError);
    await expect(p).rejects.toMatchObject({ code: "login_timeout" });
    expect(h.server.closed).toBe(true);
    expect(h.creds.writes).toEqual([]);
  });

  it("state mismatch: throws login_state_mismatch, responds 400, exchange NOT called", async () => {
    const h = makeHarness();
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "WRONG",
      sessionId: "sess_abc",
      result: "authorized",
    });
    await expect(p).rejects.toMatchObject({
      name: "LoginError",
      code: "login_state_mismatch",
    });
    expect(h.server.respondCalls[0]!.status).toBe(400);
    // Only /sessions was called — no /exchange
    expect(h.fetcher.calls).toHaveLength(1);
    expect(h.creds.writes).toEqual([]);
  });

  it("result=denied: throws login_callback_error, exchange NOT called", async () => {
    const h = makeHarness();
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "denied",
    });
    await expect(p).rejects.toMatchObject({
      name: "LoginError",
      code: "login_callback_error",
    });
    expect(h.server.respondCalls[0]!.status).toBe(400);
    expect(h.fetcher.calls).toHaveLength(1);
    expect(h.creds.writes).toEqual([]);
  });

  it("missing sessionId: throws login_callback_error, exchange NOT called", async () => {
    const h = makeHarness();
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({ state: "STATE_UUID", result: "authorized" });
    await expect(p).rejects.toMatchObject({
      name: "LoginError",
      code: "login_callback_error",
    });
    expect(h.server.respondCalls[0]!.status).toBe(400);
    expect(h.fetcher.calls).toHaveLength(1);
    expect(h.creds.writes).toEqual([]);
  });

  it("exchange fails (401): throws login_exchange_failed with status detail", async () => {
    const fetcher = scriptedFetch([
      { ok: true, status: 200, json: DEFAULT_SESSION_JSON },
      { ok: false, status: 401, json: { error: "invalid_verifier" } },
    ]);
    const h = makeHarness({ fetcher });
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    await expect(p).rejects.toMatchObject({
      name: "LoginError",
      code: "login_exchange_failed",
      detail: { status: 401 },
    });
    expect(h.creds.writes).toEqual([]);
  });

  it("credentials write fails: prints recovery message then rethrows", async () => {
    const writeErr = new Error("ENOSPC");
    const creds = scriptedCredStore(writeErr);
    const h = makeHarness({ creds });
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    await expect(p).rejects.toBe(writeErr);
    expect(h.stdout.text).toContain("midlyr config set api-key mlyr_test_abc_secret");
  });

  it("browser open fails: prints authorizeUrl, login still completes", async () => {
    const browser = scriptedBrowser(new Error("no browser"));
    const h = makeHarness({ browser });
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    const result = await p;
    expect(result.apiKey).toBe("mlyr_test_abc_secret");
    expect(h.stdout.text).toContain("https://app.midlyr.com/cli-auth?session=sess_abc");
  });

  it("SIGINT during wait: throws CliInterruptedError, closes server", async () => {
    const h = makeHarness();
    const p = runLogin(h.deps);
    await flush();
    h.fireSignal("SIGINT");
    await expect(p).rejects.toBeInstanceOf(CliInterruptedError);
    expect(h.server.closed).toBe(true);
  });

  it("forwards authorizationCode from callback to /exchange body", async () => {
    const h = makeHarness();
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    await p;

    const exchangeBody = JSON.parse(String(h.fetcher.calls[1]!.init.body));
    expect(Object.keys(exchangeBody).sort()).toEqual([
      "authorizationCode",
      "codeVerifier",
      "sessionId",
    ]);
    expect(exchangeBody.authorizationCode).toBe(VALID_AUTH_CODE);
    expect(exchangeBody.sessionId).toBe("sess_abc");
    expect(typeof exchangeBody.codeVerifier).toBe("string");
  });

  it("missing authorizationCode: throws login_callback_error, exchange NOT called", async () => {
    const h = makeHarness();
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      // authorizationCode intentionally omitted
    });
    await expect(p).rejects.toMatchObject({
      name: "LoginError",
      code: "login_callback_error",
      message: "Callback missing required fields",
    });
    expect(h.server.respondCalls[0]!.status).toBe(400);
    // Only /sessions was called — no /exchange
    expect(h.fetcher.calls).toHaveLength(1);
    expect(h.creds.writes).toEqual([]);
  });

  it("LoginError on exchange failure never contains the authorizationCode value", async () => {
    // Use a distinctive secret so a substring search is meaningful.
    const SECRET_CODE = "SECRET_" + "z".repeat(33);
    const fetcher = scriptedFetch([
      { ok: true, status: 200, json: DEFAULT_SESSION_JSON },
      { ok: false, status: 401, json: { error: "invalid_verifier" } },
    ]);
    const h = makeHarness({ fetcher });
    const p = runLogin(h.deps);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: SECRET_CODE,
    });

    let caught: unknown;
    try {
      await p;
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(LoginError);
    const err = caught as LoginError;
    // Serialized error surface (message + detail + JSON) must never leak the code.
    expect(err.message).not.toContain(SECRET_CODE);
    expect(JSON.stringify(err)).not.toContain(SECRET_CODE);
    // Stdout written during the login flow must not leak it either.
    expect(h.stdout.text).not.toContain(SECRET_CODE);
  });
});
