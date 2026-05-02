export const CommandName = {
  BROWSE_DOCUMENT: "browse-document",
  DESCRIBE_DOCUMENT: "describe-document",
  READ_DOCUMENT_CONTENT: "read-document-content",
  SCREEN_ANALYSIS: "screen-analysis",
  LIST_JOBS: "list-jobs",
  CONFIG: "config",
  LOGIN: "login",
} as const;
export type CommandName = (typeof CommandName)[keyof typeof CommandName];

const VALID_COMMAND_NAMES: ReadonlySet<string> = new Set(Object.values(CommandName));

export function isCommandName(command: string): command is CommandName {
  return VALID_COMMAND_NAMES.has(command);
}
