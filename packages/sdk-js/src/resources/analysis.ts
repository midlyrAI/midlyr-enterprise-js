import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type {
  CreateScreenAnalysisJobRequest,
  CreateScreenAnalysisJobResponse,
  CreateRiskAssessmentJobRequest,
} from "../types/analysis.js";
import type { Job } from "../types/jobs.js";

export class AnalysisAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  screen(body: CreateScreenAnalysisJobRequest, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<CreateScreenAnalysisJobResponse>({
      method: "POST",
      path: "/api/v1/analysis/screen",
      body,
      ...options,
    });
  }

  /**
   * Synchronous risk assessment. Unlike `screen`, this request resolves to a
   * terminal job envelope — no polling needed. The response carries
   * `result.riskScore` (0–100) on success or `error` on failure.
   */
  risk(body: CreateRiskAssessmentJobRequest, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<Job>({
      method: "POST",
      path: "/api/v1/analysis/risk",
      body,
      ...options,
    });
  }
}
