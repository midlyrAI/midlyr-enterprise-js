import { describe, expect, it } from "vitest";
import { CommandName, isCommandName } from "../../src/cmd/command-names.js";

describe("command names", () => {
  it("lists and recognizes the exact command surface", () => {
    expect(Object.values(CommandName)).toEqual([
      "browse-document",
      "describe-document",
      "read-document-content",
      "query-document",
      "screen-analysis",
      "list-jobs",
      "config",
      "login",
    ]);
    expect(isCommandName("screen-analysis")).toBe(true);
    expect(isCommandName("jobs")).toBe(false);
  });
});
