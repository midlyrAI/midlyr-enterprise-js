/**
 * Compliance scenario taxonomy shared by the screening (`POST /screen`) and
 * event-intake (`POST /events`) surfaces. Lives in its own file so neither
 * endpoint's types module owns it.
 */
export const ScreenAnalysisScenario = {
  MARKETING_ASSET: "marketing_asset",
  DISPUTE: "dispute",
  DEBT_COLLECTION: "debt_collection",
  COMPLAINT: "complaint",
  GENERIC: "generic",
} as const;
export type ScreenAnalysisScenario =
  (typeof ScreenAnalysisScenario)[keyof typeof ScreenAnalysisScenario];
