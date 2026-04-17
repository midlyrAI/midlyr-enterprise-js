import { describe, expect, it } from "vitest";
import { commandNames, isCommandName } from "../../src/cmd/command-names.js";

describe("command names", () => {
  it("lists and recognizes the exact command surface", () => {
    expect(commandNames).toEqual([
      "browse-document",
      "read-document",
      "screen-analysis",
      "config",
      "login",
    ]);
    expect(isCommandName("screen-analysis")).toBe(true);
    expect(isCommandName("jobs")).toBe(false);
  });
});
