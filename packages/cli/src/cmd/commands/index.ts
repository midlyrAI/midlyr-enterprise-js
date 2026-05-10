import { CliInputError } from "../../domain/errors.js";
import { isCommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { AnalysisScreenCommand } from "./analysis-screen.js";
import { configHelp, runConfigCommand } from "./config.js";
import { EventsCreateCommand } from "./events-create.js";
import { JobsListCommand } from "./jobs-list.js";
import { loginHelp, runLoginCommand, type LoginRuntime } from "./login.js";
import { RegulationsGetCommand } from "./regulations-get.js";
import { RegulationsGetContentCommand } from "./regulations-get-content.js";
import { RegulationsListCommand } from "./regulations-list.js";
import { RegulationsQueryCommand } from "./regulations-query.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

export type { CommandServices, HelpEntry, LoginRuntime };
export { Command, runConfigCommand, runLoginCommand };

const CREDENTIALED_COMMANDS: readonly Command<unknown, unknown>[] = [
  new RegulationsListCommand(),
  new RegulationsGetCommand(),
  new RegulationsGetContentCommand(),
  new RegulationsQueryCommand(),
  new AnalysisScreenCommand(),
  new EventsCreateCommand(),
  new JobsListCommand(),
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
