import type { RegulationSummary } from "./regulations.js";

export const SCREEN_ANALYSIS_SCENARIOS = [
  "marketing_asset",
  "dispute",
  "debt_collection",
  "complaint",
  "generic",
] as const;

export type ScreenAnalysisScenario = (typeof SCREEN_ANALYSIS_SCENARIOS)[number];

export interface ScreenAnalysisContent {
  type: "text";
  text: string;
}

export interface StartScreenAnalysisBody {
  content: ScreenAnalysisContent;
  scenario: ScreenAnalysisScenario;
}

export interface StartScreenAnalysisResponse {
  id: string;
}

export type ViolationPriority = "p1" | "p2" | "p3";

export interface ScreenAnalysisCitationChunk {
  text: string;
  startOffset: number | null;
  endOffset: number | null;
}

export interface ScreenAnalysisCitation {
  regulation: RegulationSummary;
  chunks: ScreenAnalysisCitationChunk[];
}

export interface ScreenAnalysisViolationResult {
  priority: ViolationPriority;
  title: string;
  details: string;
  citations: ScreenAnalysisCitation[];
}

export interface ScreenAnalysisJobResult {
  type: "analysis.screen.result";
  riskScore: number;
  findings: ScreenAnalysisViolationResult[];
}
