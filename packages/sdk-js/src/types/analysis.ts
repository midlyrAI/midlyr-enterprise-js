import type { RegulationCitation } from "./regulations.js";

export type {
  /** @deprecated Use `RegulationCitationChunk` from regulations.ts. */
  RegulationCitationChunk as ScreenAnalysisCitationChunk,
  /** @deprecated Use `RegulationCitation` from regulations.ts. */
  RegulationCitation as ScreenAnalysisCitation,
} from "./regulations.js";

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

export interface ScreenAnalysisViolationResult {
  priority: ViolationPriority;
  title: string;
  details: string;
  citations: RegulationCitation[];
}

export interface ScreenAnalysisJobResult {
  type: "analysis.screen.result";
  riskScore: number;
  findings: ScreenAnalysisViolationResult[];
}
