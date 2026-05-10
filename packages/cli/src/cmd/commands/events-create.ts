import {
  ScreenAnalysisScenario,
  type CreateEventRequest,
  type EventContent,
} from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface EventsCreateInput {
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
    throw new CliInputError("events create accepts either --text or --json, not both.");
  }
  if (json) {
    return { type: "json", json: parseJson(json) };
  }
  if (text) {
    return { type: "text", text };
  }
  throw new CliInputError(
    "events create requires --text (or a positional text argument) or --json.",
  );
}

export class EventsCreateCommand extends Command<EventsCreateInput, unknown> {
  readonly name = CommandName.EVENTS_CREATE;
  readonly help: HelpEntry = {
    label: "events create",
    summary: "Log a compliance event synchronously (no AI screening)",
    details: `midlyr events create --scenario <type> (--text <content> | --json <object>) [--external-ref <id>]

Submit a compliance event for audit and triage. The event is persisted as a ticket
synchronously without AI classification — use analysis screen when you want compliance
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

  parse(args: ParsedArgs): EventsCreateInput {
    const scenario = args.option("scenario");
    if (!scenario) {
      throw new CliInputError("events create requires --scenario.");
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

  execute(input: EventsCreateInput, services: CommandServices) {
    return services.eventIntake.run(input);
  }
}
