import type { PaginationResult } from "./common.js";

export type DocumentCategory =
  | "statute"
  | "regulation"
  | "interagencyGuidance"
  | "agencyGuidance"
  | "examinationHandbook"
  | "interpretiveAction"
  | "sroRule";

export interface RegulationSummary {
  id: string;
  category: DocumentCategory;
  title: string;
  authorities: string[];
  jurisdictions: string[];
  description: string;
  updatedAt: string;
  sourceUrl: string;
}

export interface RegulationTableOfContentsEntry {
  id: string;
  title: string;
  level: number;
  startOffset: number;
  parentId?: string;
}

export interface RegulationTableOfContents {
  entries: RegulationTableOfContentsEntry[];
}

export interface RegulationDetails extends RegulationSummary {
  totalBytes: number;
  tableOfContents: RegulationTableOfContents;
  attributes: Record<string, unknown>;
}

export interface RegulationContent {
  id: string;
  text: string;
  offset: number;
  limit: number;
  totalBytes: number;
  hasMore: boolean;
  details: RegulationDetails;
}

export interface BrowseRegulationsQuery {
  query?: string;
  category?: string | string[];
  authorities?: string | string[];
  jurisdictions?: string | string[];
  limit?: number;
  cursor?: string;
}

export interface BrowseRegulationsResponse {
  results: RegulationSummary[];
  pagination: PaginationResult;
}

export interface ReadRegulationContentQuery {
  offset?: number;
  limit?: number;
}
