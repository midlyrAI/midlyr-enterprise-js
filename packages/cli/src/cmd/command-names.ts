export const CommandName = {
  REGULATIONS_LIST: "regulations list",
  REGULATIONS_GET: "regulations get",
  REGULATIONS_GET_CONTENT: "regulations get-content",
  REGULATIONS_QUERY: "regulations query",
  ANALYSIS_SCREEN: "analysis screen",
  ANALYSIS_RISK: "analysis risk",
  EVENTS_CREATE: "events create",
  JOBS_LIST: "jobs list",
  CONFIG: "config",
  LOGIN: "login",
} as const;
export type CommandName = (typeof CommandName)[keyof typeof CommandName];

const VALID_COMMAND_NAMES: ReadonlySet<string> = new Set(Object.values(CommandName));

export function isCommandName(command: string): command is CommandName {
  return VALID_COMMAND_NAMES.has(command);
}

/**
 * Returns the canonical set of command names for parser-driven two-token resolution.
 * Includes both two-token (e.g., "regulations list") and single-token (e.g., "config") forms.
 */
export function getValidCommandNames(): ReadonlySet<string> {
  return VALID_COMMAND_NAMES;
}
