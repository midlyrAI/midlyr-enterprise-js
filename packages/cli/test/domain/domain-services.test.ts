import { describe, expect, it, vi } from "vitest";
import type { MidlyrClient } from "../../src/sdk/midlyr-client.js";
import { DocumentsService } from "../../src/domain/documents.js";
import { ScreenAnalysisService } from "../../src/domain/screen-analysis.js";
import { CliInputError } from "../../src/domain/errors.js";

function createClient(): MidlyrClient {
  return {
    browseDocuments: vi.fn(async () => ({
      results: [],
      pagination: { nextCursor: null, hasMore: false, approximateTotal: 0 },
    })),
    getDocumentDetails: vi.fn(),
    readDocumentContent: vi.fn(async () => ({
      id: "reg_1",
      text: "content",
      offset: 0,
      limit: 40000,
      totalBytes: 7,
      hasMore: false,
      details: {},
    })),
    startScreenAnalysis: vi.fn(async () => ({
      id: "job_1",
    })),
    getJob: vi.fn(),
  } as unknown as MidlyrClient;
}

describe("domain services", () => {
  it("delegates browse/read to the SDK client", async () => {
    const client = createClient();
    const documents = new DocumentsService(client);

    await documents.browse({ query: "fair" });
    await documents.read("reg_1", { limit: 10 });

    expect(client.browseDocuments).toHaveBeenCalledWith({ query: "fair" });
    expect(client.readDocumentContent).toHaveBeenCalledWith("reg_1", { limit: 10 });
  });

  it("screen-analysis returns submitted response when no-wait", async () => {
    const client = createClient();
    const poll = vi.fn();
    const result = await new ScreenAnalysisService(client, { poll }).run({
      body: { content: { type: "text", text: "test" }, scenario: "generic" },
      wait: false,
    });

    expect(result).toMatchObject({ id: "job_1" });
    expect(poll).not.toHaveBeenCalled();
  });

  it("screen-analysis delegates polling when waiting", async () => {
    const client = createClient();
    const poll = vi.fn(async () => ({ id: "job_1", status: "succeeded" }));

    await new ScreenAnalysisService(client, { poll }).run({
      body: { content: { type: "text", text: "test" }, scenario: "generic" },
    });

    expect(poll).toHaveBeenCalledWith("job_1", { timeoutMs: 300000, pollIntervalMs: 2000 });
  });

  it("screen-analysis rejects missing id when waiting", async () => {
    const client = createClient();
    vi.mocked(client.startScreenAnalysis).mockResolvedValueOnce({
      id: "",
    });

    await expect(
      new ScreenAnalysisService(client, { poll: vi.fn() }).run({
        body: { content: { type: "text", text: "test" }, scenario: "generic" },
      }),
    ).rejects.toBeInstanceOf(CliInputError);
  });
});
