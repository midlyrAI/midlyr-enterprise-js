import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type { Job } from "../types/jobs.js";

export class JobAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  get(id: string, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<Job>({
      method: "GET",
      path: `/api/v1/jobs/${encodeURIComponent(id)}`,
      ...options,
    });
  }
}
