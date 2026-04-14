import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type {
  BrowseRegulationsQuery,
  BrowseRegulationsResponse,
  QueryRegulatoryChunksBody,
  QueryRegulatoryChunksResponse,
  ReadRegulationQuery,
  RegulationDetail,
} from "../types/regulations.js";

export class RegulationAPI {
  readonly #transport: Transport;

  constructor(transport: Transport) {
    this.#transport = transport;
  }

  browse(query: BrowseRegulationsQuery = {}, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<BrowseRegulationsResponse>({
      method: "GET",
      path: "/api/v1/regulations",
      query,
      ...options,
    });
  }

  read(id: string, query: ReadRegulationQuery = {}, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<RegulationDetail>({
      method: "GET",
      path: `/api/v1/regulations/${encodeURIComponent(id)}`,
      query,
      ...options,
    });
  }

  queryChunks(body: QueryRegulatoryChunksBody, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<QueryRegulatoryChunksResponse>({
      method: "POST",
      path: "/api/v1/regulations/chunks/query",
      body,
      ...options,
    });
  }
}
