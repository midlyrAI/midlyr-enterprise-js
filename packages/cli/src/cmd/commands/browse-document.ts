import type { BrowseRegulationsQuery, BrowseRegulationsResponse } from "@midlyr/sdk-js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

export class BrowseDocumentCommand extends Command<BrowseRegulationsQuery, BrowseRegulationsResponse> {
  readonly name = CommandName.BROWSE_DOCUMENT;
  readonly help: HelpEntry = {
    label: "browse-document",
    summary: "List regulatory documents with optional filters",
    details: `midlyr browse-document [options]

List regulatory documents with optional filters.

Options:
  --query <text>
  --category <cat>        (repeatable)
  --authority <name>      (repeatable)
  --jurisdiction <code>   (repeatable)
  --limit <n>
  --cursor <token>

Returns a paginated list of document summaries (id, title, jurisdictions, updatedAt).
Does NOT return content bodies — use read-document-content for that.

Endpoint: GET /api/v1/regulations/
`,
  };

  parse(args: ParsedArgs): BrowseRegulationsQuery {
    return {
      query: args.option("query"),
      categories: args.multiOption("category"),
      authorities: args.multiOption("authority"),
      jurisdictions: args.multiOption("jurisdiction"),
      limit: args.numberOption("limit"),
      cursor: args.option("cursor"),
    };
  }

  execute(input: BrowseRegulationsQuery, services: CommandServices) {
    return services.documents.browse(input);
  }
}
