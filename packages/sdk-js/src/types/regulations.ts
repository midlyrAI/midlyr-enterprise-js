import type { PaginationResult } from "./common.js";

export const DocumentCategory = {
  STATUTE: "statute",
  REGULATION: "regulation",
  INTERAGENCY_GUIDANCE: "interagencyGuidance",
  AGENCY_GUIDANCE: "agencyGuidance",
  EXAMINATION_HANDBOOK: "examinationHandbook",
  INTERPRETIVE_ACTION: "interpretiveAction",
  SRO_RULE: "sroRule",
} as const;
export type DocumentCategory = (typeof DocumentCategory)[keyof typeof DocumentCategory];

/**
 * Jurisdiction codes accepted by the regulations API. The server validates
 * filter values against this enum and returns `400` for unknown codes.
 * Mirrors `Jurisdiction` in the server-side `@midlyr/enterprise-types` package.
 */
export const Jurisdiction = {
  US_FEDERAL: "us-federal",
  US_AL: "us-state:al",
  US_AK: "us-state:ak",
  US_AZ: "us-state:az",
  US_AR: "us-state:ar",
  US_CA: "us-state:ca",
  US_CO: "us-state:co",
  US_CT: "us-state:ct",
  US_DE: "us-state:de",
  US_DC: "us-state:dc",
  US_FL: "us-state:fl",
  US_GA: "us-state:ga",
  US_HI: "us-state:hi",
  US_ID: "us-state:id",
  US_IL: "us-state:il",
  US_IN: "us-state:in",
  US_IA: "us-state:ia",
  US_KS: "us-state:ks",
  US_KY: "us-state:ky",
  US_LA: "us-state:la",
  US_ME: "us-state:me",
  US_MD: "us-state:md",
  US_MA: "us-state:ma",
  US_MI: "us-state:mi",
  US_MN: "us-state:mn",
  US_MS: "us-state:ms",
  US_MO: "us-state:mo",
  US_MT: "us-state:mt",
  US_NE: "us-state:ne",
  US_NV: "us-state:nv",
  US_NH: "us-state:nh",
  US_NJ: "us-state:nj",
  US_NM: "us-state:nm",
  US_NY: "us-state:ny",
  US_NC: "us-state:nc",
  US_ND: "us-state:nd",
  US_OH: "us-state:oh",
  US_OK: "us-state:ok",
  US_OR: "us-state:or",
  US_PA: "us-state:pa",
  US_RI: "us-state:ri",
  US_SC: "us-state:sc",
  US_SD: "us-state:sd",
  US_TN: "us-state:tn",
  US_TX: "us-state:tx",
  US_UT: "us-state:ut",
  US_VT: "us-state:vt",
  US_VA: "us-state:va",
  US_WA: "us-state:wa",
  US_WV: "us-state:wv",
  US_WI: "us-state:wi",
  US_WY: "us-state:wy",
} as const;
export type Jurisdiction = (typeof Jurisdiction)[keyof typeof Jurisdiction];

export interface RegulationSummary {
  id: string;
  category: DocumentCategory;
  title: string;
  authorities: string[];
  jurisdictions: Jurisdiction[];
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

export interface RegulationContentBody {
  text: string;
  startOffset: number;
  endOffset: number;
  limit: number;
  totalBytes: number;
  hasMore: boolean;
}

export interface RegulationContent {
  regulation: RegulationDetails;
  content: RegulationContentBody;
}

export interface ListRegulationsRequest {
  query?: string;
  categories?: string | string[];
  authorities?: string | string[];
  /** Filter by jurisdiction code from the `Jurisdiction` enum (e.g., `us-federal`, `us-state:ca`). Accepts a single value or an array. Server rejects unknown codes with `400`. */
  jurisdictions?: string | string[];
  limit?: number;
  cursor?: string;
}

export interface ListRegulationsResponse {
  results: RegulationSummary[];
  pagination: PaginationResult;
}

export interface GetRegulationContentRequest {
  offset?: number;
  limit?: number;
}

export interface QueryRegulationsFilters {
  /** Restrict to specific regulation ids returned from `browse()`. Accepts a single id or an array; the SDK normalizes to the wire array shape. */
  ids?: string | string[];
  /** Filter by issuing authority (e.g., `cfpb`, `occ`). Accepts a single value or an array. */
  authorities?: string | string[];
  /** Filter by jurisdiction code from the `Jurisdiction` enum (e.g., `us-federal`, `us-state:ca`). Accepts a single value or an array. Server rejects unknown codes with `400`. Up to 50. */
  jurisdictions?: string | string[];
}

export interface QueryRegulationsRequest {
  /** Natural-language query. Embedded server-side and matched against the corpus. 1–2000 characters. */
  query: string;
  /** Maximum number of chunks to return. Range 1–50. Defaults to 10 server-side. */
  limit?: number;
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
