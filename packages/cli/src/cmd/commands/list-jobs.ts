import { JobType, type ListJobsQuery, type ListJobsResponse } from "@midlyr/sdk-js";
import { CliInputError } from "../../domain/errors.js";
import { CommandName } from "../command-names.js";
import type { ParsedArgs } from "../parser.js";
import { Command, type CommandServices, type HelpEntry } from "./types.js";

const VALID_JOB_TYPES: ReadonlySet<string> = new Set(Object.values(JobType));

function isJobType(value: string): value is JobType {
  return VALID_JOB_TYPES.has(value);
}

export class ListJobsCommand extends Command<ListJobsQuery, ListJobsResponse> {
  readonly name = CommandName.LIST_JOBS;
  readonly help: HelpEntry = {
    label: "list-jobs",
    summary: "List historical jobs for the current team",
    details: `midlyr list-jobs [options]

List historical jobs for the current team. Returns slim summaries; use the
job id with the SDK or REST API to fetch full details.

Options:
  --job-type <type>       (repeatable) Filter by job type. Allowed values: screen_analysis.
  --start <iso>           ISO datetime lower bound (defaults to 30 days ago when omitted).
  --end <iso>             ISO datetime upper bound.
  --cursor <token>        Pagination cursor from a previous response.
  --limit <n>             Page size (1-200, default 50).

Endpoint: GET /api/v1/jobs
`,
  };

  parse(args: ParsedArgs): ListJobsQuery {
    const jobType = args.multiOption("job-type")?.map((t): JobType => {
      if (!isJobType(t)) {
        throw new CliInputError(
          `Invalid --job-type '${t}'. Must be one of: ${Object.values(JobType).join(", ")}.`,
        );
      }
      return t;
    });
    return {
      jobType,
      start: args.option("start"),
      end: args.option("end"),
      cursor: args.option("cursor"),
      limit: args.numberOption("limit"),
    };
  }

  execute(input: ListJobsQuery, services: CommandServices) {
    return services.jobs.list(input);
  }
}
