import { describe, expect, it } from "vitest";
import { DEFAULT_BASE_URL } from "@midlyr/sdk-js";
import { CliInputError } from "../../src/domain/errors.js";
import { resolveCliConfig } from "../../src/cmd/config.js";
import { parseArgs } from "../../src/cmd/parser.js";

describe("resolveCliConfig", () => {
  it("uses env vars and --request-timeout-ms flag", () => {
    const args = parseArgs(["browse-document", "--request-timeout-ms", "1234"]);
    const config = resolveCliConfig(args, {
      MIDLYR_API_KEY: "env",
      MIDLYR_BASE_URL: "https://env.example.com",
    });

    expect(config).toEqual({
      apiKey: "env",
      baseUrl: "https://env.example.com",
      requestTimeoutMs: 1234,
    });
  });

  it("falls back to credentials file and SDK default base URL", () => {
    const args = parseArgs(["browse-document"]);
    const config = resolveCliConfig(args, {}, { apiKey: "from-file" });

    expect(config.apiKey).toBe("from-file");
    expect(config.baseUrl).toBe(DEFAULT_BASE_URL);
  });

  it("throws a CLI input error when the API key is missing", () => {
    const args = parseArgs(["browse-document"]);
    expect(() => resolveCliConfig(args, {})).toThrow(CliInputError);
  });
});
