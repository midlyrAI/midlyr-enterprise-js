import type {
  CallbackQuery,
  CallbackResponse,
  HttpFactory,
  HttpServerResponse,
  LocalhostServer,
  LocalhostServerHandle,
  LocalhostServerSession,
} from "./types.js";
import { LoginError } from "./errors.js";

export interface LocalhostServerDeps {
  http: HttpFactory;
}

export function createLocalhostServer(deps: LocalhostServerDeps): LocalhostServer {
  return {
    async listen(signal?: AbortSignal): Promise<LocalhostServerSession> {
      // State shared between the HTTP listener and the returned session
      let resolveFirstCallback!: (q: CallbackQuery) => void;
      let rejectFirstCallback!: (err: Error) => void;
      const firstCallback = new Promise<CallbackQuery>((resolve, reject) => {
        resolveFirstCallback = resolve;
        rejectFirstCallback = reject;
      });

      let pendingResponse: HttpServerResponse | null = null;
      let responded = false;
      let firstCallbackResolved = false;

      const listener = (req: { method?: string; url?: string }, res: HttpServerResponse) => {
        // Only accept GET /callback
        const url = req.url ?? "";
        if (req.method !== "GET" || !url.startsWith("/callback")) {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end("Not Found");
          return;
        }

        if (firstCallbackResolved) {
          // Subsequent callbacks after the first — 410 Gone
          res.writeHead(410, { "content-type": "text/plain; charset=utf-8" });
          res.end("Gone");
          return;
        }

        // Parse query — naive but sufficient; the path always starts with "/callback?..."
        const q = parseQuery(url);
        firstCallbackResolved = true;
        pendingResponse = res;
        resolveFirstCallback(q);
      };

      const server = deps.http.createServer(listener);

      // Start listening on 127.0.0.1:0 (OS-assigned port)
      const handle: LocalhostServerHandle = await new Promise<LocalhostServerHandle>((resolve, reject) => {
        // If the server listen call fails (port bind error), reject here.
        try {
          server.listen(0, "127.0.0.1", () => {
            const addr = server.address();
            if (addr === null || typeof addr === "string") {
              reject(new LoginError("login_server_start_failed", "Failed to determine localhost server port"));
              return;
            }
            resolve({
              port: addr.port,
              close: () =>
                new Promise<void>((resolveClose, rejectClose) => {
                  server.close((err) => {
                    if (err) rejectClose(err);
                    else resolveClose();
                  });
                }),
            });
          });
        } catch (err) {
          reject(new LoginError("login_server_start_failed", err instanceof Error ? err.message : String(err)));
        }
      });

      // Abort handling: if the signal fires, reject firstCallback and close server.
      if (signal) {
        if (signal.aborted) {
          rejectFirstCallback(signal.reason instanceof Error ? signal.reason : new Error("aborted"));
          await handle.close().catch(() => undefined);
        } else {
          signal.addEventListener(
            "abort",
            () => {
              rejectFirstCallback(signal.reason instanceof Error ? signal.reason : new Error("aborted"));
            },
            { once: true },
          );
        }
      }

      return {
        handle,
        firstCallback,
        respond: async (result: CallbackResponse) => {
          if (responded) return;
          responded = true;
          if (pendingResponse === null) {
            // Nothing to respond to — caller invoked respond before callback arrived.
            return;
          }
          const res = pendingResponse;
          pendingResponse = null;
          res.writeHead(result.status, { "content-type": "text/html; charset=utf-8" });
          res.end(result.body);
        },
      };
    },
  };
}

function parseQuery(url: string): CallbackQuery {
  const qIndex = url.indexOf("?");
  if (qIndex < 0) return {};
  const queryStr = url.slice(qIndex + 1);
  const out: CallbackQuery = {};
  for (const part of queryStr.split("&")) {
    if (part === "") continue;
    const eqIndex = part.indexOf("=");
    const key = eqIndex < 0 ? part : part.slice(0, eqIndex);
    const value = eqIndex < 0 ? "" : decodeURIComponent(part.slice(eqIndex + 1).replace(/\+/g, " "));
    const decodedKey = decodeURIComponent(key);
    if (
      decodedKey === "state" ||
      decodedKey === "sessionId" ||
      decodedKey === "result" ||
      decodedKey === "error"
    ) {
      out[decodedKey] = value;
    } else if (decodedKey === "authorizationCode") {
      out.authorizationCode = value.trim();
    }
  }
  return out;
}
