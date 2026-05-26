import type { ListRegulationWikisRequest, ListRegulationWikisResponse } from "@midlyr/sdk-js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

export class RegulationWikisListCommand extends Command<
  ListRegulationWikisRequest,
  ListRegulationWikisResponse
> {
  readonly name = CommandName.REGULATION_WIKIS_LIST;
  readonly help: HelpEntry = {
    label: "regulation-wikis list",
    summary: "List regulation wikis with optional filters",
    details: `midlyr regulation-wikis list [options]

List regulation wikis with optional filters.

Options:
  --domain <domain>
  --query <text>
  --updated-since <iso-date>
  --limit <n>
  --cursor <token>

Returns a paginated list of wiki summaries (slug, title, domain, description, updatedAt).
Does NOT return wiki body content — use regulation-wikis get for that.

Endpoint: GET /api/v1/regulation-wikis
`,
  };

  parse(args: ParsedArgs): ListRegulationWikisRequest {
    return {
      domain: args.option("domain"),
      query: args.option("query"),
      updatedSince: args.option("updated-since"),
      limit: args.numberOption("limit"),
      cursor: args.option("cursor"),
    };
  }

  execute(input: ListRegulationWikisRequest, services: CommandServices) {
    return services.wikis.browse(input);
  }
}
