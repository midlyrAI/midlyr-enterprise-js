import type { BrowserOpener, BrowserSpawn, PlatformInfo } from "./types.js";

export interface BrowserOpenerDeps {
  spawn: BrowserSpawn;
  platformInfo: PlatformInfo;
}

export function createBrowserOpener(deps: BrowserOpenerDeps): BrowserOpener {
  return {
    async open(url: string): Promise<void> {
      const { command, args } = resolveCommand(deps.platformInfo.os, url);
      return new Promise<void>((resolve, reject) => {
        try {
          const child = deps.spawn(command, args, {
            detached: true,
            stdio: "ignore",
          });
          let settled = false;
          child.on("error", (err) => {
            if (!settled) {
              settled = true;
              reject(err);
            }
          });
          child.on("spawn", () => {
            if (!settled) {
              settled = true;
              child.unref?.();
              resolve();
            }
          });
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    },
  };
}

function resolveCommand(
  os: NodeJS.Platform,
  url: string,
): { command: string; args: readonly string[] } {
  if (os === "darwin") return { command: "open", args: [url] };
  if (os === "win32") return { command: "cmd", args: ["/c", "start", "", url] };
  // linux / freebsd / openbsd etc fall through to xdg-open
  return { command: "xdg-open", args: [url] };
}
