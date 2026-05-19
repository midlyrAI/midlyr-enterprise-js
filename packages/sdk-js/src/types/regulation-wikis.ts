import type { PaginationResult } from "./common.js";

export interface WikiSummary {
  slug: string;
  title: string;
  domain: string;
  description: string;
  updatedAt: string;
  sourceCount: number;
}

export interface Wiki extends WikiSummary {
  sources: string[];
  body: string;
}

export interface ListRegulationWikisRequest {
  domain?: string;
  q?: string;
  updatedSince?: string;
  limit?: number;
  cursor?: string;
}

export interface ListRegulationWikisResponse {
  results: WikiSummary[];
  pagination: PaginationResult;
}
