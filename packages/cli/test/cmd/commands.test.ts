import { describe, expect, it, vi } from "vitest";
import { CliInputError } from "../../src/domain/errors.js";
import { runCommand } from "../../src/cmd/commands.js";
import { parseArgs } from "../../src/cmd/parser.js";

function createServices() {
  return {
    documents: {
      browse: vi.fn(async () => ({ ok: true })),
      read: vi.fn(async () => ({ ok: true })),
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
      category: ["regulation"],
      authority: undefined,
      jurisdiction: undefined,
      limit: 2,
      cursor: undefined,
    });
  });

  it("maps read-document positional id and query options", async () => {
    const services = createServices();

    await runCommand(
      "read-document",
      parseArgs(["read-document", "reg_1", "--offset", "3"]),
      services,
    );

    expect(services.documents.read).toHaveBeenCalledWith("reg_1", {
      cursor: undefined,
      offset: 3,
      limit: undefined,
    });
  });

  it("maps query-document options to domain input", async () => {
    const services = createServices();

    await runCommand(
      "query-document",
      parseArgs(["query-document", "--query", "loans", "--document-id", "reg_1,reg_2"]),
      services,
    );

    expect(services.documents.query).toHaveBeenCalledWith({
      query: "loans",
      document_ids: ["reg_1", "reg_2"],
      category: undefined,
      authority: undefined,
      limit: undefined,
    });
  });

  it("validates query-document requires a query", async () => {
    await expect(
      runCommand("query-document", parseArgs(["query-document"]), createServices()),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("maps screen-analysis options and transaction volumes", async () => {
    const services = createServices();

    await runCommand(
      "screen-analysis",
      parseArgs([
        "screen-analysis",
        "--institution-type",
        "bank",
        "--transaction-volume",
        "small_business_loans:2:2026",
        "--timeout-ms",
        "100",
        "--no-wait",
      ]),
      services,
    );

    expect(services.screenAnalysis.run).toHaveBeenCalledWith({
      body: {
        institution_type: "bank",
        transaction_volumes: [{ type: "small_business_loans", annual_count: 2, year: 2026 }],
      },
      wait: false,
      timeoutMs: 100,
      pollIntervalMs: undefined,
    });
  });

  it("validates transaction-volumes-json is an array", async () => {
    await expect(
      runCommand(
        "screen-analysis",
        parseArgs([
          "screen-analysis",
          "--institution-type",
          "bank",
          "--transaction-volumes-json",
          "{}",
        ]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });
});
