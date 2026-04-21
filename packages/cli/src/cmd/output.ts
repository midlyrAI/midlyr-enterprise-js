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

interface HelpEntry {
  readonly command: string;
  readonly label: string;
  readonly summary: string;
  readonly details: string;
}

const HELP_ENTRIES: readonly HelpEntry[] = [
  {
    command: "browse-document",
    label: "browse-document",
    summary: "List regulatory documents with optional filters",
    details: `midlyr browse-document [options]

List regulatory documents with optional filters.

Options:
  --query <text>
  --category <cat>        (repeatable)
  --authority <name>      (repeatable)
  --jurisdiction <code>   (repeatable)
  --limit <n>
  --cursor <token>

Returns a paginated list of document summaries (id, title, jurisdictions, updatedAt).
Does NOT return content bodies — use read-document-content for that.

Endpoint: GET /api/v1/regulations/
`,
  },
  {
    command: "describe-document",
    label: "describe-document",
    summary: "Get metadata for one document by id",
    details: `midlyr describe-document <id>

Get metadata for one document by id — title, authorities, jurisdictions, description,
table of contents, sourceUrl, totalBytes, updatedAt. Does NOT return the body text.

Arguments:
  <id>                    Document id (or pass via --id).

Endpoint: GET /api/v1/regulations/:id
`,
  },
  {
    command: "read-document-content",
    label: "read-document-content",
    summary: "Get the full text body of a document by id",
    details: `midlyr read-document-content <id> [options]

Get the full text body of a document by id. Long documents are returned in byte-range
chunks; use --offset and --limit to page.

Arguments:
  <id>                    Document id (or pass via --id).

Options:
  --offset <bytes>
  --limit <bytes>

Returns text plus the same metadata block that describe-document returns.

Endpoint: GET /api/v1/regulations/:id/content
`,
  },
  {
    command: "screen-analysis",
    label: "screen-analysis",
    summary: "Submit text for compliance screening and poll the job",
    details: `midlyr screen-analysis --scenario <type> --text <content> [options]

Submit text for compliance screening and (by default) poll the resulting job until
it succeeds or fails.

Required:
  --scenario <type>       One of: marketing_asset, dispute, debt_collection, complaint, generic
  --text <content>        The text content to screen (positional args also accepted)

Optional:
  --timeout-ms <ms>       Total poll budget
  --poll-interval-ms <ms> Polling interval
  --no-wait               Submit only, return the job id without polling

Returns the terminal job record (status, riskScore, findings) or a pending job when --no-wait.

Endpoints: POST /api/v1/analysis/screen, GET /api/v1/jobs/:id
`,
  },
  {
    command: "login",
    label: "login",
    summary: "Browser-based OAuth to provision an API key",
    details: `midlyr login

Browser-based OAuth flow that provisions an API key and writes it to
~/.config/midlyr/credentials.json. No arguments.
`,
  },
  {
    command: "config",
    label: "config set api-key",
    summary: "Save an API key to ~/.config/midlyr/credentials.json",
    details: `midlyr config set api-key <key>

Save an API key to ~/.config/midlyr/credentials.json so subsequent commands can use it
without setting MIDLYR_API_KEY. Prefer \`midlyr login\` for normal use.
`,
  },
];

const GLOBAL_HELP_FOOTER = `Global options:
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
  const labelWidth = Math.max(...HELP_ENTRIES.map((entry) => entry.label.length));
  const commandLines = HELP_ENTRIES.map(
    (entry) => `  ${entry.label.padEnd(labelWidth)}  ${entry.summary}`,
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
  const entry = HELP_ENTRIES.find((candidate) => candidate.command === command);
  return entry?.details;
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
