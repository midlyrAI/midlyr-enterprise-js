import { describe, expect, it } from "vitest";
import { createLocalhostServer } from "../../../src/domain/login/localhost-server.js";
import { LoginError } from "../../../src/domain/login/errors.js";
import type {
  HttpFactory,
  HttpRequestListener,
  HttpServerLike,
  HttpServerResponse,
} from "../../../src/domain/login/types.js";

interface WriteHeadCall {
  statusCode: number;
  headers: Record<string, string>;
}

interface MockResponse extends HttpServerResponse {
  writeHeadCalls: WriteHeadCall[];
  endCalls: Array<string | undefined>;
}

function createMockResponse(): MockResponse {
  const writeHeadCalls: WriteHeadCall[] = [];
  const endCalls: Array<string | undefined> = [];
  return {
    writeHead(statusCode, headers) {
      writeHeadCalls.push({ statusCode, headers });
    },
    end(data) {
      endCalls.push(data);
    },
    get writeHeadCalls() {
      return writeHeadCalls;
    },
    get endCalls() {
      return endCalls;
    },
  } as MockResponse;
}

interface MockServer {
  server: HttpServerLike;
  listener: HttpRequestListener | null;
  listenCalls: Array<{ port: number; hostname: string }>;
  closeCallCount: number;
  fireRequest(method: string, url: string): MockResponse;
}

interface MockFactoryOptions {
  /** Override what server.address() returns. Default: { port: 49876 }. */
  address?: { port: number } | string | null;
  /** If set, calling `listen()` never invokes the callback (simulates hang). */
  skipListenCallback?: boolean;
  /** If set, `listen()` throws synchronously. */
  listenThrows?: Error;
  /** If set, close() invokes its callback with this error. */
  closeError?: Error;
}

interface MockFactory {
  factory: HttpFactory;
  servers: MockServer[];
}

function createMockFactory(opts: MockFactoryOptions = {}): MockFactory {
  const servers: MockServer[] = [];

  const factory: HttpFactory = {
    createServer(listener: HttpRequestListener): HttpServerLike {
      const listenCalls: Array<{ port: number; hostname: string }> = [];
      let closeCallCount = 0;
      let capturedListener: HttpRequestListener | null = listener;

      const server: HttpServerLike = {
        listen(port, hostname, callback) {
          listenCalls.push({ port, hostname });
          if (opts.listenThrows) throw opts.listenThrows;
          if (!opts.skipListenCallback) {
            // Invoke asynchronously to mimic real behavior
            queueMicrotask(() => callback());
          }
        },
        close(callback) {
          closeCallCount++;
          queueMicrotask(() => callback(opts.closeError));
        },
        address() {
          return opts.address !== undefined ? opts.address : { port: 49876 };
        },
      };

      const mockServer: MockServer = {
        server,
        get listener() {
          return capturedListener;
        },
        set listener(v: HttpRequestListener | null) {
          capturedListener = v;
        },
        get listenCalls() {
          return listenCalls;
        },
        get closeCallCount() {
          return closeCallCount;
        },
        fireRequest(method: string, url: string): MockResponse {
          if (!capturedListener) throw new Error("listener not captured");
          const res = createMockResponse();
          capturedListener({ method, url }, res);
          return res;
        },
      };
      servers.push(mockServer);
      return server;
    },
  };

  return { factory, servers };
}

