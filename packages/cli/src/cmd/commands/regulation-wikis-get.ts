import type { Wiki } from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

export class RegulationWikisGetCommand extends Command<string, Wiki> {
  readonly name = CommandName.REGULATION_WIKIS_GET;
  readonly help: HelpEntry = {
    label: "regulation-wikis get <slug>",
    summary: "Get a regulation wiki by slug",
    details: `midlyr regulation-wikis get <slug>

Get the full content of a regulation wiki by slug.

Arguments:
  <slug>                  Wiki slug (or pass via --slug).

Returns the full wiki object including body content, sources, and metadata.

Endpoint: GET /api/v1/regulation-wikis/:slug
`,
  };

  parse(args: ParsedArgs): string {
    const slug = args.option("slug") ?? args.positionals[0];
    if (!slug) {
      throw new CliInputError("A wiki slug is required (pass as positional or --slug).");
    }
    return slug;
  }

  execute(slug: string, services: CommandServices) {
    return services.wikis.get(slug);
  }
}
