import { describe, expect, it } from "vitest";
import { DEFAULT_BASE_URL } from "@midlyr/sdk";
import { CliInputError } from "../../src/domain/errors.js";
import { resolveCliConfig } from "../../src/cmd/config.js";
import { parseArgs } from "../../src/cmd/parser.js";

describe("resolveCliConfig", () => {
  it("prefers explicit options over environment values", () => {
    const args = parseArgs([
      "browse-document",
      "--api-key",
      "explicit",
      "--base-url",
      "https://api.example.com",
      "--request-timeout-ms",
      "1234",
    ]);
    const config = resolveCliConfig(args, {
      MIDLYR_API_KEY: "env",
      MIDLYR_BASE_URL: "https://env.example.com",
    });

    expect(config).toEqual({
      apiKey: "explicit",
      baseUrl: "https://api.example.com",
      requestTimeoutMs: 1234,
    });
  });

  it("falls back to environment and SDK default base URL", () => {
    const args = parseArgs(["browse-document"]);
    const config = resolveCliConfig(args, { MIDLYR_API_KEY: "env" });

    expect(config.apiKey).toBe("env");
    expect(config.baseUrl).toBe(DEFAULT_BASE_URL);
  });

  it("throws a CLI input error when the API key is missing", () => {
    const args = parseArgs(["browse-document"]);
    expect(() => resolveCliConfig(args, {})).toThrow(CliInputError);
  });
});