describe("createLocalhostServer", () => {
  it("calls http.createServer and returns a handle with the mock port", async () => {
    const mf = createMockFactory({ address: { port: 12345 } });
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    expect(mf.servers).toHaveLength(1);
    expect(session.handle.port).toBe(12345);
    await session.handle.close();
  });

  it("listens on port 0 and hostname 127.0.0.1", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    expect(mf.servers[0]!.listenCalls).toEqual([{ port: 0, hostname: "127.0.0.1" }]);
    await session.handle.close();
  });

  it("resolves firstCallback when GET /callback arrives with query params", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    mf.servers[0]!.fireRequest(
      "GET",
      "/callback?state=abc&sessionId=sess_foo&result=authorized",
    );
    await expect(session.firstCallback).resolves.toEqual({
      state: "abc",
      sessionId: "sess_foo",
      result: "authorized",
    });
    await session.handle.close();
  });

  it("parseQuery keeps authorizationCode", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    mf.servers[0]!.fireRequest(
      "GET",
      "/callback?state=abc&sessionId=sess_foo&result=authorized&authorizationCode=auth_code_1234567890abcdef",
    );
    await expect(session.firstCallback).resolves.toEqual({
      state: "abc",
      sessionId: "sess_foo",
      result: "authorized",
      authorizationCode: "auth_code_1234567890abcdef",
    });
    await session.handle.close();
  });

  it("parseQuery trims whitespace from authorizationCode", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    // %0A is a URL-encoded newline — a realistic artifact from some proxies/browsers.
    mf.servers[0]!.fireRequest(
      "GET",
      "/callback?state=a&sessionId=s&result=authorized&authorizationCode=auth_code_1234567890abcdef%0A",
    );
    await expect(session.firstCallback).resolves.toMatchObject({
      authorizationCode: "auth_code_1234567890abcdef",
    });
    await session.handle.close();
  });

  it("responds 404 to GET /other and does not resolve firstCallback", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    const res = mf.servers[0]!.fireRequest("GET", "/other");
    expect(res.writeHeadCalls[0]!.statusCode).toBe(404);
    expect(res.endCalls[0]).toBe("Not Found");

    let resolved = false;
    void session.firstCallback.then(() => {
      resolved = true;
    });
    // Microtask flush
    await Promise.resolve();
    expect(resolved).toBe(false);
    await session.handle.close();
  });

  it("responds 404 to POST /callback (wrong method)", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    const res = mf.servers[0]!.fireRequest(
      "POST",
      "/callback?state=a&sessionId=sess_b&result=authorized",
    );
    expect(res.writeHeadCalls[0]!.statusCode).toBe(404);
    await session.handle.close();
  });

  it("second callback gets 410 Gone; firstCallback resolves once", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    const res1 = mf.servers[0]!.fireRequest(
      "GET",
      "/callback?state=a&sessionId=sess_x&result=authorized",
    );
    const res2 = mf.servers[0]!.fireRequest(
      "GET",
      "/callback?state=b&sessionId=sess_y&result=authorized",
    );
    await expect(session.firstCallback).resolves.toEqual({
      state: "a",
      sessionId: "sess_x",
      result: "authorized",
    });
    // First request is still "pending" (awaiting respond) — no writeHead yet
    expect(res1.writeHeadCalls).toHaveLength(0);
    expect(res2.writeHeadCalls[0]!.statusCode).toBe(410);
    expect(res2.endCalls[0]).toBe("Gone");
    await session.handle.close();
  });

  it("respond() writes headers and body to the captured response", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    const res = mf.servers[0]!.fireRequest(
      "GET",
      "/callback?state=a&sessionId=sess_k&result=authorized",
    );
    await session.firstCallback;

    await session.respond({ status: 200, body: "<p>ok</p>" });
    expect(res.writeHeadCalls).toHaveLength(1);
    expect(res.writeHeadCalls[0]!.statusCode).toBe(200);
    expect(res.writeHeadCalls[0]!.headers["content-type"]).toMatch(/text\/html/);
    expect(res.endCalls[0]).toBe("<p>ok</p>");
    await session.handle.close();
  });

  it("respond() before any callback is a no-op", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    await expect(session.respond({ status: 200, body: "x" })).resolves.toBeUndefined();
    await session.handle.close();
  });

  it("handle.close() calls server.close; calling it twice doesn't throw", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const session = await server.listen();
    await session.handle.close();
    await session.handle.close();
    expect(mf.servers[0]!.closeCallCount).toBe(2);
  });

  it("listen() does not resolve when the http listen callback never fires", async () => {
    const mf = createMockFactory({ skipListenCallback: true });
    const server = createLocalhostServer({ http: mf.factory });

    let settled = false;
    void server.listen().then(() => {
      settled = true;
    });
    // Flush several microtasks
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it("rejects with LoginError(login_server_start_failed) when address() returns null", async () => {
    const mf = createMockFactory({ address: null });
    const server = createLocalhostServer({ http: mf.factory });
    await expect(server.listen()).rejects.toBeInstanceOf(LoginError);
    await expect(server.listen()).rejects.toMatchObject({
      code: "login_server_start_failed",
    });
  });

  it("aborts firstCallback when the signal fires", async () => {
    const mf = createMockFactory();
    const server = createLocalhostServer({ http: mf.factory });
    const ac = new AbortController();
    const session = await server.listen(ac.signal);
    const reason = new Error("user cancelled");
    ac.abort(reason);
    await expect(session.firstCallback).rejects.toBe(reason);
  });
});
