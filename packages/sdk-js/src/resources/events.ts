import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type { CreateEventRequest, CreateEventResponse } from "../types/events.js";

export class EventAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  create(body: CreateEventRequest, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<CreateEventResponse>({
      method: "POST",
      path: "/api/v1/events",
      body,
      ...options,
    });
  }
}
