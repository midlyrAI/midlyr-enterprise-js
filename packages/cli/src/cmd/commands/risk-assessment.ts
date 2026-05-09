import {
  ScreenAnalysisScenario,
  type CreateRiskAssessmentJobRequest,
} from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface RiskAssessmentInput {
  body: CreateRiskAssessmentJobRequest;
  wait: boolean;
  timeoutMs: number | undefined;
  pollIntervalMs: number | undefined;
}

const VALID_SCENARIOS: ReadonlySet<string> = new Set(Object.values(ScreenAnalysisScenario));

function isScenario(value: string): value is ScreenAnalysisScenario {
  return VALID_SCENARIOS.has(value);
}

export class RiskAssessmentCommand extends Command<RiskAssessmentInput, unknown> {
  readonly name = CommandName.RISK_ASSESSMENT;
  readonly help: HelpEntry = {
    label: "risk-assessment",
    summary: "Submit text for a fast compliance risk score and poll the job",
    details: `midlyr risk-assessment --scenario <type> --text <content> [options]

Lighter-weight sibling of screen-analysis. Returns a 0–100 risk score with
no findings or citations — suited for triage and live-feedback flows.

Required:
  --scenario <type>       One of: marketing_asset, dispute, debt_collection, complaint, generic
  --text <content>        The text content to assess (positional args also accepted)

Optional:
  --timeout-ms <ms>       Total poll budget
  --poll-interval-ms <ms> Polling interval
  --no-wait               Submit only, return the job id without polling

Returns the terminal job record (status, riskScore) or a pending job when --no-wait.

Endpoints: POST /api/v1/analysis/risk, GET /api/v1/jobs/:id
`,
  };

  parse(args: ParsedArgs): RiskAssessmentInput {
    const scenario = args.option("scenario");
    if (!scenario) {
      throw new CliInputError("risk-assessment requires --scenario.");
    }
    if (!isScenario(scenario)) {
      throw new CliInputError(
        `Invalid --scenario '${scenario}'. Must be one of: ${Object.values(ScreenAnalysisScenario).join(", ")}.`,
      );
    }

    const text = args.option("text") ?? args.positionals.join(" ");
    if (!text) {
      throw new CliInputError("risk-assessment requires --text or text as a positional argument.");
    }

    return {
      body: { content: { type: "text", text }, scenario },
      wait: !args.hasBoolean("no-wait"),
      timeoutMs: args.numberOption("timeout-ms"),
      pollIntervalMs: args.numberOption("poll-interval-ms"),
    };
  }

  execute(input: RiskAssessmentInput, services: CommandServices) {
    return services.riskAssessment.run(input);
  }
}
