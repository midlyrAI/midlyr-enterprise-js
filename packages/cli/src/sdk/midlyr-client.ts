import {
  Midlyr as MidlyrSdk,
  type BrowseRegulationsQuery,
  type FetchLike,
  type ReadRegulationContentQuery,
  type StartScreenAnalysisBody,
} from "@midlyr/sdk";

export type MidlyrClientOptions = {
  apiKey: string;
  baseUrl: string;
  requestTimeoutMs?: number;
  fetch?: FetchLike;
};

type PublicMidlyrSdk = Pick<MidlyrSdk, "regulations" | "analysis" | "jobs">;

export class MidlyrClient {
  private readonly sdk: PublicMidlyrSdk;

  constructor(options: MidlyrClientOptions, sdk?: PublicMidlyrSdk) {
    this.sdk =
      sdk ??
      new MidlyrSdk({
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        timeoutMs: options.requestTimeoutMs,
        fetch: options.fetch,
      });
  }

  browseDocuments(input: BrowseRegulationsQuery) {
    return this.sdk.regulations.browse(input);
  }

  getDocumentDetails(id: string) {
    return this.sdk.regulations.getDetails(id);
  }

  readDocumentContent(id: string, input: ReadRegulationContentQuery) {
    return this.sdk.regulations.readContent(id, input);
  }

  startScreenAnalysis(input: StartScreenAnalysisBody) {
    return this.sdk.analysis.screen(input);
  }

  getJob(jobId: string) {
    return this.sdk.jobs.get(jobId);
  }
}
