import type { RegulationCitation } from "./regulations.js";

export const ScreenAnalysisScenario = {
  MARKETING_ASSET: "marketing_asset",
  DISPUTE: "dispute",
  DEBT_COLLECTION: "debt_collection",
  COMPLAINT: "complaint",
  GENERIC: "generic",
} as const;
export type ScreenAnalysisScenario =
  (typeof ScreenAnalysisScenario)[keyof typeof ScreenAnalysisScenario];

export interface ScreenAnalysisContent {
  type: "text";
  text: string;
}

export interface CreateScreenAnalysisJobRequest {
  content: ScreenAnalysisContent;
  scenario: ScreenAnalysisScenario;
}

export interface CreateScreenAnalysisJobResponse {
  id: string;
}

export const ViolationPriority = {
  P1: "p1",
  P2: "p2",
  P3: "p3",
} as const;
export type ViolationPriority = (typeof ViolationPriority)[keyof typeof ViolationPriority];

export interface ScreenAnalysisViolationResult {
  priority: ViolationPriority;
  title: string;
  details: string;
  citations: RegulationCitation[];
}

export interface ScreenAnalysisResult {
  type: "analysis.screen.result";
  riskScore: number;
  findings: ScreenAnalysisViolationResult[];
}
