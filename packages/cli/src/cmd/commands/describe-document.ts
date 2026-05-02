import type { RegulationDetails } from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface DescribeDocumentInput {
  id: string;
}

export class DescribeDocumentCommand extends Command<DescribeDocumentInput, RegulationDetails> {
  readonly name = CommandName.DESCRIBE_DOCUMENT;
  readonly help: HelpEntry = {
    label: "describe-document",
    summary: "Get metadata for one document by id",
    details: `midlyr describe-document <id>

Get metadata for one document by id — title, authorities, jurisdictions, description,
table of contents, sourceUrl, totalBytes, updatedAt. Does NOT return the body text.

Arguments:
  <id>                    Document id (or pass via --id).

Endpoint: GET /api/v1/regulations/:id
`,
  };

  parse(args: ParsedArgs): DescribeDocumentInput {
    const id = args.option("id") ?? args.positionals[0];
    if (!id) {
      throw new CliInputError("A document id is required (pass as positional or --id).");
    }
    return { id };
  }

  execute(input: DescribeDocumentInput, services: CommandServices) {
    return services.documents.getDetails(input.id);
  }
}
