import type {
  GetRegulationContentRequest,
  RegulationContent,
} from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface ReadDocumentContentInput {
  id: string;
  query: GetRegulationContentRequest;
}

export class ReadDocumentContentCommand extends Command<ReadDocumentContentInput, RegulationContent> {
  readonly name = CommandName.READ_DOCUMENT_CONTENT;
  readonly help: HelpEntry = {
    label: "read-document-content",
    summary: "Get the full text body of a document by id",
    details: `midlyr read-document-content <id> [options]

Get the full text body of a document by id. Long documents are returned in byte-range
chunks; use --offset and --limit to page.

Arguments:
  <id>                    Document id (or pass via --id).

Options:
  --offset <bytes>
  --limit <bytes>

Returns text plus the same metadata block that describe-document returns.

Endpoint: GET /api/v1/regulations/:id/content
`,
  };

  parse(args: ParsedArgs): ReadDocumentContentInput {
    const id = args.option("id") ?? args.positionals[0];
    if (!id) {
      throw new CliInputError("A document id is required (pass as positional or --id).");
    }
    return {
      id,
      query: {
        offset: args.numberOption("offset"),
        limit: args.numberOption("limit"),
      },
    };
  }

  execute(input: ReadDocumentContentInput, services: CommandServices) {
    return services.documents.readContent(input.id, input.query);
  }
}
