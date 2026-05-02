import type {
  QueryRegulationsBody,
  QueryRegulationsFilters,
  QueryRegulationsResponse,
} from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

export class QueryDocumentCommand extends Command<QueryRegulationsBody, QueryRegulationsResponse> {
  readonly name = CommandName.QUERY_DOCUMENT;
  readonly help: HelpEntry = {
    label: "query-document",
    summary: "Vector-search document chunks by natural-language query",
    details: `midlyr query-document --query <text> [options]

Vector-search the regulatory corpus and return the top relevant chunks. This is a
retrieval primitive — no LLM is invoked and no answer is generated. Compose it with
your own model to build retrieval-augmented generation.

Required:
  --query <text>              Natural-language query (positional args also accepted)

Optional:
  --limit <n>                 Max chunks to return (1..50, default 10)
  --score-threshold <n>       Drop chunks with a similarity score below this (0..1)
  --id <id>                   Restrict to specific regulation(s) (repeatable)
  --authority <name>          Filter by authority                (repeatable)
  --jurisdiction <code>       Filter by jurisdiction             (repeatable)

Returns chunks with score, text, byte offsets, and the parent regulation's metadata.

Endpoint: POST /api/v1/regulations/query
`,
  };

  parse(args: ParsedArgs): QueryRegulationsBody {
    const query = args.option("query") ?? args.positionals.join(" ");
    if (!query) {
      throw new CliInputError(
        "query-document requires --query or text as a positional argument.",
      );
    }

    const filters: QueryRegulationsFilters = {};
    const ids = args.multiOption("id");
    if (ids) filters.ids = ids;
    const authorities = args.multiOption("authority");
    if (authorities) filters.authorities = authorities;
    const jurisdictions = args.multiOption("jurisdiction");
    if (jurisdictions) filters.jurisdictions = jurisdictions;

    const body: QueryRegulationsBody = { query };
    const limit = args.numberOption("limit");
    if (limit !== undefined) body.limit = limit;
    const scoreThreshold = args.numberOption("score-threshold");
    if (scoreThreshold !== undefined) body.scoreThreshold = scoreThreshold;
    if (Object.keys(filters).length > 0) body.filters = filters;

    return body;
  }

  execute(input: QueryRegulationsBody, services: CommandServices) {
    return services.documents.query(input);
  }
}
