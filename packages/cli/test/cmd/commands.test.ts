import { describe, expect, it, vi } from "vitest";
import { CliInputError } from "../../src/domain/errors.js";
import { runCommand } from "../../src/cmd/commands/index.js";
import { parseArgs } from "../../src/cmd/parser.js";

function createServices() {
  return {
    documents: {
      browse: vi.fn(async () => ({ ok: true })),
      getDetails: vi.fn(async () => ({ ok: true })),
      readContent: vi.fn(async () => ({ ok: true })),
    },
    screenAnalysis: {
      run: vi.fn(async () => ({ ok: true })),
    },
    jobs: {
      list: vi.fn(async () => ({ ok: true })),
      get: vi.fn(async () => ({ ok: true })),
    },
  };
}

describe("command handlers", () => {
  it("maps browse-document options to domain input", async () => {
    const services = createServices();

    await runCommand(
      "browse-document",
      parseArgs(["browse-document", "--query", "fair", "--category", "regulation", "--limit", "2"]),
      services,
    );

    expect(services.documents.browse).toHaveBeenCalledWith({
      query: "fair",
      categories: ["regulation"],
      authorities: undefined,
      jurisdictions: undefined,
      limit: 2,
      cursor: undefined,
    });
  });

  it("maps describe-document to getDetails with positional id", async () => {
    const services = createServices();

    await runCommand("describe-document", parseArgs(["describe-document", "reg_1"]), services);

    expect(services.documents.getDetails).toHaveBeenCalledWith("reg_1");
  });

  it("maps read-document-content positional id and query options", async () => {
    const services = createServices();

    await runCommand(
      "read-document-content",
      parseArgs(["read-document-content", "reg_1", "--offset", "3"]),
      services,
    );

    expect(services.documents.readContent).toHaveBeenCalledWith("reg_1", {
      offset: 3,
      limit: undefined,
    });
  });

  it("maps screen-analysis options with scenario and text", async () => {
    const services = createServices();

    await runCommand(
      "screen-analysis",
      parseArgs([
        "screen-analysis",
        "--scenario",
        "marketing_asset",
        "--text",
        "Get 0% APR for life!",
        "--timeout-ms",
        "100",
        "--no-wait",
      ]),
      services,
    );

    expect(services.screenAnalysis.run).toHaveBeenCalledWith({
      body: {
        content: { type: "text", text: "Get 0% APR for life!" },
        scenario: "marketing_asset",
      },
      wait: false,
      timeoutMs: 100,
      pollIntervalMs: undefined,
    });
  });

  it("validates screen-analysis requires --scenario", async () => {
    await expect(
      runCommand(
        "screen-analysis",
        parseArgs(["screen-analysis", "--text", "some content"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("validates screen-analysis requires text", async () => {
    await expect(
      runCommand(
        "screen-analysis",
        parseArgs(["screen-analysis", "--scenario", "generic"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("validates screen-analysis rejects invalid scenario", async () => {
    await expect(
      runCommand(
        "screen-analysis",
        parseArgs(["screen-analysis", "--scenario", "invalid", "--text", "test"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("maps list-jobs options to query input", async () => {
    const services = createServices();

    await runCommand(
      "list-jobs",
      parseArgs([
        "list-jobs",
        "--job-type",
        "screen_analysis",
        "--start",
        "2026-04-01T00:00:00.000Z",
        "--end",
        "2026-04-30T23:59:59.000Z",
        "--limit",
        "25",
        "--cursor",
        "cur_abc",
      ]),
      services,
    );

    expect(services.jobs.list).toHaveBeenCalledWith({
      jobType: ["screen_analysis"],
      start: "2026-04-01T00:00:00.000Z",
      end: "2026-04-30T23:59:59.000Z",
      cursor: "cur_abc",
      limit: 25,
    });
  });

  it("list-jobs defaults to no filters", async () => {
    const services = createServices();

    await runCommand("list-jobs", parseArgs(["list-jobs"]), services);

    expect(services.jobs.list).toHaveBeenCalledWith({
      jobType: undefined,
      start: undefined,
      end: undefined,
      cursor: undefined,
      limit: undefined,
    });
  });

  it("list-jobs rejects unknown --job-type values", async () => {
    await expect(
      runCommand(
        "list-jobs",
        parseArgs(["list-jobs", "--job-type", "not_a_real_type"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });
});
