import { describe, expect, it } from "vitest";
import { CliInputError } from "../../src/domain/errors.js";
import { parseArgs } from "../../src/cmd/parser.js";

describe("parseArgs", () => {
  it("parses commands, positionals, flags, repeated values, booleans, and -- terminator", () => {
    const args = parseArgs([
      "query-document",
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

    expect(args.command).toBe("query-document");
    expect(args.positionals).toEqual(["first", "--literal"]);
    expect(args.option("query")).toBe("hello world");
    expect(args.multiOption("document-id")).toEqual(["reg_1", "reg_2", "reg_3"]);
    expect(args.hasBoolean("no-wait")).toBe(true);
  });

  it("supports -h and rejects unknown short options", () => {
    expect(parseArgs(["-h"]).hasBoolean("h")).toBe(true);
    expect(() => parseArgs(["-x"])).toThrow(CliInputError);
  });
});
