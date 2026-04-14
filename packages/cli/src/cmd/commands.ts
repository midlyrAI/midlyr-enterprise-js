import type { StartComplianceScreeningBody, TransactionVolume } from "@midlyr/sdk";
import { CliInputError } from "../domain/errors.js";
import type { DocumentsService } from "../domain/documents.js";
import type { ScreenAnalysisService } from "../domain/screen-analysis.js";
import { isCommandName } from "./command-names.js";
import { parseCliNumber, type ParsedArgs } from "./parser.js";

export interface CommandServices {
  documents: DocumentsService;
  screenAnalysis: ScreenAnalysisService;
}

export async function runCommand(
  commandName: string,
  args: ParsedArgs,
  services: CommandServices,
): Promise<unknown> {
  if (!isCommandName(commandName)) {
    throw new CliInputError(`Unknown command '${commandName}'.`);
  }

  switch (commandName) {
    case "browse-document":
      return services.documents.browse({
        query: args.option("query"),
        category: args.multiOption("category"),
        authority: args.multiOption("authority"),
        jurisdiction: args.multiOption("jurisdiction"),
        limit: args.numberOption("limit"),
        cursor: args.option("cursor"),
      });

    case "read-document":
      return services.documents.read(getDocumentId(args), {
        cursor: args.option("cursor"),
        offset: args.numberOption("offset"),
        limit: args.numberOption("limit"),
      });

    case "query-document":
      return services.documents.query({
        query: getDocumentQuery(args),
        document_ids: args.multiOption("document-id"),
        category: args.multiOption("category"),
        authority: args.multiOption("authority"),
        limit: args.numberOption("limit"),
      });

    case "screen-analysis":
      return services.screenAnalysis.run({
        body: buildScreenAnalysisBody(args),
        wait: !args.hasBoolean("no-wait"),
        timeoutMs: args.numberOption("timeout-ms"),
        pollIntervalMs: args.numberOption("poll-interval-ms"),
      });
  }
}

function getDocumentId(args: ParsedArgs): string {
  const id = args.option("id") ?? args.positionals[0];
  if (!id) {
    throw new CliInputError("read-document requires --id or a document id positional argument.");
  }
  return id;
}

function getDocumentQuery(args: ParsedArgs): string {
  const query = args.option("query") ?? args.positionals.join(" ");
  if (!query) {
    throw new CliInputError("query-document requires --query or a query positional argument.");
  }
  return query;
}

function buildScreenAnalysisBody(args: ParsedArgs): StartComplianceScreeningBody {
  const institutionType = args.option("institution-type");
  if (!institutionType) {
    throw new CliInputError("screen-analysis requires --institution-type.");
  }

  return {
    institution_type: institutionType as StartComplianceScreeningBody["institution_type"],
    institution_subtype: args.option("institution-subtype"),
    total_assets: args.numberOption("total-assets"),
    transaction_volumes: parseTransactionVolumes(args),
  };
}

function parseTransactionVolumes(args: ParsedArgs): TransactionVolume[] | undefined {
  const json = args.option("transaction-volumes-json");
  if (json) {
    const parsedJson = JSON.parse(json) as unknown;
    if (!Array.isArray(parsedJson)) {
      throw new CliInputError("--transaction-volumes-json must be a JSON array.");
    }
    return parsedJson as TransactionVolume[];
  }

  const volumes = args.multiOption("transaction-volume");
  if (!volumes) {
    return undefined;
  }

  return volumes.map((value) => {
    const [type, annualCount, year] = value.split(":");
    if (!type || !annualCount || !year) {
      throw new CliInputError(
        "--transaction-volume must use type:annual_count:year, for example small_business_loans:200:2026.",
      );
    }

    return {
      type: type as TransactionVolume["type"],
      annual_count: parseCliNumber(annualCount, "transaction-volume annual_count"),
      year: parseCliNumber(year, "transaction-volume year"),
    };
  });
}
