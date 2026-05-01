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
  /** Restrict to specific regulation ids returned from `browse()`. Accepts a single id or an array; the SDK normalizes to the wire array shape. */
  ids?: string | string[];
  /** Filter by issuing authority (e.g., `cfpb`, `occ`). Accepts a single value or an array. */
  authorities?: string | string[];
  /** Filter by jurisdiction (e.g., `us-federal`). Accepts a single value or an array. */
  jurisdictions?: string | string[];
}

export interface QueryRegulationsBody {
  /** Natural-language query. Embedded server-side and matched against the corpus. 1–2000 characters. */
  query: string;
  /** Maximum number of chunks to return. Range 1–50. Defaults to 10 server-side. */
  limit?: number;
  /**
   * Cosine-similarity cutoff (range 0–1). Chunks scoring below this value are
   * dropped from the response. Higher = stricter. Omit to receive all top-`limit`
   * chunks regardless of score.
   */
  scoreThreshold?: number;
  filters?: QueryRegulationsFilters;
}

/**
 * Shared chunk shape returned by any API that surfaces regulation excerpts —
 * screen-analysis citations and the regulation query endpoint both use this.
 */
export interface RegulationCitationChunk {
  /** Verbatim regulation text — not generated content. */
  text: string;
  /** Byte offset where the excerpt begins in the regulation's plain text. `null` when unavailable (e.g., legacy ingestion). */
  startOffset: number | null;
  /** Byte offset where the excerpt ends. `null` when unavailable. */
  endOffset: number | null;
  /**
   * Slash-delimited breadcrumb showing where the chunk lives within its
   * document (e.g., `Regulation E > § 1005.11 > (c)(2)`). For documents
   * without extractable section structure (typically single-section rules
   * or unstructured statutes), falls back to the document title alone.
   * `null` when nothing could be derived.
   */
  sectionPath: string | null;
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
