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
      query: vi.fn(async () => ({ ok: true })),
    },
    screenAnalysis: {
      run: vi.fn(async () => ({ ok: true })),
    },
    riskAssessment: {
      run: vi.fn(async () => ({ ok: true })),
    },
    eventIntake: {
      run: vi.fn(async () => ({ ok: true })),
    },
    jobs: {
      list: vi.fn(async () => ({ ok: true })),
      get: vi.fn(async () => ({ ok: true })),
    },
    wikis: {
      browse: vi.fn(async () => ({ ok: true })),
      get: vi.fn(async () => ({ ok: true })),
    },
  };
}

describe("command handlers", () => {
  it("maps regulations list options to domain input", async () => {
    const services = createServices();

    await runCommand(
      "regulations list",
      parseArgs(["regulations", "list", "--query", "fair", "--category", "regulation", "--limit", "2"]),
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

  it("maps regulations get to getDetails with positional id", async () => {
    const services = createServices();

    await runCommand("regulations get", parseArgs(["regulations", "get", "reg_1"]), services);

    expect(services.documents.getDetails).toHaveBeenCalledWith("reg_1");
  });

  it("maps regulations get-content positional id and query options", async () => {
    const services = createServices();

    await runCommand(
      "regulations get-content",
      parseArgs(["regulations", "get-content", "reg_1", "--offset", "3"]),
      services,
    );

    expect(services.documents.readContent).toHaveBeenCalledWith("reg_1", {
      offset: 3,
      limit: undefined,
    });
  });

  it("maps analysis screen options with scenario and text", async () => {
    const services = createServices();

    await runCommand(
      "analysis screen",
      parseArgs([
        "analysis",
        "screen",
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

  it("validates analysis screen requires --scenario", async () => {
    await expect(
      runCommand(
        "analysis screen",
        parseArgs(["analysis", "screen", "--text", "some content"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("validates analysis screen requires text", async () => {
    await expect(
      runCommand(
        "analysis screen",
        parseArgs(["analysis", "screen", "--scenario", "generic"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("validates analysis screen rejects invalid scenario", async () => {
    await expect(
      runCommand(
        "analysis screen",
        parseArgs(["analysis", "screen", "--scenario", "invalid", "--text", "test"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("maps events create with text content and external-ref", async () => {
    const services = createServices();

    await runCommand(
      "events create",
      parseArgs([
        "events",
        "create",
        "--scenario",
        "complaint",
        "--text",
        "Customer reports delayed refund.",
        "--external-ref",
        "ext-001",
      ]),
      services,
    );

    expect(services.eventIntake.run).toHaveBeenCalledWith({
      body: {
        scenario: "complaint",
        content: { type: "text", text: "Customer reports delayed refund." },
        externalRef: "ext-001",
      },
    });
  });

  it("maps events create with --json content", async () => {
    const services = createServices();

    await runCommand(
      "events create",
      parseArgs([
        "events",
        "create",
        "--scenario",
        "dispute",
        "--json",
        '{"transactionId":"tx_1","amount":42}',
      ]),
      services,
    );

    expect(services.eventIntake.run).toHaveBeenCalledWith({
      body: {
        scenario: "dispute",
        content: { type: "json", json: { transactionId: "tx_1", amount: 42 } },
      },
    });
  });

  it("validates events create requires --scenario", async () => {
    await expect(
      runCommand(
        "events create",
        parseArgs(["events", "create", "--text", "no scenario"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("validates events create rejects invalid scenario", async () => {
    await expect(
      runCommand(
        "events create",
        parseArgs(["events", "create", "--scenario", "not_real", "--text", "x"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("validates events create requires --text or --json", async () => {
    await expect(
      runCommand(
        "events create",
        parseArgs(["events", "create", "--scenario", "complaint"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("validates events create rejects both --text and --json", async () => {
    await expect(
      runCommand(
        "events create",
        parseArgs([
          "events",
          "create",
          "--scenario",
          "complaint",
          "--text",
          "x",
          "--json",
          "{}",
        ]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("validates events create rejects malformed --json", async () => {
    await expect(
      runCommand(
        "events create",
        parseArgs(["events", "create", "--scenario", "complaint", "--json", "not-json"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("maps jobs list options to query input", async () => {
    const services = createServices();

    await runCommand(
      "jobs list",
      parseArgs([
        "jobs",
        "list",
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

  it("jobs list defaults to no filters", async () => {
    const services = createServices();

    await runCommand("jobs list", parseArgs(["jobs", "list"]), services);

    expect(services.jobs.list).toHaveBeenCalledWith({
      jobType: undefined,
      start: undefined,
      end: undefined,
      cursor: undefined,
      limit: undefined,
    });
  });

  it("jobs list rejects unknown --job-type values", async () => {
    await expect(
      runCommand(
        "jobs list",
        parseArgs(["jobs", "list", "--job-type", "not_a_real_type"]),
        createServices(),
      ),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it("maps regulations query options to a body with filters", async () => {
    const services = createServices();

    await runCommand(
      "regulations query",
      parseArgs([
        "regulations",
        "query",
        "--query",
        "provisional credit",
        "--limit",
        "5",
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
      filters: {
        ids: ["cdoc_001"],
        authorities: ["CFPB"],
        jurisdictions: ["us-federal"],
      },
    });
  });

  it("regulations query accepts the query as a positional argument", async () => {
    const services = createServices();

    await runCommand(
      "regulations query",
      parseArgs(["regulations", "query", "fair", "lending"]),
      services,
    );

    expect(services.documents.query).toHaveBeenCalledWith({ query: "fair lending" });
  });

  it("regulations query omits filters when no filter flags are given", async () => {
    const services = createServices();

    await runCommand(
      "regulations query",
      parseArgs(["regulations", "query", "--query", "test"]),
      services,
    );

    expect(services.documents.query).toHaveBeenCalledWith({ query: "test" });
  });

  it("validates regulations query requires a query string", async () => {
    await expect(
      runCommand("regulations query", parseArgs(["regulations", "query"]), createServices()),
    ).rejects.toBeInstanceOf(CliInputError);
  });

  it('maps regulation-wikis list options to domain input', async () => {
    const services = createServices();

    await runCommand(
      'regulation-wikis list',
      parseArgs(['regulation-wikis', 'list', '--domain', 'bsa-aml', '--limit', '5']),
      services,
    );

    expect(services.wikis.browse).toHaveBeenCalledWith({
      domain: 'bsa-aml',
      q: undefined,
      updatedSince: undefined,
      limit: 5,
      cursor: undefined,
    });
  });

  it('maps regulation-wikis get to wikis.get with positional slug', async () => {
    const services = createServices();

    await runCommand(
      'regulation-wikis get',
      parseArgs(['regulation-wikis', 'get', 'bsa-aml-compliance']),
      services,
    );

    expect(services.wikis.get).toHaveBeenCalledWith('bsa-aml-compliance');
  });

  it('validates regulation-wikis get requires a slug', async () => {
    await expect(
      runCommand('regulation-wikis get', parseArgs(['regulation-wikis', 'get']), createServices()),
    ).rejects.toBeInstanceOf(CliInputError);
  });
});
