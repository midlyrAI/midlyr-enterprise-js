import { DEFAULT_BASE_URL, type MidlyrClientOptions } from "./config.js";
import { MidlyrError } from "./errors.js";
import { AnalysisAPI } from "./resources/analysis.js";
import { EventAPI } from "./resources/events.js";
import { JobAPI } from "./resources/jobs.js";
import { RegulationAPI } from "./resources/regulations.js";
import { RegulationWikiAPI } from "./resources/regulation-wikis.js";
import { Transport } from "./transport.js";

export class Midlyr {
  readonly regulations: RegulationAPI;
  readonly regulationWikis: RegulationWikiAPI;
  readonly analysis: AnalysisAPI;
  readonly events: EventAPI;
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
      clientIdentity: options.clientIdentity,
    });

    this.regulations = new RegulationAPI(transport);
    this.regulationWikis = new RegulationWikiAPI(transport);
    this.analysis = new AnalysisAPI(transport);
    this.events = new EventAPI(transport);
    this.jobs = new JobAPI(transport);
  }
}
