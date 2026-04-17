#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash, randomBytes as nodeRandomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { runCli } from "./cmd/run-cli.js";
import { createFileCredentialsStore } from "./domain/credentials.js";
import { createBrowserOpener } from "./domain/login/browser-opener.js";
import { createLocalhostServer } from "./domain/login/localhost-server.js";
import { createPrompter } from "./domain/login/prompter.js";
import type {
  BrowserChildProcess,
  HttpFactory,
  McpHostConfigFs,
  PlatformInfo,
  ReadlineInterface,
} from "./domain/login/types.js";

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  stdout: NodeJS.WritableStream & { write(chunk: string): unknown };
  stderr: NodeJS.WritableStream & { write(chunk: string): unknown };
  stdin: NodeJS.ReadableStream;
  exitCode?: number;
  platform: NodeJS.Platform;
  cwd(): string;
  on(signal: "SIGINT" | "SIGTERM", handler: () => void): void;
};

const credentialsStore = createFileCredentialsStore({ readFile, writeFile, mkdir }, homedir());

const platformInfo: PlatformInfo = {
  os: process.platform,
  homedir: homedir(),
  cwd: process.cwd(),
  env: { ...process.env },
};

const browserOpener = createBrowserOpener({
  spawn: (command, args, options) =>
    spawn(command, [...args], options) as unknown as BrowserChildProcess,
  platformInfo,
});

const localhostServer = createLocalhostServer({
  http: {
    createServer: (listener) => createServer(listener),
  } as HttpFactory,
});

const prompter = createPrompter({
  readline: {
    createInterface: (options) =>
      createInterface(options) as unknown as ReadlineInterface,
  },
  stdin: process.stdin,
  stdout: process.stdout,
});

const mcpHostConfigFs: McpHostConfigFs = {
  readFile: (p, enc) => readFile(p, enc),
  writeFile: (p, data, opts) => writeFile(p, data, opts),
  mkdir: (p, opts) => mkdir(p, opts),
  rename: (from, to) => rename(from, to),
  unlink: (p) => unlink(p),
};

const exitCode = await runCli(process.argv.slice(2), {
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  onSignal: (signal, handler) => process.on(signal, handler),
  credentialsStore,
  // LoginRuntime fields:
  browserOpener,
  localhostServer,
  prompter,
  mcpHostConfigFs,
  platformInfo,
  randomUUID,
  randomBytes: (size: number) => new Uint8Array(nodeRandomBytes(size)),
  sha256: (data: Uint8Array) =>
    new Uint8Array(createHash("sha256").update(data).digest()),
  setTimeout: (handler: () => void, ms: number) => globalThis.setTimeout(handler, ms),
  clearTimeout: (handle: ReturnType<typeof globalThis.setTimeout>) =>
    globalThis.clearTimeout(handle),
} as Parameters<typeof runCli>[1]);

process.exitCode = exitCode;
