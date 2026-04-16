import type { McpHostId } from "./mcp-host-config.js";
import type { Prompter } from "./types.js";

export type PickerResult = McpHostId | "skip";

const CHOICES: Readonly<Record<string, PickerResult>> = {
  "1": "claude-desktop",
  "2": "claude-code",
  "3": "cursor",
  "4": "vscode",
  "5": "skip",
};

const PROMPT_TEXT =
  "Set up MCP for your AI tools?\n" +
  "\n" +
  "  1. Claude Desktop\n" +
  "  2. Claude Code\n" +
  "  3. Cursor\n" +
  "  4. VS Code\n" +
  "  5. Skip\n" +
  "\n" +
  "> ";

export async function runMcpPicker(
  prompter: Prompter,
  stdout: { write(chunk: string): unknown },
): Promise<PickerResult> {
  while (true) {
    const raw = await prompter.question(PROMPT_TEXT);
    const trimmed = raw.trim();
    const choice = CHOICES[trimmed];
    if (choice !== undefined) return choice;
    stdout.write(`Please choose 1-5.\n`);
  }
}
