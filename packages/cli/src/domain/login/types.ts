export interface PlatformInfo {
  os: NodeJS.Platform;
  homedir: string;
  cwd: string;
  env: Record<string, string | undefined>;
}

// Narrow FS interface — these are the only ops MCP config writer needs.
export interface McpHostConfigFs {
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile(
    path: string,
    data: string,
    options: { encoding: BufferEncoding; mode?: number },
  ): Promise<void>;
  mkdir(path: string, options: { recursive: boolean }): Promise<unknown>;
  rename(from: string, to: string): Promise<void>;
  unlink(path: string): Promise<void>;
  access(path: string): Promise<void>;
}

// Browser opener
export interface BrowserOpener {
  open(url: string): Promise<void>;
}

// Minimal ChildProcess-like shape we need from spawn()
export interface BrowserChildProcess {
  on(event: "error", listener: (err: Error) => void): unknown;
  on(event: "spawn", listener: () => void): unknown;
  unref?(): void;
}

export interface BrowserSpawn {
  (
    command: string,
    args: readonly string[],
    options: { detached?: boolean; stdio?: "ignore"; shell?: boolean },
  ): BrowserChildProcess;
}

// Prompter — numbered-list readline picker, lazy init
export interface Prompter {
  question(prompt: string): Promise<string>;
  close(): void;
}

// Minimal readline-like surface we need from node:readline
export interface ReadlineInterface {
  question(query: string, callback: (answer: string) => void): void;
  close(): void;
}

export interface ReadlineFactory {
  createInterface(options: {
    input: NodeJS.ReadableStream;
    output: NodeJS.WritableStream;
  }): ReadlineInterface;
}

export interface PrompterDeps {
  readline: ReadlineFactory;
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
}
