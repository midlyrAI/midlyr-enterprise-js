export const commandNames = [
  "browse-document",
  "describe-document",
  "read-document-content",
  "screen-analysis",
  "config",
  "login",
] as const;

export type CommandName = (typeof commandNames)[number];

export function isCommandName(command: string): command is CommandName {
  return commandNames.includes(command as CommandName);
}
