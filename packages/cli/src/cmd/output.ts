import { MidlyrAPIError, MidlyrError, MidlyrNetworkError } from "@midlyr/sdk-js";
import { CliInputError, CliInterruptedError, CliJobTimeoutError } from "../domain/errors.js";
import { LoginError } from "../domain/login/errors.js";
import { ALL_HELP } from "./commands/index.js";

export type Writable = {
  write(chunk: string): unknown;
};

export function printJson(stdout: Writable, payload: unknown): void {
  stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

export function printError(stderr: Writable, error: unknown): void {
  stderr.write(`${JSON.stringify(toErrorPayload(error), null, 2)}\n`);
}


const GLOBAL_HELP_FOOTER = `Global options:
  --help, -h                  Show help.
  --version, -v               Print the CLI version.
  --request-timeout-ms <ms>    Per-request HTTP timeout in milliseconds (default 30000).

Environment variables:
  MIDLYR_API_KEY               API key for authenticated requests. Falls back to the
                               credentials file written by login / config set api-key.

Output:
  On success, commands print a JSON object to stdout and exit 0.
  On failure, commands print a JSON object to stderr with fields
  { error: { code, message, ... } } and exit non-zero.
`;

export function formatTopHelp(): string {
  const labelWidth = Math.max(...ALL_HELP.map((entry) => entry.help.label.length));
  const commandLines = ALL_HELP.map(
    (entry) => `  ${entry.help.label.padEnd(labelWidth)}  ${entry.help.summary}`,
  ).join("\n");

  return `midlyr — CLI for the Midlyr compliance and regulation REST API.

Usage:
  midlyr <command> [options]

Commands:
${commandLines}

Run 'midlyr <command> --help' for per-command options.

${GLOBAL_HELP_FOOTER}`;
}

export function formatCommandHelp(command: string): string | undefined {
  return ALL_HELP.find((candidate) => candidate.name === command)?.help.details;
}

export function toErrorPayload(error: unknown): Record<string, unknown> {
  if (error instanceof CliJobTimeoutError) {
    return errorPayload("screen_analysis_timeout", error.message, {
      job_id: error.jobId,
      timeout_ms: error.timeoutMs,
    });
  }

  if (error instanceof CliInterruptedError) {
    return errorPayload("interrupted", error.message, error.jobId ? { job_id: error.jobId } : {});
  }

  if (error instanceof CliInputError) {
    return errorPayload("cli_input_error", error.message);
  }

  if (error instanceof MidlyrAPIError) {
    return { error: unwrapServerError(error.body), status: error.status };
  }

  if (error instanceof LoginError) {
    return errorPayload(
      error.code,
      error.message,
      error.detail !== undefined ? { detail: error.detail } : {},
    );
  }

  if (error instanceof MidlyrNetworkError || error instanceof MidlyrError) {
    return errorPayload(error.name, error.message);
  }

  if (error instanceof Error) {
    return errorPayload(error.name, error.message);
  }

  return errorPayload("unknown_error", "Unknown error");
}

function errorPayload(
  code: string,
  message: string,
  extras: Record<string, unknown> = {},
): Record<string, unknown> {
  return { error: { code, message, ...extras } };
}

function unwrapServerError(body: unknown): unknown {
  if (body && typeof body === "object" && "error" in body) {
    return (body as { error: unknown }).error;
  }
  return body;
}
