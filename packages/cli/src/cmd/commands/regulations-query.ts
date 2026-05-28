import type {
  QueryRegulationsRequest,
  QueryRegulationsFilters,
  QueryRegulationsResponse,
} from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

export class RegulationsQueryCommand extends Command<
  QueryRegulationsRequest,
  QueryRegulationsResponse
> {
  readonly name = CommandName.REGULATIONS_QUERY;
  readonly help: HelpEntry = {
    label: "regulations query",
    summary: "Vector-search regulation chunks by natural-language query",
    details: `midlyr regulations query --query <text> [options]

Vector-search the regulatory corpus and return the top relevant chunks. This is a
retrieval primitive — no LLM is invoked and no answer is generated. Compose it with
your own model to build retrieval-augmented generation.

Required:
  --query <text>              Natural-language query (positional args also accepted)

Optional:
  --limit <n>                 Max chunks to return (1..50, default 10)
  --id <id>                   Restrict to specific regulation(s) (repeatable)
  --authority <name>          Filter by authority                (repeatable)
  --jurisdiction <code>       Filter by jurisdiction             (repeatable; e.g. us-federal, us-state:ca — Jurisdiction enum)

Returns matches grouped by parent regulation, each with one or more excerpts
(text, byte offsets, section path) and the regulation's metadata.

Endpoint: POST /api/v1/regulations/query
`,
  };

  parse(args: ParsedArgs): QueryRegulationsRequest {
    const query = args.option("query") ?? args.positionals.join(" ");
    if (!query) {
      throw new CliInputError(
        "regulations query requires --query or text as a positional argument.",
      );
    }

    const filters: QueryRegulationsFilters = {};
    const ids = args.multiOption("id");
    if (ids) filters.ids = ids;
    const authorities = args.multiOption("authority");
    if (authorities) filters.authorities = authorities;
    const jurisdictions = args.multiOption("jurisdiction");
    if (jurisdictions) filters.jurisdictions = jurisdictions;

    const body: QueryRegulationsRequest = { query };
    const limit = args.numberOption("limit");
    if (limit !== undefined) body.limit = limit;
    if (Object.keys(filters).length > 0) body.filters = filters;

    return body;
  }

  execute(input: QueryRegulationsRequest, services: CommandServices) {
    return services.documents.query(input);
  }
}
