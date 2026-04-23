import { describe, expect, it, vi } from "vitest";
import { MidlyrClient } from "../../src/sdk/midlyr-client.js";

describe("MidlyrClient", () => {
  it("adapts CLI capabilities to public SDK resources", async () => {
    const sdk = {
      regulations: {
        browse: vi.fn(async () => ({ results: [], pagination: {} })),
        getDetails: vi.fn(async () => ({ id: "reg_1" })),
        readContent: vi.fn(async () => ({ id: "reg_1", text: "content" })),
      },
      analysis: {
        screen: vi.fn(async () => ({ id: "job_1" })),
      },
      jobs: {
        get: vi.fn(async () => ({ id: "job_1", status: "succeeded" })),
      },
    };
    const client = new MidlyrClient(
      { apiKey: "test", baseUrl: "https://api.example.com", fetch: vi.fn() },
      sdk as never,
    );

    await client.browseDocuments({ query: "fair" });
    await client.getDocumentDetails("reg_1");
    await client.readDocumentContent("reg_1", { limit: 10 });
    await client.startScreenAnalysis({
      content: { type: "text", text: "test" },
      scenario: "generic",
    });
    await client.getJob("job_1");

    expect(sdk.regulations.browse).toHaveBeenCalledWith({ query: "fair" });
    expect(sdk.regulations.getDetails).toHaveBeenCalledWith("reg_1");
    expect(sdk.regulations.readContent).toHaveBeenCalledWith("reg_1", { limit: 10 });
    expect(sdk.analysis.screen).toHaveBeenCalledWith({
      content: { type: "text", text: "test" },
      scenario: "generic",
    });
    expect(sdk.jobs.get).toHaveBeenCalledWith("job_1");
  });
});
