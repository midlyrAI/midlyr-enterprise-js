import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type {
  ListRegulationWikisRequest,
  ListRegulationWikisResponse,
  Wiki,
} from "../types/regulation-wikis.js";

export class RegulationWikiAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  list(query: ListRegulationWikisRequest = {}, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<ListRegulationWikisResponse>({
      method: "GET",
      path: "/api/v1/regulation-wikis",
      query,
      ...options,
    });
  }

  get(slug: string, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<Wiki>({
      method: "GET",
      path: `/api/v1/regulation-wikis/${encodeURIComponent(slug)}`,
      ...options,
    });
  }
}
