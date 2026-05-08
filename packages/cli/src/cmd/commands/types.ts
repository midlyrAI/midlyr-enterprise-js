import type { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import type { DocumentsService } from "../../domain/documents.js";
import type { EventIntakeService } from "../../domain/event-intake.js";
import type { JobsService } from "../../domain/jobs.js";
import type { ScreenAnalysisService } from "../../domain/screen-analysis.js";

export interface HelpEntry {
  readonly label: string;
  readonly summary: string;
  readonly details: string;
}

export interface CommandServices {
  documents: DocumentsService;
  screenAnalysis: ScreenAnalysisService;
  eventIntake: EventIntakeService;
  jobs: JobsService;
}

/**
 * Base class for credentialed CLI commands. Each subclass owns its own help
 * info, argument parsing, and execution against the shared service surface.
 *
 * The split into `parse` and `execute` lets tests verify argument parsing in
 * isolation, and lets us run the parsed input through dry-run / debug paths
 * later without invoking the SDK.
 */
export abstract class Command<TInput, TOutput> {
  abstract readonly name: CommandName;
  abstract readonly help: HelpEntry;
  abstract parse(args: ParsedArgs): TInput;
  abstract execute(input: TInput, services: CommandServices): Promise<TOutput>;

  async run(args: ParsedArgs, services: CommandServices): Promise<TOutput> {
    return this.execute(this.parse(args), services);
  }
}
