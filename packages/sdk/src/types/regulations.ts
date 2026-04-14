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
  updatedAt: string;
  sourceUrl: string;
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
  sourceUrl: string;
  formalCitation: FormalCitation;
  text: string;
  offset: number;
  limit: number;
  totalCharacters: number;
  hasMore: boolean;
  nextCursor: string | null;
  attributes: Record<string, unknown>;
}

export interface RegulatoryChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
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
  documentIds?: string[];
  category?: string | string[];
  authority?: string | string[];
  limit?: number;
}

export interface QueryRegulatoryChunksResponse {
  chunks: RegulatoryChunk[];
  totalMatches: number;
}
