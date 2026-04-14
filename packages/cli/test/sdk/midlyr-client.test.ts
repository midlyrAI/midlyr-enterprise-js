import { describe, expect, it, vi } from "vitest";
import { MidlyrClient } from "../../src/sdk/midlyr-client.js";

describe("MidlyrClient", () => {
  it("adapts CLI capabilities to public SDK resources", async () => {
    const sdk = {
      regulations: {
        browse: vi.fn(async () => ({ results: [], pagination: {} })),
        read: vi.fn(async () => ({ id: "reg_1" })),
        queryChunks: vi.fn(async () => ({ chunks: [], total_matches: 0 })),
      },
      analysis: {
        startScreening: vi.fn(async () => ({ job_id: "job_1", status: "pending" })),
      },
      jobs: {
        get: vi.fn(async () => ({ job_id: "job_1", status: "completed" })),
      },
    };
    const client = new MidlyrClient(
      { apiKey: "test", baseUrl: "https://api.example.com", fetch: vi.fn() },
      sdk as never,
    );

    await client.browseDocuments({ query: "fair" });
    await client.readDocument("reg_1", { limit: 10 });
    await client.queryDocument({ query: "loans" });
    await client.startScreenAnalysis({ institution_type: "bank" });
    await client.getJob("job_1");

    expect(sdk.regulations.browse).toHaveBeenCalledWith({ query: "fair" });
    expect(sdk.regulations.read).toHaveBeenCalledWith("reg_1", { limit: 10 });
    expect(sdk.regulations.queryChunks).toHaveBeenCalledWith({ query: "loans" });
    expect(sdk.analysis.startScreening).toHaveBeenCalledWith({ institution_type: "bank" });
    expect(sdk.jobs.get).toHaveBeenCalledWith("job_1");
  });
});
