import { describe, expect, it } from "vitest";
import { CommandName, isCommandName } from "../../src/cmd/command-names.js";

describe("command names", () => {
  it("lists and recognizes the exact command surface", () => {
    expect(Object.values(CommandName)).toEqual([
      "regulations list",
      "regulations get",
      "regulations get-content",
      "regulations query",
      "analysis screen",
      "analysis risk",
      "events create",
      "jobs list",
      "config",
      "login",
    ]);
    expect(isCommandName("analysis screen")).toBe(true);
    expect(isCommandName("jobs")).toBe(false);
    expect(isCommandName("screen-analysis")).toBe(false);
  });
});
