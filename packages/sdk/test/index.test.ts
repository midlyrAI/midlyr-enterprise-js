import { describe, expect, it, vi } from "vitest";
import { Midlyr, MidlyrAPIError, MidlyrNetworkError, type FetchLike } from "../src/index.js";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

describe("Midlyr SDK", () => {
  it("sends API key headers and query parameters for regulation browse", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [],
        pagination: { nextCursor: null, hasMore: false, approximateTotal: 0 },
      }),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await client.regulations.browse({
      query: "fair lending",
      category: ["regulation", "guidance"],
      limit: 2,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.com/api/v1/regulations?query=fair+lending&category=regulation&category=guidance&limit=2",
    );
    expect(init?.method).toBe("GET");
    expect(init?.headers).toMatchObject({
      "x-api-key": "mlyr_test",
      accept: "application/json",
    });
  });

  it("omits undefined query parameters", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        id: "reg_123",
        text: "content",
        offset: 0,
        limit: 100,
        totalBytes: 1000,
        hasMore: false,
        details: {
          id: "reg_123",
          category: "regulation",
          title: "Regulation B",
          authorities: ["CFPB"],
          jurisdictions: ["us-federal"],
          description: "Equal credit opportunity",
          updatedAt: "2026-04-14T00:00:00.000Z",
          sourceUrl: "https://example.com/reg-b",
          totalBytes: 1000,
          tableOfContents: { entries: [] },
          attributes: {},
        },
      }),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await client.regulations.readContent("reg_123", { limit: 100 });

    expect(String(fetch.mock.calls[0]![0])).toBe(
      "https://api.example.com/api/v1/regulations/reg_123/content?limit=100",
    );
  });

  it("throws typed API errors for non-2xx responses", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse(
        { error: { code: "document_not_found", message: "No document matched id 'missing'." } },
        { status: 404 },
      ),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await expect(client.regulations.getDetails("missing")).rejects.toMatchObject({
      name: "MidlyrAPIError",
      status: 404,
      code: "document_not_found",
      message: "No document matched id 'missing'.",
    } satisfies Partial<MidlyrAPIError>);
  });

  it("retries safe GET requests", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "internal_error", message: "try again" } }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "job_123",
          type: "screen_analysis",
          status: "succeeded",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:00.000Z",
          result: { type: "analysis.screen.result", riskScore: 0, findings: [] },
          error: null,
        }),
      );
    const client = new Midlyr({
      apiKey: "mlyr_test",
      baseUrl: "https://api.example.com",
      fetch,
      maxRetries: 1,
      retryDelayMs: 0,
    });

    const result = await client.jobs.get("job_123");

    expect(result.id).toBe("job_123");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("honors Retry-After headers for safe GET retries", async () => {
    vi.useFakeTimers();
    try {
      const fetch = vi
        .fn<FetchLike>()
        .mockResolvedValueOnce(
          jsonResponse(
            { error: { code: "rate_limited", message: "try again later" } },
            { status: 429, headers: { "Retry-After": "2" } },
          ),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            id: "job_retry_after",
            type: "screen_analysis",
            status: "succeeded",
            createdAt: "2026-04-14T00:00:00.000Z",
            updatedAt: "2026-04-14T00:00:02.000Z",
            result: { type: "analysis.screen.result", riskScore: 0, findings: [] },
            error: null,
          }),
        );
      const client = new Midlyr({
        apiKey: "mlyr_test",
        baseUrl: "https://api.example.com",
        fetch,
        maxRetries: 1,
        retryDelayMs: 50_000,
      });

      const resultPromise = client.jobs.get("job_retry_after");
      await Promise.resolve();

      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1_999);
      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);

      await expect(resultPromise).resolves.toMatchObject({
        id: "job_retry_after",
        status: "succeeded",
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry mutating POST requests by default", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({ error: { code: "internal_error", message: "try again" } }, { status: 503 }),
    );
    const client = new Midlyr({
      apiKey: "mlyr_test",
      baseUrl: "https://api.example.com",
      fetch,
      maxRetries: 3,
      retryDelayMs: 0,
    });

    await expect(
      client.analysis.screen({ content: { type: "text", text: "test" }, scenario: "generic" }),
    ).rejects.toBeInstanceOf(MidlyrAPIError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("wraps network failures in typed network errors", async () => {
    const fetch = vi.fn<FetchLike>(async () => {
      throw new TypeError("fetch failed");
    });
    const client = new Midlyr({
      apiKey: "mlyr_test",
      baseUrl: "https://api.example.com",
      fetch,
      maxRetries: 0,
    });

    await expect(client.jobs.get("job_123")).rejects.toBeInstanceOf(MidlyrNetworkError);
  });
});
