import type { RegulationDetails } from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface RegulationsGetInput {
  id: string;
}

export class RegulationsGetCommand extends Command<RegulationsGetInput, RegulationDetails> {
  readonly name = CommandName.REGULATIONS_GET;
  readonly help: HelpEntry = {
    label: "regulations get <id>",
    summary: "Get metadata for one regulation by id",
    details: `midlyr regulations get <id>

Get metadata for one regulation by id — title, authorities, jurisdictions, description,
table of contents, sourceUrl, totalBytes, updatedAt. Does NOT return the body text.

Arguments:
  <id>                    Regulation id (or pass via --id).

Endpoint: GET /api/v1/regulations/:id
`,
  };

  parse(args: ParsedArgs): RegulationsGetInput {
    const id = args.option("id") ?? args.positionals[0];
    if (!id) {
      throw new CliInputError("A regulation id is required (pass as positional or --id).");
    }
    return { id };
  }

  execute(input: RegulationsGetInput, services: CommandServices) {
    return services.documents.getDetails(input.id);
  }
}
