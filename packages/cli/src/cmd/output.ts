import { DEFAULT_BASE_URL, MidlyrAPIError, MidlyrError, MidlyrNetworkError } from "@midlyr/sdk";
import { CliInputError, CliInterruptedError, CliJobTimeoutError } from "../domain/errors.js";
import { LoginError } from "../domain/login/errors.js";
import type { CommandName } from "./command-names.js";

export type Writable = {
  write(chunk: string): unknown;
};

export function printJson(stdout: Writable, payload: unknown): void {
  stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

export function printError(stderr: Writable, error: unknown): void {
  stderr.write(`${JSON.stringify(toErrorPayload(error), null, 2)}\n`);
}

export function formatHelp(commandNames: readonly CommandName[]): string {
  return `midlyr <command> [options]\n\nCommands:\n${commandNames.map((name) => `  ${name}`).join("\n")}\n\nConfig:\n  midlyr config set api-key <key>   Save API key to ~/.config/midlyr/credentials.json\n\nGlobal options:\n  --api-key <key>              Defaults to MIDLYR_API_KEY\n  --base-url <url>             Defaults to MIDLYR_BASE_URL or ${DEFAULT_BASE_URL}\n  --request-timeout-ms <ms>    Per-request HTTP timeout\n\nRun command output is JSON.\n`;
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
    return errorPayload(error.code ?? "api_error", error.message, {
      status: error.status,
      body: error.body,
    });
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
