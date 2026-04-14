import { describe, expect, it, vi } from "vitest";
import type { MidlyrClient } from "../../src/sdk/midlyr-client.js";
import { DocumentsService } from "../../src/domain/documents.js";
import { ScreenAnalysisService } from "../../src/domain/screen-analysis.js";
import { CliInputError } from "../../src/domain/errors.js";

function createClient(): MidlyrClient {
  return {
    browseDocuments: vi.fn(async () => ({
      results: [],
      pagination: { next_cursor: null, has_more: false, approximate_total: 0 },
    })),
    readDocument: vi.fn(),
    queryDocument: vi.fn(async () => ({ chunks: [], total_matches: 0 })),
    startScreenAnalysis: vi.fn(async () => ({
      job_id: "job_1",
      status: "pending",
      created_at: "2026-04-14T00:00:00.000Z",
    })),
    getJob: vi.fn(),
  };
}

describe("domain services", () => {
  it("delegates browse/read/query to the SDK client", async () => {
    const client = createClient();
    const documents = new DocumentsService(client);

    await documents.browse({ query: "fair" });
    await documents.read("reg_1", { limit: 10 });
    await documents.query({ query: "loans" });

    expect(client.browseDocuments).toHaveBeenCalledWith({ query: "fair" });
    expect(client.readDocument).toHaveBeenCalledWith("reg_1", { limit: 10 });
    expect(client.queryDocument).toHaveBeenCalledWith({ query: "loans" });
  });

  it("screen-analysis returns submitted job when no-wait", async () => {
    const client = createClient();
    const poll = vi.fn();
    const result = await new ScreenAnalysisService(client, { poll }).run({
      body: { institution_type: "bank" },
      wait: false,
    });

    expect(result).toMatchObject({ job_id: "job_1" });
    expect(poll).not.toHaveBeenCalled();
  });

  it("screen-analysis delegates polling when waiting", async () => {
    const client = createClient();
    const poll = vi.fn(async () => ({ job_id: "job_1", status: "completed" }));

    await new ScreenAnalysisService(client, { poll }).run({ body: { institution_type: "bank" } });

    expect(poll).toHaveBeenCalledWith("job_1", { timeoutMs: 300000, pollIntervalMs: 2000 });
  });

  it("screen-analysis rejects missing job id when waiting", async () => {
    const client = createClient();
    vi.mocked(client.startScreenAnalysis).mockResolvedValueOnce({
      job_id: "",
      status: "pending",
      created_at: "2026-04-14T00:00:00.000Z",
    });

    await expect(
      new ScreenAnalysisService(client, { poll: vi.fn() }).run({
        body: { institution_type: "bank" },
      }),
    ).rejects.toBeInstanceOf(CliInputError);
  });
});
