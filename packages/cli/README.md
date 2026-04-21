# `@midlyr/cli`

CLI for the MidLyr regulation/compliance REST API.

## Install

Requires Node.js >= 22. Install globally so the `midlyr` binary lands on your `PATH` (the `-g` flag is required):

```bash
npm install -g @midlyr/cli
pnpm add -g @midlyr/cli
bun add -g @midlyr/cli
yarn global add @midlyr/cli
```

Or run without installing:

```bash
npx @midlyr/cli <command>
bunx @midlyr/cli <command>
pnpm dlx @midlyr/cli <command>
```

If `midlyr: command not found` after `-g` install, your package manager's global bin dir isn't on `PATH` (check `npm prefix -g`/`/bin`, or run `bun setup` / `pnpm setup`). `npx @midlyr/cli` works as a fallback.

Uninstall: `npm uninstall -g @midlyr/cli` (or drop `-g` for a local install).

## Usage

```bash
midlyr login                   # one-time browser auth
midlyr <command> [options]
```

For CI/containers, set `MIDLYR_API_KEY=mlyr_...` instead (takes precedence over the stored credentials).

Output is JSON on stdout; errors are JSON on stderr with a non-zero exit code. Global option: `--request-timeout-ms <ms>`.

## Commands

Run `midlyr --help` to see all commands, or `midlyr <command> --help` for per-command options.

- `browse-document` — search regulations
- `describe-document` — fetch regulation metadata
- `read-document-content` — fetch regulation content body
- `screen-analysis` — submit text for compliance screening and poll until done

Example:

```bash
midlyr browse-document --query "fair lending" --authority CFPB --limit 25
```
