import { CliInputError } from "../../domain/errors.js";
import { isCommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { BrowseDocumentCommand } from "./browse-document.js";
import { configHelp, runConfigCommand } from "./config.js";
import { DescribeDocumentCommand } from "./describe-document.js";
import { ListJobsCommand } from "./list-jobs.js";
import { LogEventCommand } from "./log-event.js";
import { loginHelp, runLoginCommand, type LoginRuntime } from "./login.js";
import { QueryDocumentCommand } from "./query-document.js";
import { ReadDocumentContentCommand } from "./read-document-content.js";
import { ScreenAnalysisCommand } from "./screen-analysis.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

export type { CommandServices, HelpEntry, LoginRuntime };
export { Command, runConfigCommand, runLoginCommand };

const CREDENTIALED_COMMANDS: readonly Command<unknown, unknown>[] = [
  new BrowseDocumentCommand(),
  new DescribeDocumentCommand(),
  new ReadDocumentContentCommand(),
  new QueryDocumentCommand(),
  new ScreenAnalysisCommand(),
  new LogEventCommand(),
  new ListJobsCommand(),
] as readonly Command<unknown, unknown>[];

const COMMANDS_BY_NAME = new Map(
  CREDENTIALED_COMMANDS.map((cmd) => [cmd.name, cmd] as const),
);

/**
 * Help registry — concatenates the credentialed commands' help with the
 * special-cased login/config entries. Order here drives the order shown in
 * `midlyr --help`, so keep it intentional.
 */
export const ALL_HELP: readonly { name: string; help: HelpEntry }[] = [
  ...CREDENTIALED_COMMANDS.map((cmd) => ({ name: cmd.name, help: cmd.help })),
  loginHelp,
  configHelp,
];

export async function runCommand(
  commandName: string,
  args: ParsedArgs,
  services: CommandServices,
): Promise<unknown> {
  if (!isCommandName(commandName)) {
    throw new CliInputError(`Unknown command '${commandName}'.`);
  }

  const command = COMMANDS_BY_NAME.get(commandName);
  if (!command) {
    throw new Error(
      `Command '${commandName}' is dispatched outside the credentialed pipeline (config / login).`,
    );
  }

  return command.run(args, services);
}
