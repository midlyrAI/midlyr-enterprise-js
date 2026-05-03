import type { MidlyrRequestOptions } from "../config.js";
import type { Transport } from "../transport.js";
import type {
  BrowseRegulationsQuery,
  BrowseRegulationsResponse,
  QueryRegulationsBody,
  QueryRegulationsResponse,
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

  /**
   * Vector-search the regulatory corpus and return the top relevant chunks
   * grouped by parent regulation. Pure retrieval — no LLM is invoked, no
   * answer is generated. Compose with your own model for retrieval-augmented
   * generation.
   *
   * Results are ordered by relevance (best-scoring regulation first); chunks
   * within each citation are also ordered by relevance. The response carries
   * up to `limit` chunks total — this endpoint is not paginated; issue another
   * call with different filters if you need more.
   *
   * Like all `POST` requests in this SDK, this method does **not** auto-retry
   * on transient failures. If you want retry behavior for vector search
   * (which is naturally idempotent), opt in per request:
   * ```ts
   * await midlyr.regulations.query(body, { maxRetries: 2 });
   * ```
   */
  query(body: QueryRegulationsBody, options: MidlyrRequestOptions = {}) {
    return this.#transport.request<QueryRegulationsResponse>({
      method: "POST",
      path: "/api/v1/regulations/query",
      body: normalizeQueryBody(body),
      ...options,
    });
  }
}

/**
 * Normalize singular-string filter values into wire-shape arrays so the
 * customer can write either `authorities: "cfpb"` or `authorities: ["cfpb"]`
 * — mirrors `BrowseRegulationsQuery`'s ergonomics.
 */
function normalizeQueryBody(body: QueryRegulationsBody): QueryRegulationsBody {
  if (!body.filters) return body;
  return {
    ...body,
    filters: {
      ids: toArray(body.filters.ids),
      authorities: toArray(body.filters.authorities),
      jurisdictions: toArray(body.filters.jurisdictions),
    },
  };
}

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}
