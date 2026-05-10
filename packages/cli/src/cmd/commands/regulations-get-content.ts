import type { GetRegulationContentRequest, RegulationContent } from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface RegulationsGetContentInput {
  id: string;
  query: GetRegulationContentRequest;
}

export class RegulationsGetContentCommand extends Command<
  RegulationsGetContentInput,
  RegulationContent
> {
  readonly name = CommandName.REGULATIONS_GET_CONTENT;
  readonly help: HelpEntry = {
    label: "regulations get-content <id>",
    summary: "Get the full text body of a regulation by id",
    details: `midlyr regulations get-content <id> [options]

Get the full text body of a regulation by id. Long documents are returned in byte-range
chunks; use --offset and --limit to page.

Arguments:
  <id>                    Regulation id (or pass via --id).

Options:
  --offset <bytes>
  --limit <bytes>

Returns a regulation metadata object plus a content object containing the requested text byte range.

Endpoint: GET /api/v1/regulations/:id/content
`,
  };

  parse(args: ParsedArgs): RegulationsGetContentInput {
    const id = args.option("id") ?? args.positionals[0];
    if (!id) {
      throw new CliInputError("A regulation id is required (pass as positional or --id).");
    }
    return {
      id,
      query: {
        offset: args.numberOption("offset"),
        limit: args.numberOption("limit"),
      },
    };
  }

  execute(input: RegulationsGetContentInput, services: CommandServices) {
    return services.documents.readContent(input.id, input.query);
  }
}
