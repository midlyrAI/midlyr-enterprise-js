import { describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { createLocalhostServer } from "../../../src/domain/login/localhost-server.js";
import type { HttpFactory } from "../../../src/domain/login/types.js";

describe("localhost-server smoke", () => {
  it("binds to 127.0.0.1:0, receives real fetch callback, and flushes respond()", async () => {
    const http = {
      createServer: (l) => createServer(l),
    } as unknown as HttpFactory;
    const server = createLocalhostServer({ http });
    const session = await server.listen();
    const { port } = session.handle;

    // Fire real fetch
    const fetchPromise = fetch(
      `http://127.0.0.1:${port}/callback?state=xyz&sessionId=sess_abc&result=authorized`,
    );

    const query = await session.firstCallback;
    expect(query).toEqual({ state: "xyz", sessionId: "sess_abc", result: "authorized" });

    await session.respond({ status: 200, body: "<p>ok</p>" });

    const res = await fetchPromise;
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<p>ok</p>");

    await session.handle.close();
  });
});
