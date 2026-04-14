import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type {
  StartComplianceScreeningBody,
  StartComplianceScreeningResponse,
} from "../types/analysis.js";

export class AnalysisAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  startScreening(body: StartComplianceScreeningBody, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<StartComplianceScreeningResponse>({
      method: "POST",
      path: "/api/v1/regulations/screening",
      body,
      ...options,
    });
  }
}
