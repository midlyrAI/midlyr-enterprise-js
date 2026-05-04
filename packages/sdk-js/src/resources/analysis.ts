import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type { CreateScreenAnalysisJobRequest, CreateScreenAnalysisJobResponse } from "../types/analysis.js";

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
}
