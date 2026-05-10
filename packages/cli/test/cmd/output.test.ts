import { describe, expect, it } from "vitest";
import { MidlyrAPIError, MidlyrNetworkError } from "@midlyr/sdk-js";
import { formatCommandHelp, formatTopHelp, printError, printJson } from "../../src/cmd/output.js";
import { CliInputError, CliInterruptedError, CliJobTimeoutError } from "../../src/domain/errors.js";

function captureWrite(fn: (writer: { write(chunk: string): unknown }) => void): string {
  let output = "";
  fn({ write: (chunk) => (output += chunk) });
  return output;
}

function parseJson(value: string) {
  return JSON.parse(value) as unknown;
}

describe("cmd output", () => {
  it("formats success JSON output", () => {
    expect(parseJson(captureWrite((stdout) => printJson(stdout, { ok: true })))).toEqual({
      ok: true,
    });
  });

  it("formats the top-level help with every command listed", () => {
    const help = formatTopHelp();
    // Resource groups
    expect(help).toMatch(/\n {2}regulations\n/);
    expect(help).toMatch(/\n {2}analysis\n/);
    expect(help).toMatch(/\n {2}events\n/);
    expect(help).toMatch(/\n {2}jobs\n/);
    // Verbs
    expect(help).toContain("list");
    expect(help).toContain("get-content");
    expect(help).toContain("query");
    expect(help).toContain("screen");
    expect(help).toContain("create");
    // Flat commands
    expect(help).toContain("config set api-key");
    expect(help).toContain("login");
    // Top help points to per-command help for details
    expect(help).toContain("midlyr <command> --help");
    // Output shape is documented
    expect(help).toContain("JSON");
    // Endpoints move to per-command help, not the top-level overview
    expect(help).not.toContain("GET /api/v1/regulations/");
    expect(help).not.toContain("POST /api/v1/analysis/screen");
  });

  it("formats per-command help with endpoints and options for each command", () => {
    expect(formatCommandHelp("regulations list")).toContain("GET /api/v1/regulations/");
    expect(formatCommandHelp("regulations get")).toContain("GET /api/v1/regulations/:id");
    expect(formatCommandHelp("regulations get-content")).toContain(
      "GET /api/v1/regulations/:id/content",
    );
    expect(formatCommandHelp("regulations query")).toContain("POST /api/v1/regulations/query");
    expect(formatCommandHelp("analysis screen")).toContain("POST /api/v1/analysis/screen");
    expect(formatCommandHelp("events create")).toContain("POST /api/v1/events");
    expect(formatCommandHelp("jobs list")).toContain("GET /api/v1/jobs");
    expect(formatCommandHelp("login")).toContain("OAuth");
    expect(formatCommandHelp("config")).toContain("config set api-key");
    expect(formatCommandHelp("unknown-command")).toBeUndefined();
  });

  it("formats CLI timeout/interruption/input errors", () => {
    expect(
      parseJson(captureWrite((stderr) => printError(stderr, new CliInputError("bad")))),
    ).toMatchObject({
      error: { code: "cli_input_error", message: "bad" },
    });
    expect(
      parseJson(captureWrite((stderr) => printError(stderr, new CliJobTimeoutError("job_1", 100)))),
    ).toMatchObject({
      error: { code: "screen_analysis_timeout", job_id: "job_1", timeout_ms: 100 },
    });
    expect(
      parseJson(captureWrite((stderr) => printError(stderr, new CliInterruptedError("job_2")))),
    ).toMatchObject({
      error: { code: "interrupted", job_id: "job_2" },
    });
  });

  it("formats SDK errors", () => {
    expect(
      parseJson(
        captureWrite((stderr) =>
          printError(
            stderr,
            new MidlyrAPIError({
              status: 404,
              code: "document_not_found",
              message: "missing",
              headers: {},
              body: { error: { code: "document_not_found", message: "missing" } },
            }),
          ),
        ),
      ),
    ).toMatchObject({ error: { code: "document_not_found", message: "missing" }, status: 404 });

    expect(
      parseJson(
        captureWrite((stderr) =>
          printError(stderr, new MidlyrNetworkError("network", { cause: new TypeError("failed") })),
        ),
      ),
    ).toMatchObject({ error: { code: "MidlyrNetworkError", message: "network" } });
  });
});
