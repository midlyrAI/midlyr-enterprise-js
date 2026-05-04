import { describe, expect, it, vi } from "vitest";
import {
  Midlyr,
  MidlyrAPIError,
  MidlyrError,
  MidlyrNetworkError,
  SDK_CLIENT_IDENTITY,
  SDK_CLIENT_PRODUCT,
  SDK_VERSION,
  type FetchLike,
} from "../src/index.js";

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

    await client.regulations.list({
      query: "fair lending",
      categories: ["regulation", "guidance"],
      limit: 2,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.com/api/v1/regulations/?query=fair+lending&categories=regulation&categories=guidance&limit=2",
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
          attributes: { category: "regulation", cfrTitle: 12, cfrPart: 1002 },
        },
      }),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await client.regulations.getContent("reg_123", { limit: 100 });

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

    await expect(client.regulations.get("missing")).rejects.toMatchObject({
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

  it("POSTs regulations.query with the body and JSON content-type", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({ results: [] }));
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await client.regulations.query({
      query: "provisional credit",
      limit: 5,
      filters: { authorities: ["CFPB"] },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://api.example.com/api/v1/regulations/query");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      "x-api-key": "mlyr_test",
      "content-type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      query: "provisional credit",
      limit: 5,
      filters: { authorities: ["CFPB"] },
    });
  });

  it("decodes a populated regulations.query response into RegulationCitation[]", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [
          {
            regulation: {
              id: "cdoc_001",
              category: "regulation",
              title: "Electronic Fund Transfers",
              authorities: ["cfpb"],
              jurisdictions: ["us-federal"],
              description: "Reg E error-resolution requirements.",
              updatedAt: "2026-04-09T00:00:00.000Z",
              sourceUrl: "https://www.ecfr.gov/current/title-12/part-1005",
            },
            chunks: [
              {
                text: "If the financial institution is unable to complete its investigation within 10 business days...",
                startOffset: 12450,
                endOffset: 13120,
                sectionPath: "Regulation E > § 1005.11 > (c)(2)",
              },
              {
                text: "The institution may extend the investigation period to 45 days...",
                startOffset: 13121,
                endOffset: 13680,
                sectionPath: null,
              },
            ],
          },
        ],
      }),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    const { results } = await client.regulations.query({ query: "provisional credit" });

    expect(results).toHaveLength(1);
    expect(results[0]!.regulation.id).toBe("cdoc_001");
    expect(results[0]!.regulation.title).toBe("Electronic Fund Transfers");
    expect(results[0]!.chunks).toHaveLength(2);
    expect(results[0]!.chunks[0]!.startOffset).toBe(12450);
    expect(results[0]!.chunks[0]!.sectionPath).toBe("Regulation E > § 1005.11 > (c)(2)");
    expect(results[0]!.chunks[1]!.sectionPath).toBeNull();
  });

  it("normalizes singular-string filter values into the wire array shape", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({ results: [] }));
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await client.regulations.query({
      query: "anything",
      filters: { authorities: "cfpb", jurisdictions: "us-federal", ids: "cdoc_001" },
    });

    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toEqual({
      query: "anything",
      filters: {
        ids: ["cdoc_001"],
        authorities: ["cfpb"],
        jurisdictions: ["us-federal"],
      },
    });
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

  it("sends the default x-midlyr-client header on every request", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [],
        pagination: { nextCursor: null, hasMore: false, approximateTotal: 0 },
      }),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await client.regulations.list({ query: "x" });

    const [, init] = fetch.mock.calls[0]!;
    expect(init?.headers).toMatchObject({
      "x-midlyr-client": SDK_CLIENT_IDENTITY,
    });
    expect(SDK_CLIENT_IDENTITY).toBe(`${SDK_CLIENT_PRODUCT}/${SDK_VERSION}`);
    expect(SDK_CLIENT_PRODUCT).toBe("midlyr-sdk-js");
  });

  it("uses a caller-supplied clientIdentity override", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [],
        pagination: { nextCursor: null, hasMore: false, approximateTotal: 0 },
      }),
    );
    const client = new Midlyr({
      apiKey: "mlyr_test",
      baseUrl: "https://api.example.com",
      fetch,
      clientIdentity: "midlyr-cli/9.9.9",
    });

    await client.regulations.list({ query: "x" });

    const [, init] = fetch.mock.calls[0]!;
    expect(init?.headers).toMatchObject({
      "x-midlyr-client": "midlyr-cli/9.9.9",
    });
  });

  it.each([
    ["midlyr-cli/0.1.2"],
    ["midlyr-sdk-py/1.2.3"],
    ["mcp/cursor"],
    ["midlyr-sdk-js/0.0.0-pre.1"],
  ])("accepts well-formed clientIdentity %s", (identity) => {
    expect(
      () =>
        new Midlyr({
          apiKey: "mlyr_test",
          baseUrl: "https://api.example.com",
          fetch: vi.fn<FetchLike>(),
          clientIdentity: identity,
        }),
    ).not.toThrow();
  });

  it.each([
    ["midlyr-cli"],
    ["/0.1.2"],
    ["midlyr-cli/"],
    ["midlyr cli/0.1.2"],
    [""],
  ])("rejects malformed clientIdentity %j", (identity) => {
    expect(
      () =>
        new Midlyr({
          apiKey: "mlyr_test",
          baseUrl: "https://api.example.com",
          fetch: vi.fn<FetchLike>(),
          clientIdentity: identity,
        }),
    ).toThrow(MidlyrError);
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

  it("lists jobs with query parameters", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [
          {
            jobId: "job_1",
            jobType: "screen_analysis",
            status: "completed",
            triggerType: "manual",
            createdAt: "2026-04-01T00:00:00.000Z",
            updatedAt: "2026-04-01T00:00:05.000Z",
          },
        ],
        pagination: { nextCursor: "cur_2", hasMore: true, approximateTotal: 0 },
      }),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    const page = await client.jobs.list({
      jobType: ["screen_analysis"],
      start: "2026-04-01T00:00:00.000Z",
      end: "2026-04-30T23:59:59.000Z",
      limit: 25,
      cursor: "cur_1",
    });

    expect(page.results).toHaveLength(1);
    expect(page.results[0]!.jobId).toBe("job_1");
    expect(page.pagination.nextCursor).toBe("cur_2");

    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.com/api/v1/jobs/?jobType=screen_analysis&start=2026-04-01T00%3A00%3A00.000Z&end=2026-04-30T23%3A59%3A59.000Z&limit=25&cursor=cur_1",
    );
    expect(init?.method).toBe("GET");
  });

  it("defaults to no query parameters when listing jobs", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [],
        pagination: { nextCursor: null, hasMore: false, approximateTotal: 0 },
      }),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await client.jobs.list();

    const [url] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://api.example.com/api/v1/jobs/");
  });
});
