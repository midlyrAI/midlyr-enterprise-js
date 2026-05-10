import type { ListRegulationsRequest, ListRegulationsResponse } from "@midlyr/sdk-js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

export class RegulationsListCommand extends Command<ListRegulationsRequest, ListRegulationsResponse> {
  readonly name = CommandName.REGULATIONS_LIST;
  readonly help: HelpEntry = {
    label: "regulations list",
    summary: "List regulatory documents with optional filters",
    details: `midlyr regulations list [options]

List regulatory documents with optional filters.

Options:
  --query <text>
  --category <cat>        (repeatable)
  --authority <name>      (repeatable)
  --jurisdiction <code>   (repeatable)
  --limit <n>
  --cursor <token>

Returns a paginated list of document summaries (id, title, jurisdictions, updatedAt).
Does NOT return content bodies — use regulations get-content for that.

Endpoint: GET /api/v1/regulations/
`,
  };

  parse(args: ParsedArgs): ListRegulationsRequest {
    return {
      query: args.option("query"),
      categories: args.multiOption("category"),
      authorities: args.multiOption("authority"),
      jurisdictions: args.multiOption("jurisdiction"),
      limit: args.numberOption("limit"),
      cursor: args.option("cursor"),
    };
  }

  execute(input: ListRegulationsRequest, services: CommandServices) {
    return services.documents.browse(input);
  }
}
