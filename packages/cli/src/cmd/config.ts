import { DEFAULT_BASE_URL } from "@midlyr/sdk";
import { CliInputError } from "../domain/errors.js";
import type { Credentials } from "../domain/credentials.js";
import type { ParsedArgs } from "./parser.js";

export interface CliConfig {
  apiKey: string;
  baseUrl: string;
  requestTimeoutMs?: number;
}

export function resolveCliConfig(
  args: ParsedArgs,
  env: Record<string, string | undefined>,
  credentials?: Credentials,
): CliConfig {
  const apiKey = env["MIDLYR_API_KEY"] ?? credentials?.apiKey;
  if (!apiKey) {
    throw new CliInputError(
      "Missing API key. Set MIDLYR_API_KEY, or run: midlyr login (or midlyr config set api-key <key>)",
    );
  }

  return {
    apiKey,
    baseUrl: env["MIDLYR_BASE_URL"] ?? DEFAULT_BASE_URL,
    requestTimeoutMs: args.numberOption("request-timeout-ms"),
  };
}
