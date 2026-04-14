import { describe, expect, it } from "vitest";
import { MidlyrAPIError, MidlyrNetworkError } from "@midlyr/sdk";
import { commandNames } from "../../src/cmd/command-names.js";
import { formatHelp, printError, printJson } from "../../src/cmd/output.js";
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
  it("formats success JSON and help output", () => {
    expect(parseJson(captureWrite((stdout) => printJson(stdout, { ok: true })))).toEqual({
      ok: true,
    });
    expect(formatHelp(commandNames)).toContain("screen-analysis");
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
    ).toMatchObject({ error: { code: "document_not_found", status: 404 } });

    expect(
      parseJson(
        captureWrite((stderr) =>
          printError(stderr, new MidlyrNetworkError("network", { cause: new TypeError("failed") })),
        ),
      ),
    ).toMatchObject({ error: { code: "MidlyrNetworkError", message: "network" } });
  });
});
