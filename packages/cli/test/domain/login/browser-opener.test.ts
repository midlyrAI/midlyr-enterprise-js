import { describe, expect, it } from "vitest";
import { createBrowserOpener } from "../../../src/domain/login/browser-opener.js";
import type {
  BrowserChildProcess,
  BrowserSpawn,
  PlatformInfo,
} from "../../../src/domain/login/types.js";

interface SpawnCall {
  command: string;
  args: readonly string[];
  options: { detached?: boolean; stdio?: "ignore"; shell?: boolean };
}

interface FakeChild extends BrowserChildProcess {
  trigger(event: "error", err: Error): void;
  trigger(event: "spawn"): void;
  unrefCalls: number;
}

interface SpawnStub {
  spawn: BrowserSpawn;
  calls: SpawnCall[];
  children: FakeChild[];
  // When set, spawn() throws synchronously.
  throwOn?: Error;
}

function createSpawnStub(opts: { throwOn?: Error } = {}): SpawnStub {
  const calls: SpawnCall[] = [];
  const children: FakeChild[] = [];

  const spawn: BrowserSpawn = (command, args, options) => {
    calls.push({ command, args, options });
    if (opts.throwOn) {
      throw opts.throwOn;
    }
    const errorListeners: Array<(err: Error) => void> = [];
    const spawnListeners: Array<() => void> = [];
    let unrefCalls = 0;
    const child: FakeChild = {
      on(event: "error" | "spawn", listener: (err?: Error) => void): unknown {
        if (event === "error") {
          errorListeners.push(listener as (err: Error) => void);
        } else {
          spawnListeners.push(listener as () => void);
        }
        return child;
      },
      unref() {
        unrefCalls++;
      },
      get unrefCalls() {
        return unrefCalls;
      },
      trigger(event: "error" | "spawn", err?: Error) {
        if (event === "error") {
          for (const l of errorListeners) l(err as Error);
        } else {
          for (const l of spawnListeners) l();
        }
      },
    } as FakeChild;
    children.push(child);
    return child;
  };

  return { spawn, calls, children, throwOn: opts.throwOn };
}

function makePlatformInfo(os: NodeJS.Platform): PlatformInfo {
  return { os, homedir: "/home/user", cwd: "/home/user/project", env: {} };
}

describe("createBrowserOpener", () => {
  it("uses `open` with [url] on darwin", async () => {
    const stub = createSpawnStub();
    const opener = createBrowserOpener({
      spawn: stub.spawn,
      platformInfo: makePlatformInfo("darwin"),
    });

    const url = "https://example.com/auth";
    const p = opener.open(url);
    // Let spawn return, then fire the 'spawn' event on next tick.
    queueMicrotask(() => stub.children[0]!.trigger("spawn"));
    await p;

    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0]!.command).toBe("open");
    expect(stub.calls[0]!.args).toEqual([url]);
    expect(stub.calls[0]!.options).toEqual({
      detached: true,
      stdio: "ignore",
    });
  });

  it("uses `xdg-open` with [url] on linux", async () => {
    const stub = createSpawnStub();
    const opener = createBrowserOpener({
      spawn: stub.spawn,
      platformInfo: makePlatformInfo("linux"),
    });

    const url = "https://example.com/auth";
    const p = opener.open(url);
    queueMicrotask(() => stub.children[0]!.trigger("spawn"));
    await p;

    expect(stub.calls[0]!.command).toBe("xdg-open");
    expect(stub.calls[0]!.args).toEqual([url]);
  });

  it('uses `cmd /c start "" url` on win32', async () => {
    const stub = createSpawnStub();
    const opener = createBrowserOpener({
      spawn: stub.spawn,
      platformInfo: makePlatformInfo("win32"),
    });

    const url = "https://example.com/auth";
    const p = opener.open(url);
    queueMicrotask(() => stub.children[0]!.trigger("spawn"));
    await p;

    expect(stub.calls[0]!.command).toBe("cmd");
    expect(stub.calls[0]!.args).toEqual(["/c", "start", "", url]);
  });

  it("resolves and calls unref() when the child emits `spawn`", async () => {
    const stub = createSpawnStub();
    const opener = createBrowserOpener({
      spawn: stub.spawn,
      platformInfo: makePlatformInfo("darwin"),
    });

    const p = opener.open("https://example.com");
    queueMicrotask(() => stub.children[0]!.trigger("spawn"));
    await expect(p).resolves.toBeUndefined();
    expect(stub.children[0]!.unrefCalls).toBe(1);
  });

  it("rejects when the child emits `error` before `spawn`", async () => {
    const stub = createSpawnStub();
    const opener = createBrowserOpener({
      spawn: stub.spawn,
      platformInfo: makePlatformInfo("linux"),
    });

    const err = new Error("boom");
    const p = opener.open("https://example.com");
    queueMicrotask(() => stub.children[0]!.trigger("error", err));
    await expect(p).rejects.toBe(err);
  });

  it("rejects when spawn throws synchronously", async () => {
    const err = new Error("cannot spawn");
    const stub = createSpawnStub({ throwOn: err });
    const opener = createBrowserOpener({
      spawn: stub.spawn,
      platformInfo: makePlatformInfo("darwin"),
    });

    await expect(opener.open("https://example.com")).rejects.toBe(err);
  });
});
