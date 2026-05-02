import {
  ScreenAnalysisScenario,
  type StartScreenAnalysisBody,
} from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface ScreenAnalysisInput {
  body: StartScreenAnalysisBody;
  wait: boolean;
  timeoutMs: number | undefined;
  pollIntervalMs: number | undefined;
}

const VALID_SCENARIOS: ReadonlySet<string> = new Set(Object.values(ScreenAnalysisScenario));

function isScenario(value: string): value is ScreenAnalysisScenario {
  return VALID_SCENARIOS.has(value);
}

export class ScreenAnalysisCommand extends Command<ScreenAnalysisInput, unknown> {
  readonly name = CommandName.SCREEN_ANALYSIS;
  readonly help: HelpEntry = {
    label: "screen-analysis",
    summary: "Submit text for compliance screening and poll the job",
    details: `midlyr screen-analysis --scenario <type> --text <content> [options]

Submit text for compliance screening and (by default) poll the resulting job until
it succeeds or fails.

Required:
  --scenario <type>       One of: marketing_asset, dispute, debt_collection, complaint, generic
  --text <content>        The text content to screen (positional args also accepted)

Optional:
  --timeout-ms <ms>       Total poll budget
  --poll-interval-ms <ms> Polling interval
  --no-wait               Submit only, return the job id without polling

Returns the terminal job record (status, riskScore, findings) or a pending job when --no-wait.

Endpoints: POST /api/v1/analysis/screen, GET /api/v1/jobs/:id
`,
  };

  parse(args: ParsedArgs): ScreenAnalysisInput {
    const scenario = args.option("scenario");
    if (!scenario) {
      throw new CliInputError("screen-analysis requires --scenario.");
    }
    if (!isScenario(scenario)) {
      throw new CliInputError(
        `Invalid --scenario '${scenario}'. Must be one of: ${Object.values(ScreenAnalysisScenario).join(", ")}.`,
      );
    }

    const text = args.option("text") ?? args.positionals.join(" ");
    if (!text) {
      throw new CliInputError("screen-analysis requires --text or text as a positional argument.");
    }

    return {
      body: { content: { type: "text", text }, scenario },
      wait: !args.hasBoolean("no-wait"),
      timeoutMs: args.numberOption("timeout-ms"),
      pollIntervalMs: args.numberOption("poll-interval-ms"),
    };
  }

  execute(input: ScreenAnalysisInput, services: CommandServices) {
    return services.screenAnalysis.run(input);
  }
}
