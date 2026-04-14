import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type { McpJob } from "../types/jobs.js";

export class JobAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  get(jobId: string, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<McpJob>({
      method: "GET",
      path: `/api/v1/regulations/jobs/${encodeURIComponent(jobId)}`,
      ...options,
    });
  }
}
