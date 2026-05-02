import { CliInputError } from "../../domain/errors.js";
import type { CredentialsStore } from "../../domain/credentials.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import type { Writable } from "../output.js";
import type { HelpEntry } from "./types.js";

export const configHelp: { name: typeof CommandName.CONFIG; help: HelpEntry } = {
  name: CommandName.CONFIG,
  help: {
    label: "config set api-key",
    summary: "Save an API key to ~/.config/midlyr/credentials.json",
    details: `midlyr config set api-key <key>

Save an API key to ~/.config/midlyr/credentials.json so subsequent commands can use it
without setting MIDLYR_API_KEY. Prefer \`midlyr login\` for normal use.
`,
  },
};

export async function runConfigCommand(
  args: ParsedArgs,
  stdout: Writable,
  credentialsStore: CredentialsStore,
): Promise<void> {
  const [subcommand, key, value] = args.positionals;

  if (subcommand !== "set" || key !== "api-key" || !value) {
    throw new CliInputError("Usage: midlyr config set api-key <key>");
  }

  await credentialsStore.write({ apiKey: value });
  stdout.write(`API key saved to ${credentialsStore.path()}\n`);
}
