import type { FetchLike } from "@midlyr/sdk";
import { DocumentsService } from "../domain/documents.js";
import {
  ScreenAnalysisPollingService,
  type SignalHandler,
  type SignalName,
} from "../domain/polling.js";
import { ScreenAnalysisService } from "../domain/screen-analysis.js";
import { MidlyrClient } from "../sdk/midlyr-client.js";
import { commandNames } from "./command-names.js";
import { runCommand } from "./commands.js";
import { resolveCliConfig } from "./config.js";
import { formatHelp, printError, printJson, type Writable } from "./output.js";
import { parseArgs } from "./parser.js";

export type { Writable };

export interface CliRuntime {
  env?: Record<string, string | undefined>;
  stdout?: Writable;
  stderr?: Writable;
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onSignal?: (signal: SignalName, handler: SignalHandler) => void;
}

export async function runCli(argv: readonly string[], runtime: CliRuntime = {}): Promise<number> {
  const stdout = runtime.stdout ?? defaultStdout();
  const stderr = runtime.stderr ?? defaultStderr();

  try {
    const parsed = parseArgs(argv);

    if (!parsed.command || parsed.hasBoolean("help") || parsed.hasBoolean("h")) {
      stdout.write(formatHelp(commandNames));
      return 0;
    }

    const config = resolveCliConfig(parsed, runtime.env ?? {});
    const client = new MidlyrClient({ ...config, fetch: runtime.fetch });
    const polling = new ScreenAnalysisPollingService(client, {
      now: runtime.now ?? Date.now,
      sleep: runtime.sleep ?? defaultSleep,
      onSignal: (signal, handler) => runtime.onSignal?.(signal, handler),
    });
    const result = await runCommand(parsed.command, parsed, {
      documents: new DocumentsService(client),
      screenAnalysis: new ScreenAnalysisService(client, polling),
    });

    printJson(stdout, result);
    return result && typeof result === "object" && "status" in result && result.status === "failed"
      ? 1
      : 0;
  } catch (error) {
    printError(stderr, error);
    return 1;
  }
}

function defaultStdout(): Writable {
  return { write: (chunk: string) => globalThis.console.log(chunk) };
}

function defaultStderr(): Writable {
  return { write: (chunk: string) => globalThis.console.error(chunk) };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
