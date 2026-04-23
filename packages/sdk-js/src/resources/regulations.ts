import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type {
  BrowseRegulationsQuery,
  BrowseRegulationsResponse,
  ReadRegulationContentQuery,
  RegulationContent,
  RegulationDetails,
} from "../types/regulations.js";

export class RegulationAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  browse(query: BrowseRegulationsQuery = {}, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<BrowseRegulationsResponse>({
      method: "GET",
      path: "/api/v1/regulations/",
      query,
      ...options,
    });
  }

  getDetails(id: string, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<RegulationDetails>({
      method: "GET",
      path: `/api/v1/regulations/${encodeURIComponent(id)}`,
      ...options,
    });
  }

  readContent(
    id: string,
    query: ReadRegulationContentQuery = {},
    options: MidlyrRequestOptions = {},
  ) {
    return this.#transport.request<RegulationContent>({
      method: "GET",
      path: `/api/v1/regulations/${encodeURIComponent(id)}/content`,
      query,
      ...options,
    });
  }
}
