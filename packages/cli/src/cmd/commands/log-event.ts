import {
  ScreenAnalysisScenario,
  type CreateEventRequest,
  type EventContent,
} from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface LogEventInput {
  body: CreateEventRequest;
}

const VALID_SCENARIOS: ReadonlySet<string> = new Set(Object.values(ScreenAnalysisScenario));

function isScenario(value: string): value is ScreenAnalysisScenario {
  return VALID_SCENARIOS.has(value);
}

function parseJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new CliInputError("--json must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof CliInputError) {
      throw error;
    }
    throw new CliInputError(
      `--json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function parseContent(args: ParsedArgs): EventContent {
  const text = args.option("text") ?? args.positionals.join(" ");
  const json = args.option("json");

  if (text && json) {
    throw new CliInputError("log-event accepts either --text or --json, not both.");
  }
  if (json) {
    return { type: "json", json: parseJson(json) };
  }
  if (text) {
    return { type: "text", text };
  }
  throw new CliInputError(
    "log-event requires --text (or a positional text argument) or --json.",
  );
}

export class LogEventCommand extends Command<LogEventInput, unknown> {
  readonly name = CommandName.LOG_EVENT;
  readonly help: HelpEntry = {
    label: "log-event",
    summary: "Log a compliance event synchronously (no AI screening)",
    details: `midlyr log-event --scenario <type> (--text <content> | --json <object>) [--external-ref <id>]

Submit a compliance event for audit and triage. The event is persisted as a ticket
synchronously without AI classification — use screen-analysis when you want compliance
findings.

Required:
  --scenario <type>          One of: marketing_asset, dispute, debt_collection, complaint, generic
  --text <content>           Plain text content (positional args also accepted)
                             OR
  --json <object>            JSON object payload (e.g., '{"transactionId":"tx_1"}')

Optional:
  --external-ref <id>        Idempotency key. Replaying with the same value returns the
                             original ticket id with created=false.

Returns { ticketId, externalRef?, created }.

Endpoint: POST /api/v1/events
`,
  };

  parse(args: ParsedArgs): LogEventInput {
    const scenario = args.option("scenario");
    if (!scenario) {
      throw new CliInputError("log-event requires --scenario.");
    }
    if (!isScenario(scenario)) {
      throw new CliInputError(
        `Invalid --scenario '${scenario}'. Must be one of: ${Object.values(ScreenAnalysisScenario).join(", ")}.`,
      );
    }

    const content = parseContent(args);
    const externalRef = args.option("external-ref");

    return {
      body: {
        scenario,
        content,
        ...(externalRef ? { externalRef } : {}),
      },
    };
  }

  execute(input: LogEventInput, services: CommandServices) {
    return services.eventIntake.run(input);
  }
}
