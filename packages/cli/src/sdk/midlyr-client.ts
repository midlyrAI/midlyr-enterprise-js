import {
  Midlyr as MidlyrSdk,
  type ListRegulationsRequest,
  type FetchLike,
  type ListJobsRequest,
  type QueryRegulationsRequest,
  type GetRegulationContentRequest,
  type CreateScreenAnalysisJobRequest,
} from "@midlyr/sdk-js";

export type MidlyrClientOptions = {
  apiKey: string;
  baseUrl: string;
  requestTimeoutMs?: number;
  fetch?: FetchLike;
  clientIdentity?: string;
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
        clientIdentity: options.clientIdentity,
      });
  }

  browseDocuments(input: ListRegulationsRequest) {
    return this.sdk.regulations.list(input);
  }

  getDocumentDetails(id: string) {
    return this.sdk.regulations.get(id);
  }

  readDocumentContent(id: string, input: GetRegulationContentRequest) {
    return this.sdk.regulations.getContent(id, input);
  }

  queryDocuments(input: QueryRegulationsRequest) {
    return this.sdk.regulations.query(input);
  }

  startScreenAnalysis(input: CreateScreenAnalysisJobRequest) {
    return this.sdk.analysis.screen(input);
  }

  getJob(jobId: string) {
    return this.sdk.jobs.get(jobId);
  }

  listJobs(query: ListJobsRequest) {
    return this.sdk.jobs.list(query);
  }
}
