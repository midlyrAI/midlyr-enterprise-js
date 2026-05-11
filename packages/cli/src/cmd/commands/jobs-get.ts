import type { Job } from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

interface JobsGetInput {
  id: string;
}

export class JobsGetCommand extends Command<JobsGetInput, Job> {
  readonly name = CommandName.JOBS_GET;
  readonly help: HelpEntry = {
    label: "jobs get <id>",
    summary: "Get a single job by id",
    details: `midlyr jobs get <id>

Get the full job envelope by id — status, result (when succeeded), error (when failed),
timings, and trigger metadata.

Arguments:
  <id>                    Job id (or pass via --id).

Endpoint: GET /api/v1/jobs/:id
`,
  };

  parse(args: ParsedArgs): JobsGetInput {
    const id = args.option("id") ?? args.positionals[0];
    if (!id) {
      throw new CliInputError("A job id is required (pass as positional or --id).");
    }
    return { id };
  }

  execute(input: JobsGetInput, services: CommandServices) {
    return services.jobs.get(input.id);
  }
}
