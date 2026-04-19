export interface PlatformInfo {
  os: NodeJS.Platform;
  homedir: string;
  cwd: string;
  env: Record<string, string | undefined>;
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

// Localhost callback server — two-step API
export interface CallbackQuery {
  state?: string;
  sessionId?: string;
  result?: string;
  error?: string;
  authorizationCode?: string;
}

export interface CallbackResponse {
  status: number;
  body: string;
}

export interface LocalhostServerHandle {
  port: number;
  close(): Promise<void>;
}

export interface LocalhostServerSession {
  handle: LocalhostServerHandle;
  firstCallback: Promise<CallbackQuery>;
  respond(result: CallbackResponse): Promise<void>;
}

export interface LocalhostServer {
  listen(signal?: AbortSignal): Promise<LocalhostServerSession>;
}

// Minimal HTTP interface wrapping node:http's createServer — test seam
export interface HttpIncomingRequest {
  method?: string;
  url?: string;
}

export interface HttpServerResponse {
  writeHead(statusCode: number, headers: Record<string, string>): void;
  end(data?: string): void;
}

export type HttpRequestListener = (req: HttpIncomingRequest, res: HttpServerResponse) => void;

export interface HttpServerLike {
  listen(port: number, hostname: string, callback: () => void): void;
  close(callback: (err?: Error) => void): void;
  address(): { port: number } | string | null;
}

export interface HttpFactory {
  createServer(listener: HttpRequestListener): HttpServerLike;
}
