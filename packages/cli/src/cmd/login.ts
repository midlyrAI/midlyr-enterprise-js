import type { FetchLike } from "@midlyr/sdk";
import { DEFAULT_BASE_URL } from "@midlyr/sdk";
import type { CliRuntime } from "./run-cli.js";
import type { Writable } from "./output.js";
import { runLogin } from "../domain/login/login-service.js";
import { MCP_HOSTS, writeMidlyrToHost } from "../domain/login/mcp-host-config.js";
import type {
  BrowserOpener,
  LocalhostServer,
  McpHostConfigFs,
  PlatformInfo,
  Prompter,
} from "../domain/login/types.js";
import { runMcpPicker } from "../domain/login/mcp-picker.js";
import type { ParsedArgs } from "./parser.js";

const DEFAULT_APP_URL = "https://app.midlyr.com";

type SignalName = "SIGINT" | "SIGTERM";
type SignalHandler = () => void;

// LoginRuntime extends CliRuntime — narrow type used ONLY inside login.ts and bin.ts.
// CliRuntime itself does NOT add these fields.
export interface LoginRuntime extends CliRuntime {
  browserOpener: BrowserOpener;
  localhostServer: LocalhostServer;
  prompter: Prompter;
  mcpHostConfigFs: McpHostConfigFs;
  platformInfo: PlatformInfo;
  randomUUID: () => string;
  randomBytes: (size: number) => Uint8Array;
  sha256: (data: Uint8Array) => Uint8Array;
  setTimeout: (handler: () => void, ms: number) => ReturnType<typeof globalThis.setTimeout>;
  clearTimeout: (handle: ReturnType<typeof globalThis.setTimeout>) => void;
}

export async function runLoginCommand(
  runtime: LoginRuntime,
  _parsed: ParsedArgs,
): Promise<void> {
  const stdout: Writable = runtime.stdout ?? defaultStdout();
  const env = runtime.env ?? {};

  const apiBaseUrl = env["MIDLYR_BASE_URL"] ?? DEFAULT_BASE_URL;
  const appBaseUrl = env["MIDLYR_APP_URL"] ?? DEFAULT_APP_URL;
  const label = `cli-${new Date().toISOString().slice(0, 10)}`;

  if (!runtime.credentialsStore) {
    throw new Error("credentialsStore is required for login command");
  }

  const onSignal = (signal: SignalName, handler: SignalHandler): void => {
    runtime.onSignal?.(signal, handler);
  };

  stdout.write("Opening browser to authenticate...\n");

  const loginResult = await runLogin({
    localhostServer: runtime.localhostServer,
    browserOpener: runtime.browserOpener,
    credentialsStore: runtime.credentialsStore,
    fetch: runtime.fetch ?? (globalThis.fetch as FetchLike),
    randomUUID: runtime.randomUUID,
    randomBytes: runtime.randomBytes,
    sha256: runtime.sha256,
    setTimeout: runtime.setTimeout,
    clearTimeout: runtime.clearTimeout,
    onSignal,
    stdout,
    apiBaseUrl,
    appBaseUrl,
    label,
  });

  stdout.write("Authenticated\n");

  const picked = await runMcpPicker(runtime.prompter, stdout);
  if (picked !== "skip") {
    const result = await writeMidlyrToHost(picked, loginResult.apiKey, {
      fs: runtime.mcpHostConfigFs,
      platformInfo: runtime.platformInfo,
    });
    const hostLabel = MCP_HOSTS[picked].label;
    stdout.write(
      `Added Midlyr to ${hostLabel} config (${result.path}). Restart ${hostLabel} to activate.\n`,
    );
  }

  runtime.prompter.close();
}

function defaultStdout(): Writable {
  return { write: (chunk: string) => globalThis.console.log(chunk) };
}
