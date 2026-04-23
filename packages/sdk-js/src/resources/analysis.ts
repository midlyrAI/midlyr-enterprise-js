import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type { StartScreenAnalysisBody, StartScreenAnalysisResponse } from "../types/analysis.js";

export class AnalysisAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  screen(body: StartScreenAnalysisBody, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<StartScreenAnalysisResponse>({
      method: "POST",
      path: "/api/v1/analysis/screen",
      body,
      ...options,
    });
  }
}
