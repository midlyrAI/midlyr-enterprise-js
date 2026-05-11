import {
  ScreenAnalysisScenario,
  type CreateRiskAssessmentJobRequest,
} from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface AnalysisRiskInput {
  body: CreateRiskAssessmentJobRequest;
}

const VALID_SCENARIOS: ReadonlySet<string> = new Set(Object.values(ScreenAnalysisScenario));

function isScenario(value: string): value is ScreenAnalysisScenario {
  return VALID_SCENARIOS.has(value);
}

export class AnalysisRiskCommand extends Command<AnalysisRiskInput, unknown> {
  readonly name = CommandName.ANALYSIS_RISK;
  readonly help: HelpEntry = {
    label: "analysis risk",
    summary: "Run a synchronous compliance risk assessment and return the 0-100 score",
    details: `midlyr analysis risk --scenario <type> --text <content>

Run a synchronous risk assessment. Returns the resolved job envelope with
result.riskScore (0-100) — no polling required.

Required:
  --scenario <type>       One of: marketing_asset, dispute, debt_collection, complaint, generic
  --text <content>        The text content to assess (positional args also accepted)

Endpoint: POST /api/v1/analysis/risk
`,
  };

  parse(args: ParsedArgs): AnalysisRiskInput {
    const scenario = args.option("scenario");
    if (!scenario) {
      throw new CliInputError("analysis risk requires --scenario.");
    }
    if (!isScenario(scenario)) {
      throw new CliInputError(
        `Invalid --scenario '${scenario}'. Must be one of: ${Object.values(ScreenAnalysisScenario).join(", ")}.`,
      );
    }

    const text = args.option("text") ?? args.positionals.join(" ");
    if (!text) {
      throw new CliInputError(
        "analysis risk requires --text or text as a positional argument.",
      );
    }

    return {
      body: { content: { type: "text", text }, scenario },
    };
  }

  execute(input: AnalysisRiskInput, services: CommandServices) {
    return services.riskAssessment.run(input);
  }
}
