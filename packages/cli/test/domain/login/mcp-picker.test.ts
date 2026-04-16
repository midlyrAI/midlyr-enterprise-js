import { describe, expect, it } from "vitest";
import { runMcpPicker } from "../../../src/domain/login/mcp-picker.js";
import type { Prompter } from "../../../src/domain/login/types.js";

function scriptedPrompter(answers: string[]): Prompter {
  let i = 0;
  return {
    async question(_prompt: string): Promise<string> {
      const a = answers[i++];
      if (a === undefined) throw new Error("Prompter exhausted");
      return a;
    },
    close(): void {
      /* noop */
    },
  };
}

function stdoutSink(): { write(chunk: string): unknown; chunks: string[] } {
  const chunks: string[] = [];
  return {
    write(chunk: string) {
      chunks.push(chunk);
      return true;
    },
    chunks,
  };
}

describe("runMcpPicker", () => {
  it("maps \"1\" to claude-desktop", async () => {
    const result = await runMcpPicker(scriptedPrompter(["1"]), stdoutSink());
    expect(result).toBe("claude-desktop");
  });

  it("maps \"2\" to claude-code", async () => {
    const result = await runMcpPicker(scriptedPrompter(["2"]), stdoutSink());
    expect(result).toBe("claude-code");
  });

  it("maps \"3\" to cursor", async () => {
    const result = await runMcpPicker(scriptedPrompter(["3"]), stdoutSink());
    expect(result).toBe("cursor");
  });

  it("maps \"4\" to vscode", async () => {
    const result = await runMcpPicker(scriptedPrompter(["4"]), stdoutSink());
    expect(result).toBe("vscode");
  });

  it("maps \"5\" to skip", async () => {
    const result = await runMcpPicker(scriptedPrompter(["5"]), stdoutSink());
    expect(result).toBe("skip");
  });

  it("trims whitespace around the choice", async () => {
    const result = await runMcpPicker(
      scriptedPrompter(["  2 \n"]),
      stdoutSink(),
    );
    expect(result).toBe("claude-code");
  });

  it("re-prompts once on empty input and accepts the next valid choice", async () => {
    const sink = stdoutSink();
    const result = await runMcpPicker(scriptedPrompter(["", "3"]), sink);
    expect(result).toBe("cursor");
    expect(sink.chunks).toEqual(["Please choose 1-5.\n"]);
  });

  it("re-prompts repeatedly until a valid choice is given", async () => {
    const sink = stdoutSink();
    const result = await runMcpPicker(
      scriptedPrompter(["6", "abc", "5"]),
      sink,
    );
    expect(result).toBe("skip");
    expect(sink.chunks).toEqual([
      "Please choose 1-5.\n",
      "Please choose 1-5.\n",
    ]);
  });
});
