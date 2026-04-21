import { DEFAULT_BASE_URL, type MidlyrClientOptions } from "./config.js";
import { MidlyrError } from "./errors.js";
import { AnalysisAPI } from "./resources/analysis.js";
import { JobAPI } from "./resources/jobs.js";
import { RegulationAPI } from "./resources/regulations.js";
import { Transport } from "./transport.js";

export class Midlyr {
  readonly regulations: RegulationAPI;
  readonly analysis: AnalysisAPI;
  readonly jobs: JobAPI;

  constructor(options: MidlyrClientOptions) {
    if (!options.apiKey) {
      throw new MidlyrError("Midlyr SDK requires an apiKey");
    }

    const transport = new Transport({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      retryDelayMs: options.retryDelayMs,
      fetch: options.fetch,
    });

    this.regulations = new RegulationAPI(transport);
    this.analysis = new AnalysisAPI(transport);
    this.jobs = new JobAPI(transport);
  }
}
