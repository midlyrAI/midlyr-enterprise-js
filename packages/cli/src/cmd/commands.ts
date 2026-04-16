import { SCREEN_ANALYSIS_SCENARIOS, type StartScreenAnalysisBody, type ScreenAnalysisScenario } from "@midlyr/sdk";
import { CliInputError } from "../domain/errors.js";
import type { DocumentsService } from "../domain/documents.js";
import type { ScreenAnalysisService } from "../domain/screen-analysis.js";
import { isCommandName } from "./command-names.js";
import type { ParsedArgs } from "./parser.js";

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
        authorities: args.multiOption("authority"),
        jurisdictions: args.multiOption("jurisdiction"),
        limit: args.numberOption("limit"),
        cursor: args.option("cursor"),
      });

    case "read-document":
      return services.documents.read(getDocumentId(args), {
        offset: args.numberOption("offset"),
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

const VALID_SCENARIOS: ReadonlySet<string> = new Set(SCREEN_ANALYSIS_SCENARIOS);

function isScenario(value: string): value is ScreenAnalysisScenario {
  return VALID_SCENARIOS.has(value);
}

function buildScreenAnalysisBody(args: ParsedArgs): StartScreenAnalysisBody {
  const scenario = args.option("scenario");
  if (!scenario) {
    throw new CliInputError("screen-analysis requires --scenario.");
  }
  if (!isScenario(scenario)) {
    throw new CliInputError(
      `Invalid --scenario '${scenario}'. Must be one of: ${SCREEN_ANALYSIS_SCENARIOS.join(", ")}.`,
    );
  }

  const text = args.option("text") ?? args.positionals.join(" ");
  if (!text) {
    throw new CliInputError("screen-analysis requires --text or text as a positional argument.");
  }

  return {
    content: { type: "text", text },
    scenario,
  };
}
