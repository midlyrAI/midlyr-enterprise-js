# `@midlyr/cli`

Public MidLyr CLI for the regulation/compliance REST API.

The package depends on `@midlyr/sdk` through public package exports. Shared HTTP transport, request construction, and API types belong in `@midlyr/sdk`; this package owns command parsing, environment handling, JSON output, and CLI-specific polling behavior.

## Usage

```bash
MIDLYR_API_KEY=mlyr_... midlyr <command> [options]
```

Global options:

- `--request-timeout-ms <ms>`: per-request HTTP timeout.

The API key is resolved from `MIDLYR_API_KEY` or `~/.config/midlyr/credentials.json` (written by `midlyr login` or `midlyr config set api-key <key>`).

Command output is JSON. Errors are written to stderr as JSON and exit non-zero.

## Commands

### `browse-document`

```bash
midlyr browse-document --query "fair lending" --category regulation --authority CFPB --limit 25
```

Calls `GET /api/v1/regulations`.

Options: `--query`, repeatable `--category`, repeatable `--authority`, repeatable `--jurisdiction`, `--limit`, `--cursor`.

### `describe-document`

```bash
midlyr describe-document reg_123
midlyr describe-document --id reg_123
```

Calls `GET /api/v1/regulations/:id`. Returns metadata (title, jurisdictions, table of contents, etc.) without the full content body.

Options: positional document id or `--id`.

### `read-document-content`

```bash
midlyr read-document-content reg_123 --offset 0 --limit 4000
midlyr read-document-content --id reg_123
```

Calls `GET /api/v1/regulations/:id/content`. Returns the content body; use `describe-document` instead if you only need metadata.

Options: positional document id or `--id`, `--offset`, `--limit`.

### `screen-analysis`

```bash
midlyr screen-analysis \
  --scenario marketing_asset \
  --text "Get 0% APR for life!" \
  --timeout-ms 300000
```

Calls `POST /api/v1/analysis/screen`, then polls `GET /api/v1/jobs/:id` by default until the job is `succeeded` or `failed`.

Options:

- `--scenario <type>`: required. One of `marketing_asset`, `dispute`, `debt_collection`, `complaint`, `generic`.
- `--text <content>`: required. The text content to screen. Can also be passed as positional arguments.
- `--timeout-ms <ms>`: total polling timeout. Timeout errors preserve `job_id` in JSON stderr.
- `--poll-interval-ms <ms>`: polling interval.
- `--no-wait`: submit only; do not poll.

There is intentionally no public `jobs` command in v1.
