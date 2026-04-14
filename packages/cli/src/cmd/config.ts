import { DEFAULT_BASE_URL } from "@midlyr/sdk";
import { CliInputError } from "../domain/errors.js";
import type { ParsedArgs } from "./parser.js";

export interface CliConfig {
  apiKey: string;
  baseUrl: string;
  requestTimeoutMs?: number;
}

export function resolveCliConfig(
  args: ParsedArgs,
  env: Record<string, string | undefined>,
): CliConfig {
  const apiKey = args.option("api-key") ?? env["MIDLYR_API_KEY"];
  if (!apiKey) {
    throw new CliInputError("Missing API key. Set MIDLYR_API_KEY or pass --api-key.");
  }

  return {
    apiKey,
    baseUrl: args.option("base-url") ?? env["MIDLYR_BASE_URL"] ?? DEFAULT_BASE_URL,
    requestTimeoutMs: args.numberOption("request-timeout-ms"),
  };
}
