import type { RegulationCitation } from "./regulations.js";
import { ScreenAnalysisScenario } from "./scenario.js";

export { ScreenAnalysisScenario };

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

export interface CreateRiskAssessmentJobRequest {
  content: ScreenAnalysisContent;
  scenario: ScreenAnalysisScenario;
}

export interface CreateRiskAssessmentJobResponse {
  id: string;
}

/**
 * Lighter-weight sibling of `ScreenAnalysisResult` — emits only a riskScore
 * (no findings / citations). Suited for triage and live-feedback flows.
 */
export interface RiskAssessmentResult {
  type: "risk_assessment_result";
  riskScore: number;
}
