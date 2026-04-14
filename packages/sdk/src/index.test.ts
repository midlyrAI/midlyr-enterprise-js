import { describe, expect, it, vi } from "vitest";
import { Midlyr, MidlyrAPIError, MidlyrNetworkError, type FetchLike } from "./index.js";

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
        pagination: { next_cursor: null, has_more: false, approximate_total: 0 },
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

  it("throws typed API errors for non-2xx responses", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse(
        { error: { code: "document_not_found", message: "No document matched id 'missing'." } },
        { status: 404 },
      ),
    );
    const client = new Midlyr({ apiKey: "mlyr_test", baseUrl: "https://api.example.com", fetch });

    await expect(client.regulations.read("missing")).rejects.toMatchObject({
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
          job_id: "job_123",
          type: "screening",
          status: "completed",
          created_at: "2026-04-14T00:00:00.000Z",
          updated_at: "2026-04-14T00:00:00.000Z",
          result: null,
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

    expect(result.job_id).toBe("job_123");
    expect(fetch).toHaveBeenCalledTimes(2);
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
      client.analysis.startScreening({ institution_type: "bank" }),
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
