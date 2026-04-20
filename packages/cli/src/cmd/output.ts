import { MidlyrAPIError, MidlyrError, MidlyrNetworkError } from "@midlyr/sdk";
import { CliInputError, CliInterruptedError, CliJobTimeoutError } from "../domain/errors.js";
import { LoginError } from "../domain/login/errors.js";

export type Writable = {
  write(chunk: string): unknown;
};

export function printJson(stdout: Writable, payload: unknown): void {
  stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

export function printError(stderr: Writable, error: unknown): void {
  stderr.write(`${JSON.stringify(toErrorPayload(error), null, 2)}\n`);
}

export function formatHelp(): string {
  return `midlyr — CLI for the Midlyr compliance and regulation REST API.

Usage:
  midlyr <command> [options]

Commands:
  browse-document
    List regulatory documents with optional filters.
    Options: --query <text>, --category <cat> (repeatable), --authority <name> (repeatable),
             --jurisdiction <code> (repeatable), --limit <n>, --cursor <token>.
    Returns a paginated list of document summaries (id, title, jurisdictions, updatedAt).
    Does NOT return content bodies — use read-document-content for that.
    Endpoint: GET /api/v1/regulations/.

  describe-document <id>
    Get metadata for one document by id — title, authorities, jurisdictions, description,
    table of contents, sourceUrl, totalBytes, updatedAt. Does NOT return the body text.
    Endpoint: GET /api/v1/regulations/:id.

  read-document-content <id>
    Get the full text body of a document by id. Long documents are returned in byte-range
    chunks; use --offset and --limit to page.
    Options: --offset <bytes>, --limit <bytes>.
    Returns text plus the same metadata block that describe-document returns.
    Endpoint: GET /api/v1/regulations/:id/content.

  screen-analysis
    Submit text for compliance screening and (by default) poll the resulting job until
    it succeeds or fails.
    Required: --scenario <type>, --text <content>.
    Scenarios: marketing_asset, dispute, debt_collection, complaint, generic.
    Optional: --timeout-ms <ms> (total poll budget), --poll-interval-ms <ms>,
              --no-wait (submit only, return the job id without polling).
    Returns the terminal job record (status, riskScore, findings) or a pending job when --no-wait.
    Endpoints: POST /api/v1/analysis/screen, GET /api/v1/jobs/:id.

  config set api-key <key>
    Save an API key to ~/.config/midlyr/credentials.json so subsequent commands can use it
    without setting MIDLYR_API_KEY. Prefer \`midlyr login\` for normal use.

  login
    Browser-based OAuth flow that provisions an API key and writes it to
    ~/.config/midlyr/credentials.json. No arguments.

Global options:
  --request-timeout-ms <ms>    Per-request HTTP timeout in milliseconds (default 30000).

Environment variables:
  MIDLYR_API_KEY               API key for authenticated requests. Falls back to the
                               credentials file written by login / config set api-key.

Output:
  On success, commands print a JSON object to stdout and exit 0.
  On failure, commands print a JSON object to stderr with fields
  { error: { code, message, ... } } and exit non-zero.
`;
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
