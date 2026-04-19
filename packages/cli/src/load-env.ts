import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type CliEnv = "local" | "staging" | "production";

const ENVS = new Set<CliEnv>(["local", "staging", "production"]);

export function resolveCliEnv(env: Record<string, string | undefined>): CliEnv {
  const raw = env["MIDLYR_CLI_ENV"];
  if (raw && ENVS.has(raw as CliEnv)) return raw as CliEnv;
  return "production";
}

/**
 * Load `packages/cli/.env.<env>` (if present) and populate any MIDLYR_* keys
 * that are not already set in process.env. Dev-only convenience; the file is
 * gitignored and not shipped to published consumers.
 */
export function loadEnvFile(
  cliEnv: CliEnv,
  env: Record<string, string | undefined>,
  binUrl: string = import.meta.url,
): void {
  const packageRoot = join(dirname(fileURLToPath(binUrl)), "..");
  const path = join(packageRoot, `.env.${cliEnv}`);

  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return;
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!key.startsWith("MIDLYR_")) continue;
    if (env[key] !== undefined) continue;
    env[key] = value;
  }
}
