#!/usr/bin/env node

import { runCli } from "./cmd/run-cli.js";

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  stdout: { write(chunk: string): unknown };
  stderr: { write(chunk: string): unknown };
  exitCode?: number;
  on(signal: "SIGINT" | "SIGTERM", handler: () => void): void;
};

const exitCode = await runCli(process.argv.slice(2), {
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
  onSignal: (signal, handler) => process.on(signal, handler),
});

process.exitCode = exitCode;
