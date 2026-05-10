import { describe, expect, it } from "vitest";
import { CliInputError } from "../../src/domain/errors.js";
import { parseArgs } from "../../src/cmd/parser.js";

describe("parseArgs", () => {
  it("parses two-token commands, positionals, flags, repeated values, booleans, and -- terminator", () => {
    const args = parseArgs([
      "regulations",
      "query",
      "first",
      "--query=hello world",
      "--document-id",
      "reg_1",
      "--document-id",
      "reg_2,reg_3",
      "--no-wait",
      "--",
      "--literal",
    ]);

    expect(args.command).toBe("regulations query");
    expect(args.positionals).toEqual(["first", "--literal"]);
    expect(args.option("query")).toBe("hello world");
    expect(args.multiOption("document-id")).toEqual(["reg_1", "reg_2", "reg_3"]);
    expect(args.hasBoolean("no-wait")).toBe(true);
  });

  it("falls back to single-token command for flat commands like config and login", () => {
    const configArgs = parseArgs(["config", "set", "api-key", "mlyr_x"]);
    expect(configArgs.command).toBe("config");
    expect(configArgs.positionals).toEqual(["set", "api-key", "mlyr_x"]);

    const loginArgs = parseArgs(["login"]);
    expect(loginArgs.command).toBe("login");
  });

  it("supports -h and rejects unknown short options", () => {
    expect(parseArgs(["-h"]).hasBoolean("h")).toBe(true);
    expect(parseArgs(["-v"]).hasBoolean("v")).toBe(true);
    expect(() => parseArgs(["-x"])).toThrow(CliInputError);
  });

  it("keeps valueless global flags from consuming the command", () => {
    const helpArgs = parseArgs(["--help", "analysis", "screen"]);
    expect(helpArgs.hasBoolean("help")).toBe(true);
    expect(helpArgs.command).toBe("analysis screen");

    const versionArgs = parseArgs(["--version", "regulations", "list"]);
    expect(versionArgs.hasBoolean("version")).toBe(true);
    expect(versionArgs.command).toBe("regulations list");
  });
});
