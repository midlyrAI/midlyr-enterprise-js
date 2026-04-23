import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "@midlyr/sdk-js";
import { runCli, type CliRuntime } from "../../src/cli.js";

const TEST_BASE_URL = "https://api.example.com";

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
    fetch,
    sleep: async () => undefined,
    stdout: { write: (chunk: string) => (stdout += chunk) },
    stderr: { write: (chunk: string) => (stderr += chunk) },
    logger: { write: () => undefined },
    ...overrides,
    env: {
      MIDLYR_API_KEY: "mlyr_test",
      MIDLYR_BASE_URL: TEST_BASE_URL,
      ...overrides.env,
    },
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
    const help = io.stdout();
    expect(help).toContain("browse-document");
    expect(help).toContain("describe-document");
    expect(help).toContain("read-document-content");
    expect(help).toContain("screen-analysis");
    // No removed top-level commands should appear as a command heading (2-space indent + name on its own line)
    expect(help).not.toMatch(/\n {2}query-document\b/);
    expect(help).not.toMatch(/\n {2}jobs\b/);
    expect(help).not.toMatch(/\n {2}mcp\b/);
    expect(help).not.toMatch(/\n {2}platform\b/);
    expect(help).not.toMatch(/\n {2}agents\b/);
    expect(help).not.toMatch(/\n {2}enterprise\b/);
    expect(help).not.toMatch(/\n {2}consumer\b/);
    // Public surface should not advertise the removed global flags.
    expect(help).not.toContain("--api-key");
    expect(help).not.toContain("--base-url");
  });

  it("prints version without requiring credentials", async () => {
    const io = createRuntime(undefined, {
      env: { MIDLYR_API_KEY: undefined },
      version: "1.2.3-test",
    });

    const exitCode = await runCli(["--version"], io.runtime);

    expect(exitCode).toBe(0);
    expect(io.stdout()).toBe("1.2.3-test\n");
    expect(io.stderr()).toBe("");
  });

  it("supports -v as a version alias", async () => {
    const io = createRuntime(undefined, { version: "1.2.3-test" });

    const exitCode = await runCli(["-v"], io.runtime);

    expect(exitCode).toBe(0);
    expect(io.stdout()).toBe("1.2.3-test\n");
  });

  it("prints per-command help when --help follows a known command", async () => {
    const io = createRuntime();
    const exitCode = await runCli(["screen-analysis", "--help"], io.runtime);

    expect(exitCode).toBe(0);
    const help = io.stdout();
    // Per-command help shows the command-specific detail block...
    expect(help).toContain("midlyr screen-analysis");
    expect(help).toContain("--scenario");
    expect(help).toContain("POST /api/v1/analysis/screen");
    // ...and does NOT include unrelated commands' details.
    expect(help).not.toContain("browse-document");
    expect(help).not.toContain("Run 'midlyr <command> --help'");
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
        message:
          "Missing API key. Set MIDLYR_API_KEY, or run: midlyr login (or midlyr config set api-key <key>)",
      },
    });
  });

  it("uses MIDLYR_API_KEY and MIDLYR_BASE_URL to construct browse-document requests", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        results: [],
        pagination: { nextCursor: null, hasMore: false, approximateTotal: 0 },
      }),
    );
    const io = createRuntime(fetch, { env: { MIDLYR_API_KEY: "env_key" } });

    const exitCode = await runCli(
      [
        "browse-document",
        "--query",
        "fair lending",
        "--category",
        "regulation",
        "--category",
        "agencyGuidance",
        "--authority",
        "CFPB",
        "--jurisdiction",
        "us-federal",
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
      "https://api.example.com/api/v1/regulations/?query=fair+lending&categories=regulation&categories=agencyGuidance&authorities=CFPB&jurisdictions=us-federal&limit=25&cursor=next_1",
    );
    expect(init?.headers).toMatchObject({ "x-api-key": "env_key" });
    expect(parseJsonOutput(io.stdout())).toMatchObject({ results: [] });
  });

  it("constructs describe-document requests from a positional id", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
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
      }),
    );
    const io = createRuntime(fetch, { env: { MIDLYR_API_KEY: "env_key" } });

    const exitCode = await runCli(["describe-document", "reg_123"], io.runtime);

    expect(exitCode).toBe(0);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe("https://api.example.com/api/v1/regulations/reg_123");
    expect(init?.headers).toMatchObject({ "x-api-key": "env_key" });
    expect(parseJsonOutput(io.stdout())).toMatchObject({ id: "reg_123", title: "Regulation B" });
  });

  it("constructs read-document-content requests with env-configured api key", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({
        id: "reg_123",
        text: "content",
        offset: 10,
        limit: 100,
        totalBytes: 1000,
        hasMore: true,
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
    const io = createRuntime(fetch, { env: { MIDLYR_API_KEY: "env_key" } });

    const exitCode = await runCli(
      ["read-document-content", "reg_123", "--offset", "10", "--limit", "100"],
      io.runtime,
    );

    expect(exitCode).toBe(0);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.com/api/v1/regulations/reg_123/content?offset=10&limit=100",
    );
    expect(init?.headers).toMatchObject({ "x-api-key": "env_key" });
  });

  it("submits screen-analysis and polls until terminal job", async () => {
    const fetch = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonResponse({ id: "job_123" }, { status: 202 }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "job_123",
          type: "screen_analysis",
          status: "running",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:01.000Z",
          result: null,
          error: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "job_123",
          type: "screen_analysis",
          status: "succeeded",
          createdAt: "2026-04-14T00:00:00.000Z",
          updatedAt: "2026-04-14T00:00:02.000Z",
          result: { type: "analysis.screen.result", riskScore: 0, findings: [] },
          error: null,
        }),
      );
    const io = createRuntime(fetch);

    const exitCode = await runCli(
      [
        "screen-analysis",
        "--scenario",
        "marketing_asset",
        "--text",
        "Get 0% APR forever!",
        "--timeout-ms",
        "1000",
        "--poll-interval-ms",
        "0",
      ],
      io.runtime,
    );

    expect(exitCode).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(String(fetch.mock.calls[0]![0])).toBe("https://api.example.com/api/v1/analysis/screen");
    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toEqual({
      content: { type: "text", text: "Get 0% APR forever!" },
      scenario: "marketing_asset",
    });
    expect(String(fetch.mock.calls[1]![0])).toBe("https://api.example.com/api/v1/jobs/job_123");
    expect(parseJsonOutput(io.stdout())).toMatchObject({ id: "job_123", status: "succeeded" });
  });

  it("preserves job id when screen-analysis times out", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({ id: "job_timeout" }, { status: 202 }),
    );
    const io = createRuntime(fetch);

    const exitCode = await runCli(
      ["screen-analysis", "--scenario", "generic", "--text", "test content", "--timeout-ms", "0"],
      io.runtime,
    );

    expect(exitCode).toBe(1);
    expect(parseJsonOutput(io.stderr())).toMatchObject({
      error: { code: "screen_analysis_timeout", job_id: "job_timeout", timeout_ms: 0 },
    });
  });

  it("does not poll after screen-analysis timeout elapses during sleep", async () => {
    const fetch = vi.fn<FetchLike>(async () =>
      jsonResponse({ id: "job_sleep_timeout" }, { status: 202 }),
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
        "--scenario",
        "generic",
        "--text",
        "test content",
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
      jsonResponse({ id: "job_interrupted" }, { status: 202 }),
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
        "--scenario",
        "complaint",
        "--text",
        "customer complaint text",
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
