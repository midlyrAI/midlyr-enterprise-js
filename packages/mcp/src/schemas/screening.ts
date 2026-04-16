import { z } from "zod";
import { SCREEN_ANALYSIS_SCENARIOS } from "@midlyr/sdk";

const ScreenAnalysisScenarioEnum = z.enum(SCREEN_ANALYSIS_SCENARIOS);

export const name = "screen_analysis";

export const description =
  "Screen text content for regulatory compliance issues. Analyzes the provided text against applicable regulations and returns findings with risk scores and citations. Long-running (up to 30 min).";

export const schema = {
  scenario: ScreenAnalysisScenarioEnum.describe("The type of content being screened"),
  text: z.string().min(1).describe("The text content to screen for compliance issues"),
};
