import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@midlyr/sdk-js";
import { MidlyrClient } from "../../src/sdk/midlyr-client.js";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

describe("MidlyrClient", () => {
  it("adapts CLI capabilities to public SDK resources", async () => {
    const sdk = {
      regulations: {
        list: vi.fn(async () => ({ results: [], pagination: {} })),
        get: vi.fn(async () => ({ id: "reg_1" })),
        getContent: vi.fn(async () => ({ id: "reg_1", text: "content" })),
      },
      analysis: {
        screen: vi.fn(async () => ({ id: "job_1" })),
      },
      jobs: {
        get: vi.fn(async () => ({ id: "job_1", status: "succeeded" })),
      },
    };
    const client = new MidlyrClient(
      { apiKey: "test", baseUrl: "https://api.example.com", fetch: vi.fn() },
      sdk as never,
    );

    await client.browseDocuments({ query: "fair" });
    await client.getDocumentDetails("reg_1");
    await client.readDocumentContent("reg_1", { limit: 10 });
    await client.startScreenAnalysis({
      content: { type: "text", text: "test" },
      scenario: "generic",
    });
    await client.getJob("job_1");

    expect(sdk.regulations.list).toHaveBeenCalledWith({ query: "fair" });
    expect(sdk.regulations.get).toHaveBeenCalledWith("reg_1");
    expect(sdk.regulations.getContent).toHaveBeenCalledWith("reg_1", { limit: 10 });
    expect(sdk.analysis.screen).toHaveBeenCalledWith({
      content: { type: "text", text: "test" },
      scenario: "generic",
    });
    expect(sdk.jobs.get).toHaveBeenCalledWith("job_1");
  });

  it("forwards clientIdentity to the underlying SDK so the CLI tag reaches the wire", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [],
        pagination: { nextCursor: null, hasMore: false, approximateTotal: 0 },
      }),
    );
    const client = new MidlyrClient({
      apiKey: "mlyr_test",
      baseUrl: "https://api.example.com",
      fetch,
      clientIdentity: "midlyr-cli/9.9.9",
    });

    await client.browseDocuments({ query: "x" });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0]!;
    expect(init?.headers).toMatchObject({
      "x-midlyr-client": "midlyr-cli/9.9.9",
    });
  });
});
