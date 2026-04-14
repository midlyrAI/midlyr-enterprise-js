import {
  Midlyr as MidlyrSdk,
  type BrowseRegulationsQuery,
  type FetchLike,
  type QueryRegulatoryChunksBody,
  type ReadRegulationQuery,
  type StartComplianceScreeningBody,
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

  readDocument(id: string, input: ReadRegulationQuery) {
    return this.sdk.regulations.read(id, input);
  }

  queryDocument(input: QueryRegulatoryChunksBody) {
    return this.sdk.regulations.queryChunks(input);
  }

  startScreenAnalysis(input: StartComplianceScreeningBody) {
    return this.sdk.analysis.startScreening(input);
  }

  getJob(jobId: string) {
    return this.sdk.jobs.get(jobId);
  }
}
