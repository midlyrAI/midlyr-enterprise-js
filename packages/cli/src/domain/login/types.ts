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
