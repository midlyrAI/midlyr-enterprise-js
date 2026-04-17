import { describe, expect, it } from "vitest";
import {
  MCP_HOSTS,
  MCP_SERVER_ENTRY,
  writeMidlyrToHost,
  type McpHostId,
} from "../../../src/domain/login/mcp-host-config.js";
import type { McpHostConfigFs, PlatformInfo } from "../../../src/domain/login/types.js";

interface RecordedCall {
  op: string;
  args: unknown[];
}

interface FsStubOptions {
  files?: Record<string, string>;
  readFileError?: { code: string; message?: string } | Error;
  renameErrors?: Array<{ code: string; message?: string } | null>;
  unlinkError?: { code: string; message?: string } | Error;
}

interface FsStub {
  fs: McpHostConfigFs;
  calls: RecordedCall[];
  files: Record<string, string>;
}

function createFsStub(opts: FsStubOptions = {}): FsStub {
  const calls: RecordedCall[] = [];
  const files: Record<string, string> = { ...(opts.files ?? {}) };
  const renameErrors = opts.renameErrors ? [...opts.renameErrors] : [];

  const makeError = (desc: { code: string; message?: string } | Error): Error => {
    if (desc instanceof Error) return desc;
    const e = new Error(desc.message ?? desc.code);
    (e as Error & { code?: string }).code = desc.code;
    return e;
  };

  const fs: McpHostConfigFs = {
    async readFile(path: string, encoding: BufferEncoding): Promise<string> {
      calls.push({ op: "readFile", args: [path, encoding] });
      if (opts.readFileError) {
        throw makeError(opts.readFileError);
      }
      if (path in files) {
        return files[path]!;
      }
      const err = new Error(`ENOENT: ${path}`);
      (err as Error & { code?: string }).code = "ENOENT";
      throw err;
    },
    async writeFile(
      path: string,
      data: string,
      options: { encoding: BufferEncoding; mode?: number },
    ): Promise<void> {
      calls.push({ op: "writeFile", args: [path, data, options] });
      files[path] = data;
    },
    async mkdir(path: string, options: { recursive: boolean }): Promise<unknown> {
      calls.push({ op: "mkdir", args: [path, options] });
      return undefined;
    },
    async rename(from: string, to: string): Promise<void> {
      calls.push({ op: "rename", args: [from, to] });
      const next = renameErrors.shift();
      if (next) {
        throw makeError(next);
      }
      if (from in files) {
        files[to] = files[from]!;
        delete files[from];
      }
    },
    async unlink(path: string): Promise<void> {
      calls.push({ op: "unlink", args: [path] });
      if (opts.unlinkError) {
        throw makeError(opts.unlinkError);
      }
      delete files[path];
    },
  };

  return { fs, calls, files };
}

function makePlatformInfo(overrides: Partial<PlatformInfo> = {}): PlatformInfo {
  return {
    os: "darwin",
    homedir: "/home/user",
    cwd: "/home/user/project",
    env: {},
    ...overrides,
  };
}

describe("MCP_HOSTS path resolution", () => {
  const cases: Array<{
    hostId: McpHostId;
    os: NodeJS.Platform;
    expected: string;
    env?: Record<string, string | undefined>;
  }> = [
    // claude-desktop
    {
      hostId: "claude-desktop",
      os: "darwin",
      expected: "/home/user/Library/Application Support/Claude/claude_desktop_config.json",
    },
    {
      hostId: "claude-desktop",
      os: "linux",
      expected: "/home/user/.config/Claude/claude_desktop_config.json",
    },
    {
      hostId: "claude-desktop",
      os: "win32",
      env: { APPDATA: "C:/Users/u/AppData/Roaming" },
      expected: "C:/Users/u/AppData/Roaming/Claude/claude_desktop_config.json",
    },
    // claude-code
    { hostId: "claude-code", os: "darwin", expected: "/home/user/.claude.json" },
    { hostId: "claude-code", os: "linux", expected: "/home/user/.claude.json" },
    { hostId: "claude-code", os: "win32", expected: "/home/user/.claude.json" },
    // cursor
    { hostId: "cursor", os: "darwin", expected: "/home/user/.cursor/mcp.json" },
    { hostId: "cursor", os: "linux", expected: "/home/user/.cursor/mcp.json" },
    { hostId: "cursor", os: "win32", expected: "/home/user/.cursor/mcp.json" },
    // vscode (user scope)
    {
      hostId: "vscode",
      os: "darwin",
      expected: "/home/user/Library/Application Support/Code/User/mcp.json",
    },
    { hostId: "vscode", os: "linux", expected: "/home/user/.config/Code/User/mcp.json" },
    {
      hostId: "vscode",
      os: "win32",
      env: { APPDATA: "C:/Users/u/AppData/Roaming" },
      expected: "C:/Users/u/AppData/Roaming/Code/User/mcp.json",
    },
  ];

  for (const { hostId, os, expected, env } of cases) {
    it(`resolves ${hostId} on ${os}`, () => {
      const pi = makePlatformInfo({ os, env: env ?? {} });
      expect(MCP_HOSTS[hostId].resolvePath(pi)).toBe(expected);
    });
  }

  it("falls back APPDATA to homedir on windows when env var missing", () => {
    const pi = makePlatformInfo({ os: "win32", env: {} });
    expect(MCP_HOSTS["claude-desktop"].resolvePath(pi)).toBe(
      "/home/user/AppData/Roaming/Claude/claude_desktop_config.json",
    );
  });
});

