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
