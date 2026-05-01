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

interface RegulationAttributesBase {
  citation?: string;
  sourceUrl?: string;
}

export interface StatuteAttributes extends RegulationAttributesBase {
  category: "statute";
  publicLawNumber?: string;
  enactedDate?: string;
  uscTitle?: number;
  uscChapter?: number;
}

export interface RegulationCategoryAttributes extends RegulationAttributesBase {
  category: "regulation";
  cfrTitle?: number;
  cfrPart?: number;
  cfrSection?: string;
  effectiveDate?: string;
  lastAmendedDate?: string;
}

export interface InteragencyGuidanceAttributes extends RegulationAttributesBase {
  category: "interagencyGuidance";
  issuingAuthorities?: string[];
  documentNumber?: string;
  issuedOn?: string;
}

export interface AgencyGuidanceAttributes extends RegulationAttributesBase {
  category: "agencyGuidance";
  documentNumber?: string;
  issuedOn?: string;
  applicability?: string;
}

export interface ExaminationHandbookAttributes extends RegulationAttributesBase {
  category: "examinationHandbook";
  handbookName?: string;
  section?: string;
  version?: string;
}

export interface InterpretiveActionAttributes extends RegulationAttributesBase {
  category: "interpretiveAction";
  documentNumber?: string;
  issuedOn?: string;
  addressee?: string;
}

export interface SroRuleAttributes extends RegulationAttributesBase {
  category: "sroRule";
  ruleNumber?: string;
  effectiveDate?: string;
}

export type RegulationAttributes =
  | StatuteAttributes
  | RegulationCategoryAttributes
  | InteragencyGuidanceAttributes
  | AgencyGuidanceAttributes
  | ExaminationHandbookAttributes
  | InterpretiveActionAttributes
  | SroRuleAttributes;

export interface RegulationDetails extends RegulationSummary {
  totalBytes: number;
  tableOfContents: RegulationTableOfContents;
  attributes: RegulationAttributes | null;
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
  categories?: string | string[];
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

export interface QueryRegulationsFilters {
  ids?: string[];
  authorities?: string[];
  jurisdictions?: string[];
}

export interface QueryRegulationsBody {
  query: string;
  limit?: number;
  scoreThreshold?: number;
  filters?: QueryRegulationsFilters;
}

/**
 * Shared chunk shape returned by any API that surfaces regulation excerpts —
 * screen-analysis citations and the regulation query endpoint both use this.
 */
export interface RegulationCitationChunk {
  text: string;
  startOffset: number | null;
  endOffset: number | null;
  sectionPath: string | null;
  citation: string | null;
}

/**
 * A regulation paired with one or more excerpts from it. Returned by both
 * screen-analysis (as evidence supporting a finding) and the query endpoint
 * (as a search result grouped by parent regulation).
 */
export interface RegulationCitation {
  regulation: RegulationSummary;
  chunks: RegulationCitationChunk[];
}

export interface QueryRegulationsResponse {
  results: RegulationCitation[];
}