describe("VS Code resolves to user-scope mcp.json (not project-scope)", () => {
  const platforms: NodeJS.Platform[] = ["darwin", "linux", "win32"];
  for (const os of platforms) {
    it(`user-scope on ${os}`, () => {
      const pi = makePlatformInfo({
        os,
        env: os === "win32" ? { APPDATA: "C:/Users/u/AppData/Roaming" } : {},
      });
      const resolved = MCP_HOSTS.vscode.resolvePath(pi);
      expect(resolved).toContain("/Code/User/mcp.json");
      expect(resolved).not.toContain(".vscode/mcp.json");
    });
  }
});

describe("writeMidlyrToHost", () => {
  it("preserves other top-level and mcpServers entries while adding midlyr", async () => {
    const platformInfo = makePlatformInfo({ os: "darwin" });
    const target = MCP_HOSTS["claude-desktop"].resolvePath(platformInfo);
    const { fs, files } = createFsStub({
      files: {
        [target]: JSON.stringify({
          theme: "dark",
          mcpServers: { other: { url: "x" } },
        }),
      },
    });

    await writeMidlyrToHost("claude-desktop", "ml_new", { fs, platformInfo });

    const written = JSON.parse(files[target]!) as {
      theme: string;
      mcpServers: Record<string, unknown>;
    };
    expect(written.theme).toBe("dark");
    expect(written.mcpServers.other).toEqual({ url: "x" });
    expect(written.mcpServers.midlyr).toEqual(MCP_SERVER_ENTRY("ml_new"));
  });

  it("overwrites an existing midlyr entry without prompting", async () => {
    const platformInfo = makePlatformInfo({ os: "darwin" });
    const target = MCP_HOSTS["claude-desktop"].resolvePath(platformInfo);
    const { fs, files } = createFsStub({
      files: {
        [target]: JSON.stringify({
          mcpServers: {
            midlyr: { url: "old", headers: { "x-api-key": "ml_old" } },
          },
        }),
      },
    });

    await writeMidlyrToHost("claude-desktop", "ml_new", { fs, platformInfo });

    const written = JSON.parse(files[target]!) as {
      mcpServers: { midlyr: unknown };
    };
    expect(written.mcpServers.midlyr).toEqual(MCP_SERVER_ENTRY("ml_new"));
  });

  it("creates fresh config when target file is absent (ENOENT)", async () => {
    const platformInfo = makePlatformInfo({ os: "linux" });
    const target = MCP_HOSTS.cursor.resolvePath(platformInfo);
    const { fs, files } = createFsStub({});

    const result = await writeMidlyrToHost("cursor", "ml_key", { fs, platformInfo });

    expect(result.path).toBe(target);
    const written = JSON.parse(files[target]!) as {
      mcpServers: { midlyr: unknown };
    };
    expect(written).toEqual({ mcpServers: { midlyr: MCP_SERVER_ENTRY("ml_key") } });
  });

  it("calls mkdir with recursive:true on parent before writeFile", async () => {
    const platformInfo = makePlatformInfo({ os: "darwin" });
    const target = MCP_HOSTS["claude-desktop"].resolvePath(platformInfo);
    const parent = target.slice(0, target.lastIndexOf("/"));
    const { fs, calls } = createFsStub({});

    await writeMidlyrToHost("claude-desktop", "ml_key", { fs, platformInfo });

    const mkdirIdx = calls.findIndex((c) => c.op === "mkdir");
    const writeIdx = calls.findIndex((c) => c.op === "writeFile");
    expect(mkdirIdx).toBeGreaterThanOrEqual(0);
    expect(writeIdx).toBeGreaterThan(mkdirIdx);
    expect(calls[mkdirIdx]!.args).toEqual([parent, { recursive: true }]);
  });

  it("follows atomic write sequence: mkdir → readFile → writeFile(tmp) → rename on darwin", async () => {
    const platformInfo = makePlatformInfo({ os: "darwin" });
    const target = MCP_HOSTS["claude-desktop"].resolvePath(platformInfo);
    const tmp = `${target}.tmp`;
    const { fs, calls } = createFsStub({
      files: { [target]: JSON.stringify({ mcpServers: {} }) },
    });

    await writeMidlyrToHost("claude-desktop", "ml_key", { fs, platformInfo });

    const ops = calls.map((c) => c.op);
    expect(ops).toEqual(["mkdir", "readFile", "writeFile", "rename"]);
    const writeCall = calls.find((c) => c.op === "writeFile")!;
    expect(writeCall.args[0]).toBe(tmp);
    expect(writeCall.args[2]).toEqual({ encoding: "utf-8", mode: 0o600 });
    const renameCall = calls.find((c) => c.op === "rename")!;
    expect(renameCall.args).toEqual([tmp, target]);
  });

  it("on win32, retries via unlink+rename when rename rejects with EPERM", async () => {
    const platformInfo = makePlatformInfo({
      os: "win32",
      env: { APPDATA: "C:/Users/u/AppData/Roaming" },
    });
    const target = MCP_HOSTS["claude-desktop"].resolvePath(platformInfo);
    const tmp = `${target}.tmp`;
    const { fs, calls } = createFsStub({
      renameErrors: [{ code: "EPERM" }, null],
    });

    await writeMidlyrToHost("claude-desktop", "ml_key", { fs, platformInfo });

    const ops = calls.map((c) => c.op);
    expect(ops).toEqual([
      "mkdir",
      "readFile",
      "writeFile",
      "rename",
      "unlink",
      "rename",
    ]);
    const unlinkCall = calls.find((c) => c.op === "unlink")!;
    expect(unlinkCall.args).toEqual([target]);
    const renameCalls = calls.filter((c) => c.op === "rename");
    expect(renameCalls).toHaveLength(2);
    expect(renameCalls[1]!.args).toEqual([tmp, target]);
  });

  it("on win32, retries via unlink+rename when rename rejects with EBUSY", async () => {
    const platformInfo = makePlatformInfo({
      os: "win32",
      env: { APPDATA: "C:/Users/u/AppData/Roaming" },
    });
    const target = MCP_HOSTS["claude-desktop"].resolvePath(platformInfo);
    const { fs, calls } = createFsStub({
      renameErrors: [{ code: "EBUSY" }, null],
    });

    await writeMidlyrToHost("claude-desktop", "ml_key", { fs, platformInfo });

    const ops = calls.map((c) => c.op);
    expect(ops).toEqual([
      "mkdir",
      "readFile",
      "writeFile",
      "rename",
      "unlink",
      "rename",
    ]);
    const unlinkCall = calls.find((c) => c.op === "unlink")!;
    expect(unlinkCall.args).toEqual([target]);
  });

  it("on win32, does not call unlink when first rename succeeds", async () => {
    const platformInfo = makePlatformInfo({
      os: "win32",
      env: { APPDATA: "C:/Users/u/AppData/Roaming" },
    });
    const { fs, calls } = createFsStub({});

    await writeMidlyrToHost("claude-desktop", "ml_key", { fs, platformInfo });

    expect(calls.some((c) => c.op === "unlink")).toBe(false);
  });

  it("on darwin, does not use unlink fallback — rename error propagates", async () => {
    const platformInfo = makePlatformInfo({ os: "darwin" });
    const { fs, calls } = createFsStub({
      renameErrors: [{ code: "EPERM" }],
    });

    await expect(
      writeMidlyrToHost("claude-desktop", "ml_key", { fs, platformInfo }),
    ).rejects.toMatchObject({ code: "EPERM" });

    expect(calls.some((c) => c.op === "unlink")).toBe(false);
  });

  it("throws a descriptive error when existing config has malformed JSON", async () => {
    const platformInfo = makePlatformInfo({ os: "darwin" });
    const target = MCP_HOSTS["claude-desktop"].resolvePath(platformInfo);
    const { fs } = createFsStub({
      files: { [target]: "not json at all" },
    });

    await expect(
      writeMidlyrToHost("claude-desktop", "ml_key", { fs, platformInfo }),
    ).rejects.toThrow(/Malformed JSON/);
  });
});
