import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@midlyr/sdk";
import { runCli, type CliRuntime } from "../../src/cli.js";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

function createRuntime(fetch?: FetchLike, overrides: Partial<CliRuntime> = {}) {
  let stdout = "";
  let stderr = "";
  const runtime: CliRuntime = {
    env: { MIDLYR_API_KEY: "mlyr_test", ...overrides.env },
    fetch,
    sleep: async () => undefined,
    stdout: { write: (chunk: string) => (stdout += chunk) },
    stderr: { write: (chunk: string) => (stderr += chunk) },
    ...overrides,
  };

  return {
    runtime,
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function parseJsonOutput(output: string) {
  return JSON.parse(output) as unknown;
}

describe("midlyr CLI", () => {
  it("prints help with exactly the v1 command names", async () => {
    const io = createRuntime();
    const exitCode = await runCli(["--help"], io.runtime);

    expect(exitCode).toBe(0);
    expect(io.stdout()).toContain("browse-document");
    expect(io.stdout()).toContain("read-document");
    expect(io.stdout()).toContain("query-document");
    expect(io.stdout()).toContain("screen-analysis");
    expect(io.stdout()).not.toContain("jobs");
    expect(io.stdout()).not.toContain("mcp");
    expect(io.stdout()).not.toContain("platform");
    expect(io.stdout()).not.toContain("agents");
    expect(io.stdout()).not.toContain("enterprise");
    expect(io.stdout()).not.toContain("consumer");
  });

  it("exits non-zero for unknown commands", async () => {
    const io = createRuntime();
    const exitCode = await runCli(["jobs"], io.runtime);

    expect(exitCode).toBe(1);
    expect(parseJsonOutput(io.stderr())).toMatchObject({
      error: { code: "cli_input_error", message: "Unknown command 'jobs'." },
    });
  });

  it("exits non-zero when no API key is configured", async () => {
    const io = createRuntime(undefined, { env: { MIDLYR_API_KEY: undefined } });
    const exitCode = await runCli(["browse-document"], io.runtime);

    expect(exitCode).toBe(1);
    expect(parseJsonOutput(io.stderr())).toMatchObject({
      error: {
        code: "cli_input_error",
        message: "Missing API key. Set MIDLYR_API_KEY or pass --api-key.",
      },
    });
  });

  it("uses MIDLYR_API_KEY and constructs browse-document requests", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [],
        pagination: { next_cursor: null, has_more: false, approximate_total: 0 },
      }),
    );
    const io = createRuntime(fetch, { env: { MIDLYR_API_KEY: "env_key" } });

    const exitCode = await runCli(
      [
        "browse-document",
        "--base-url",
        "https://api.example.com",
        "--query",
        "fair lending",
        "--category",
        "regulation",
        "--category",
        "agency-guidance",
        "--authority",
        "CFPB",
        "--jurisdiction",
        "federal",
        "--limit",
        "25",
        "--cursor",
        "next_1",
      ],
      io.runtime,
    );

    expect(exitCode).toBe(0);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.com/api/v1/regulations?query=fair+lending&category=regulation&category=agency-guidance&authority=CFPB&jurisdiction=federal&limit=25&cursor=next_1",
    );
    expect(init?.headers).toMatchObject({ "x-api-key": "env_key" });
    expect(parseJsonOutput(io.stdout())).toMatchObject({ results: [] });
  });

  it("allows explicit API key override and constructs read-document requests", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        id: "reg_123",
        category: "regulation",
        title: "Regulation B",
        citation: "12 CFR Part 1002",
        authority: "CFPB",
        jurisdiction: "federal",
        description: "Equal credit opportunity",
        source_url: "https://example.com/reg-b",
        formal_citation: { short: "Reg B", full: "Regulation B" },
        text: "content",
        offset: 10,
        limit: 100,
        total_characters: 1000,
        has_more: true,
        next_cursor: "next_2",
        attributes: {},
      }),
    );
    const io = createRuntime(fetch, { env: { MIDLYR_API_KEY: "env_key" } });

    const exitCode = await runCli(
      [
        "read-document",
        "reg_123",
        "--api-key",
        "explicit_key",
        "--base-url",
        "https://api.example.com",
        "--offset",
        "10",
        "--limit",
        "100",
      ],
      io.runtime,
    );

    expect(exitCode).toBe(0);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.com/api/v1/regulations/reg_123?offset=10&limit=100",
    );
    expect(init?.headers).toMatchObject({ "x-api-key": "explicit_key" });
  });

  it("constructs query-document requests", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({ chunks: [], total_matches: 0 }));
    const io = createRuntime(fetch);

    const exitCode = await runCli(
      [
        "query-document",
        "--base-url",
        "https://api.example.com",
        "--query",
        "small business loans",
        "--document-id",
        "reg_1",
        "--document-id",
        "reg_2",
        "--category",
        "regulation",
        "--authority",
        "CFPB",
        "--limit",
        "5",
      ],
      io.runtime,
    );

    expect(exitCode).toBe(0);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://api.example.com/api/v1/regulations/chunks/query");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      query: "small business loans",
      document_ids: ["reg_1", "reg_2"],
      category: ["regulation"],
      authority: ["CFPB"],
      limit: 5,
    });
  });

  it("submits screen-analysis and polls until terminal job", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        jsonResponse({
          job_id: "job_123",
          status: "pending",
          created_at: "2026-04-14T00:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          job_id: "job_123",
          type: "screening",
          status: "in_progress",
          created_at: "2026-04-14T00:00:00.000Z",
          updated_at: "2026-04-14T00:00:01.000Z",
          result: null,
          error: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          job_id: "job_123",
          type: "screening",
          status: "completed",
          created_at: "2026-04-14T00:00:00.000Z",
          updated_at: "2026-04-14T00:00:02.000Z",
          result: { total_applicable: 0, total_evaluated: 0, regulations: [] },
          error: null,
        }),
      );
    const io = createRuntime(fetch);

    const exitCode = await runCli(
      [
        "screen-analysis",
        "--base-url",
        "https://api.example.com",
        "--institution-type",
        "bank",
        "--institution-subtype",
        "community_bank",
        "--total-assets",
        "1500",
        "--transaction-volume",
        "small_business_loans:200:2026",
        "--timeout-ms",
        "1000",
        "--poll-interval-ms",
        "0",
      ],
      io.runtime,
    );

    expect(exitCode).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(String(fetch.mock.calls[0]![0])).toBe(
      "https://api.example.com/api/v1/regulations/screening",
    );
    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toEqual({
      institution_type: "bank",
      institution_subtype: "community_bank",
      total_assets: 1500,
      transaction_volumes: [{ type: "small_business_loans", annual_count: 200, year: 2026 }],
    });
    expect(String(fetch.mock.calls[1]![0])).toBe(
      "https://api.example.com/api/v1/regulations/jobs/job_123",
    );
    expect(parseJsonOutput(io.stdout())).toMatchObject({ job_id: "job_123", status: "completed" });
  });

  it("preserves job id when screen-analysis times out", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        job_id: "job_timeout",
        status: "pending",
        created_at: "2026-04-14T00:00:00.000Z",
      }),
    );
    const io = createRuntime(fetch);

    const exitCode = await runCli(
      [
        "screen-analysis",
        "--base-url",
        "https://api.example.com",
        "--institution-type",
        "fintech",
        "--timeout-ms",
        "0",
      ],
      io.runtime,
    );

    expect(exitCode).toBe(1);
    expect(parseJsonOutput(io.stderr())).toMatchObject({
      error: { code: "screen_analysis_timeout", job_id: "job_timeout", timeout_ms: 0 },
    });
  });

  it("does not poll after screen-analysis timeout elapses during sleep", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        job_id: "job_sleep_timeout",
        status: "pending",
        created_at: "2026-04-14T00:00:00.000Z",
      }),
    );
    let nowMs = 0;
    const io = createRuntime(fetch, {
      now: () => nowMs,
      sleep: async () => {
        nowMs = 1_001;
      },
    });

    const exitCode = await runCli(
      [
        "screen-analysis",
        "--base-url",
        "https://api.example.com",
        "--institution-type",
        "bank",
        "--timeout-ms",
        "1000",
        "--poll-interval-ms",
        "2000",
      ],
      io.runtime,
    );

    expect(exitCode).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(parseJsonOutput(io.stderr())).toMatchObject({
      error: { code: "screen_analysis_timeout", job_id: "job_sleep_timeout", timeout_ms: 1000 },
    });
  });

  it("preserves job id when screen-analysis is interrupted after submission", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        job_id: "job_interrupted",
        status: "pending",
        created_at: "2026-04-14T00:00:00.000Z",
      }),
    );
    const signalHandlers = new Map<string, () => void>();
    const io = createRuntime(fetch, {
      onSignal: (signal, handler) => {
        signalHandlers.set(signal, handler);
      },
      sleep: async () => {
        signalHandlers.get("SIGINT")?.();
      },
    });

    const exitCode = await runCli(
      [
        "screen-analysis",
        "--base-url",
        "https://api.example.com",
        "--institution-type",
        "credit_union",
        "--timeout-ms",
        "1000",
        "--poll-interval-ms",
        "1",
      ],
      io.runtime,
    );

    expect(exitCode).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(parseJsonOutput(io.stderr())).toMatchObject({
      error: { code: "interrupted", job_id: "job_interrupted" },
    });
  });
});
