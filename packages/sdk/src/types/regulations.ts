import type { PaginationResult } from "./common.js";

export type DocumentCategory =
  | "statute"
  | "regulation"
  | "interagency-guidance"
  | "agency-guidance"
  | "examination-handbook"
  | "interpretive-action"
  | "enforcement-action"
  | "supervisory-observation"
  | "rating-framework"
  | "sro-rule"
  | "operating-circular";

export interface RegulationSummary {
  id: string;
  category: DocumentCategory;
  title: string;
  citation: string;
  authority: string;
  jurisdiction: string;
  description: string;
  updated_at: string;
  source_url: string;
}

export interface FormalCitation {
  short: string;
  full: string;
}

export interface RegulationDetail {
  id: string;
  category: DocumentCategory;
  title: string;
  citation: string;
  authority: string;
  jurisdiction: string;
  description: string;
  source_url: string;
  formal_citation: FormalCitation;
  text: string;
  offset: number;
  limit: number;
  total_characters: number;
  has_more: boolean;
  next_cursor: string | null;
  attributes: Record<string, unknown>;
}

export interface RegulatoryChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  citation: string;
  authority: string;
  text: string;
  score: number;
  section: string | null;
}

export interface BrowseRegulationsQuery {
  query?: string;
  category?: string | string[];
  authority?: string | string[];
  jurisdiction?: string | string[];
  limit?: number;
  cursor?: string;
}

export interface BrowseRegulationsResponse {
  results: RegulationSummary[];
  pagination: PaginationResult;
}

export interface ReadRegulationQuery {
  cursor?: string;
  offset?: number;
  limit?: number;
}

export interface QueryRegulatoryChunksBody {
  query: string;
  document_ids?: string[];
  category?: string | string[];
  authority?: string | string[];
  limit?: number;
}

export interface QueryRegulatoryChunksResponse {
  chunks: RegulatoryChunk[];
  total_matches: number;
}
