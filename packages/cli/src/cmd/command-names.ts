export const commandNames = [
  "browse-document",
  "read-document",
  "screen-analysis",
  "config",
] as const;

export type CommandName = (typeof commandNames)[number];

export function isCommandName(command: string): command is CommandName {
  return commandNames.includes(command as CommandName);
}
