import { describe, expect, it, vi } from "vitest";
import { CliInputError } from "../../src/domain/errors.js";
import { runCommand } from "../../src/cmd/commands.js";
import { parseArgs } from "../../src/cmd/parser.js";

function createServices() {
  return {
    documents: {
      browse: vi.fn(async () => ({ ok: true })),
      getDetails: vi.fn(async () => ({ ok: true })),
      readContent: vi.fn(async () => ({ ok: true })),
      query: vi.fn(async () => ({ ok: true })),
    },
    screenAnalysis: {
      run: vi.fn(async () => ({ ok: true })),
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

  it("maps query-document options to a body with filters", async () => {
    const services = createServices();

    await runCommand(
      "query-document",
      parseArgs([
        "query-document",
        "--query",
        "provisional credit",
        "--limit",
        "5",
        "--score-threshold",
        "0.7",
        "--authority",
        "CFPB",
        "--jurisdiction",
        "us-federal",
        "--id",
        "cdoc_001",
      ]),
      services,
    );

    expect(services.documents.query).toHaveBeenCalledWith({
      query: "provisional credit",
      limit: 5,
      scoreThreshold: 0.7,
      filters: {
        ids: ["cdoc_001"],
        authorities: ["CFPB"],
        jurisdictions: ["us-federal"],
      },
    });
  });

  it("query-document accepts the query as a positional argument", async () => {
    const services = createServices();

    await runCommand(
      "query-document",
      parseArgs(["query-document", "fair", "lending"]),
      services,
    );

    expect(services.documents.query).toHaveBeenCalledWith({ query: "fair lending" });
  });

  it("query-document omits filters when no filter flags are given", async () => {
    const services = createServices();

    await runCommand(
      "query-document",
      parseArgs(["query-document", "--query", "test"]),
      services,
    );

    expect(services.documents.query).toHaveBeenCalledWith({ query: "test" });
  });

  it("validates query-document requires a query string", async () => {
    await expect(
      runCommand("query-document", parseArgs(["query-document"]), createServices()),
    ).rejects.toBeInstanceOf(CliInputError);
  });
});
