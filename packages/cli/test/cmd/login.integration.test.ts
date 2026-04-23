import { describe, expect, it } from "vitest";
import type { FetchLike } from "@midlyr/sdk-js";
import { runCli } from "../../src/cli.js";
import type { LoginRuntime } from "../../src/cmd/login.js";
import type { CredentialsStore, Credentials } from "../../src/domain/credentials.js";
import type {
  BrowserOpener,
  CallbackQuery,
  CallbackResponse,
  LocalhostServer,
  LocalhostServerSession,
} from "../../src/domain/login/types.js";

interface ScriptedServer {
  instance: LocalhostServer;
  resolveFirstCallback(q: CallbackQuery): void;
  rejectFirstCallback(err: Error): void;
  respondCalls: CallbackResponse[];
  closed: boolean;
  port: number;
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
    port,
    resolveFirstCallback: (q) => resolveFirstCallback(q),
    rejectFirstCallback: (err) => rejectFirstCallback(err),
    instance: null as unknown as LocalhostServer,
  };

  const session: LocalhostServerSession = {
    handle: {
      port,
      close: async () => {
        state.closed = true;
      },
    },
    firstCallback,
    respond: async (r: CallbackResponse) => {
      respondCalls.push(r);
    },
  };

  state.instance = {
    listen: async (signal?: AbortSignal) => {
      if (signal) {
        if (signal.aborted) {
          rejectFirstCallback(
            signal.reason instanceof Error ? signal.reason : new Error("aborted"),
          );
        } else {
          signal.addEventListener(
            "abort",
            () => {
              rejectFirstCallback(
                signal.reason instanceof Error ? signal.reason : new Error("aborted"),
              );
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

interface InMemoryCredStore {
  store: CredentialsStore;
  writes: Credentials[];
}

function inMemoryCredStore(): InMemoryCredStore {
  const writes: Credentials[] = [];
  let current: Credentials = {};
  return {
    writes,
    store: {
      read: async () => ({ ...current }),
      write: async (c: Credentials) => {
        current = { ...c };
        writes.push({ ...c });
      },
      path: () => "/tmp/credentials.json",
    },
  };
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

const DEFAULT_SESSION_JSON = {
  sessionId: "sess_abc",
  authorizeUrl: "https://app.midlyr.com/cli-auth?session=sess_abc",
  pairingCode: "ABCD-1234",
  expiresAt: "2026-04-16T23:59:00.000Z",
  pollIntervalSeconds: 2,
};

const DEFAULT_EXCHANGE_JSON = {
  apiKey: "mlyr_test_abc_secret",
  keyPrefix: "mlyr_test_abc",
  label: "cli-2026-04-16",
};

// Backend zod requires authorizationCode min 32 / max 160.
const VALID_AUTH_CODE = "c".repeat(40);

interface Harness {
  runtime: LoginRuntime;
  server: ScriptedServer;
  browser: ScriptedBrowser;
  creds: InMemoryCredStore;
  fetcher: ScriptedFetch;
  stdout: () => string;
  stderr: () => string;
  signalHandlers: Map<string, (() => void)[]>;
  fireTimeout(): void;
  fireSignal(signal: "SIGINT" | "SIGTERM"): void;
}

interface HarnessOpts {
  fetcher?: ScriptedFetch;
  server?: ScriptedServer;
  browser?: ScriptedBrowser;
  env?: Record<string, string | undefined>;
}

function makeHarness(opts: HarnessOpts = {}): Harness {
  const server = opts.server ?? scriptedServer();
  const browser = opts.browser ?? scriptedBrowser();
  const creds = inMemoryCredStore();
  const fetcher =
    opts.fetcher ??
    scriptedFetch([
      { ok: true, status: 200, json: DEFAULT_SESSION_JSON },
      { ok: true, status: 200, json: DEFAULT_EXCHANGE_JSON },
    ]);

  let stdout = "";
  let stderr = "";
  const signalHandlers = new Map<string, (() => void)[]>();
  let timerHandler: (() => void) | null = null;

  const runtime: LoginRuntime = {
    env: opts.env ?? {},
    stdout: { write: (chunk: string) => (stdout += chunk) },
    stderr: { write: (chunk: string) => (stderr += chunk) },
    fetch: fetcher.fetch,
    credentialsStore: creds.store,
    onSignal: (signal, handler) => {
      const arr = signalHandlers.get(signal) ?? [];
      arr.push(handler);
      signalHandlers.set(signal, arr);
    },
    browserOpener: browser.opener,
    localhostServer: server.instance,
    randomUUID: () => "STATE_UUID",
    randomBytes: (size: number) => {
      const out = new Uint8Array(size);
      for (let i = 0; i < size; i++) out[i] = i & 0xff;
      return out;
    },
    sha256: (_data: Uint8Array) => {
      const out = new Uint8Array(32);
      for (let i = 0; i < 32; i++) out[i] = (i * 7 + 3) & 0xff;
      return out;
    },
    setTimeout: ((handler: () => void, _ms: number) => {
      timerHandler = handler;
      return { id: 1 } as unknown as ReturnType<typeof globalThis.setTimeout>;
    }) as LoginRuntime["setTimeout"],
    clearTimeout: () => {
      timerHandler = null;
    },
  };

  return {
    runtime,
    server,
    browser,
    creds,
    fetcher,
    stdout: () => stdout,
    stderr: () => stderr,
    signalHandlers,
    fireTimeout: () => {
      if (timerHandler) timerHandler();
    },
    fireSignal: (sig) => {
      for (const h of signalHandlers.get(sig) ?? []) h();
    },
  };
}

async function flush(n = 20): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve();
}

function parseJsonLines(text: string): unknown {
  const trimmed = text.trim();
  return JSON.parse(trimmed);
}

describe("midlyr login (integration)", () => {
  it("happy path: writes credentials and prints the success message", async () => {
    const h = makeHarness();

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    const exitCode = await promise;

    expect(exitCode).toBe(0);
    expect(h.creds.writes).toEqual([{ apiKey: "mlyr_test_abc_secret" }]);
    expect(h.fetcher.calls[0]!.url).toBe(
      "https://api.midlyr.com/api/v1/auth/cli/sessions?flow=api",
    );
    expect(h.browser.opened).toEqual(["https://app.midlyr.com/cli-auth?session=sess_abc&flow=api"]);
    expect(h.stdout()).toContain("Authentication successful");
  });

  it("timeout: exits 1 with login_timeout, no credentials written", async () => {
    const h = makeHarness();

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.fireTimeout();
    const exitCode = await promise;

    expect(exitCode).toBe(1);
    const payload = parseJsonLines(h.stderr()) as { error: { code: string } };
    expect(payload.error.code).toBe("login_timeout");
    expect(h.creds.writes).toEqual([]);
  });

  it("state mismatch: exits 1 with login_state_mismatch, no credentials, exchange NOT called", async () => {
    const h = makeHarness();

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.server.resolveFirstCallback({
      state: "WRONG_STATE",
      sessionId: "sess_abc",
      result: "authorized",
    });
    const exitCode = await promise;

    expect(exitCode).toBe(1);
    const payload = parseJsonLines(h.stderr()) as { error: { code: string } };
    expect(payload.error.code).toBe("login_state_mismatch");
    expect(h.creds.writes).toEqual([]);
    expect(h.fetcher.calls).toHaveLength(1);
  });

  it("browser opener failure: prints authorizeUrl, still completes login", async () => {
    const browser = scriptedBrowser(new Error("no browser"));
    const h = makeHarness({ browser });

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    const exitCode = await promise;

    expect(exitCode).toBe(0);
    expect(h.stdout()).toContain("https://app.midlyr.com/cli-auth?session=sess_abc&flow=api");
    expect(h.creds.writes).toEqual([{ apiKey: "mlyr_test_abc_secret" }]);
  });

  it("works without MIDLYR_API_KEY: login bypasses resolveCliConfig", async () => {
    const h = makeHarness({ env: {} });

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    const exitCode = await promise;

    expect(exitCode).toBe(0);
    expect(h.creds.writes).toEqual([{ apiKey: "mlyr_test_abc_secret" }]);
  });

  it("exchange fails (401): exits 1 with login_exchange_failed, no credentials written", async () => {
    const fetcher = scriptedFetch([
      { ok: true, status: 200, json: DEFAULT_SESSION_JSON },
      { ok: false, status: 401, json: { error: "invalid_verifier" } },
    ]);
    const h = makeHarness({ fetcher });

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
      authorizationCode: VALID_AUTH_CODE,
    });
    const exitCode = await promise;

    expect(exitCode).toBe(1);
    const payload = parseJsonLines(h.stderr()) as { error: { code: string } };
    expect(payload.error.code).toBe("login_exchange_failed");
    expect(h.creds.writes).toEqual([]);
  });

  it("result=denied: exits 1 with login_callback_error, no credentials written", async () => {
    const h = makeHarness();

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "denied",
    });
    const exitCode = await promise;

    expect(exitCode).toBe(1);
    const payload = parseJsonLines(h.stderr()) as { error: { code: string } };
    expect(payload.error.code).toBe("login_callback_error");
    expect(h.creds.writes).toEqual([]);
  });

  it("missing sessionId: exits 1 with login_callback_error, no credentials written", async () => {
    const h = makeHarness();

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      result: "authorized",
    });
    const exitCode = await promise;

    expect(exitCode).toBe(1);
    const payload = parseJsonLines(h.stderr()) as { error: { code: string } };
    expect(payload.error.code).toBe("login_callback_error");
    expect(h.creds.writes).toEqual([]);
  });

  it("missing authorizationCode: exits 1 with login_callback_error, no credentials, exchange NOT called", async () => {
    const h = makeHarness();

    const promise = runCli(["login"], h.runtime);
    await flush();
    h.server.resolveFirstCallback({
      state: "STATE_UUID",
      sessionId: "sess_abc",
      result: "authorized",
    });
    const exitCode = await promise;

    expect(exitCode).toBe(1);
    const payload = parseJsonLines(h.stderr()) as { error: { code: string } };
    expect(payload.error.code).toBe("login_callback_error");
    expect(h.creds.writes).toEqual([]);
    expect(h.fetcher.calls).toHaveLength(1);
  });
});
