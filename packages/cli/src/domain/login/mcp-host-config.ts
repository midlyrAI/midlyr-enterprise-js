import type { McpHostConfigFs, PlatformInfo } from "./types.js";

export type McpHostId = "claude-desktop" | "claude-code" | "cursor" | "vscode";

export interface McpHostDescriptor {
  id: McpHostId;
  label: string;
  resolvePath(platformInfo: PlatformInfo): string;
}

// Node's FS APIs accept forward slashes on all platforms (including Windows),
// so we use string concatenation with `/` rather than importing `node:path`
// to keep this domain module free of `node:*` imports.
function appDataDir(platformInfo: PlatformInfo): string {
  return platformInfo.env.APPDATA ?? `${platformInfo.homedir}/AppData/Roaming`;
}

export const MCP_HOSTS: Readonly<Record<McpHostId, McpHostDescriptor>> = {
  "claude-desktop": {
    id: "claude-desktop",
    label: "Claude Desktop",
    resolvePath(platformInfo: PlatformInfo): string {
      switch (platformInfo.os) {
        case "darwin":
          return `${platformInfo.homedir}/Library/Application Support/Claude/claude_desktop_config.json`;
        case "win32":
          return `${appDataDir(platformInfo)}/Claude/claude_desktop_config.json`;
        default:
          return `${platformInfo.homedir}/.config/Claude/claude_desktop_config.json`;
      }
    },
  },
  "claude-code": {
    id: "claude-code",
    label: "Claude Code",
    resolvePath(platformInfo: PlatformInfo): string {
      return `${platformInfo.homedir}/.claude.json`;
    },
  },
  cursor: {
    id: "cursor",
    label: "Cursor",
    resolvePath(platformInfo: PlatformInfo): string {
      return `${platformInfo.homedir}/.cursor/mcp.json`;
    },
  },
  vscode: {
    id: "vscode",
    label: "VS Code",
    resolvePath(platformInfo: PlatformInfo): string {
      switch (platformInfo.os) {
        case "darwin":
          return `${platformInfo.homedir}/Library/Application Support/Code/User/mcp.json`;
        case "win32":
          return `${appDataDir(platformInfo)}/Code/User/mcp.json`;
        default:
          return `${platformInfo.homedir}/.config/Code/User/mcp.json`;
      }
    },
  },
};

export const MCP_SERVER_ENTRY = (
  apiKey: string,
): { url: string; headers: { "x-api-key": string } } => ({
  url: "https://mcp.midlyr.com",
  headers: { "x-api-key": apiKey },
});

export interface McpHostConfigDeps {
  fs: McpHostConfigFs;
  platformInfo: PlatformInfo;
}

function isErrnoCode(err: unknown, code: string): boolean {
  return (
    !!err && typeof err === "object" && (err as { code?: string }).code === code
  );
}

function isEnoent(err: unknown): boolean {
  return isErrnoCode(err, "ENOENT");
}

function parentDirOf(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  if (idx <= 0) return filePath;
  return filePath.slice(0, idx);
}

export async function writeMidlyrToHost(
  hostId: McpHostId,
  apiKey: string,
  deps: McpHostConfigDeps,
): Promise<{ path: string }> {
  const { fs, platformInfo } = deps;
  const targetPath = MCP_HOSTS[hostId].resolvePath(platformInfo);
  const parentDir = parentDirOf(targetPath);

  await fs.mkdir(parentDir, { recursive: true });

  let current: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(targetPath, "utf-8");
    try {
      current = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(`Malformed JSON in MCP host config at ${targetPath}`);
    }
  } catch (err) {
    if (isEnoent(err)) {
      current = {};
    } else {
      throw err;
    }
  }

  const existingServers = current.mcpServers;
  const mcpServers: Record<string, unknown> =
    existingServers && typeof existingServers === "object" && !Array.isArray(existingServers)
      ? { ...(existingServers as Record<string, unknown>) }
      : {};
  mcpServers.midlyr = MCP_SERVER_ENTRY(apiKey);
  current.mcpServers = mcpServers;

  const body = `${JSON.stringify(current, null, 2)}\n`;
  const tmpPath = `${targetPath}.tmp`;

  await fs.writeFile(tmpPath, body, { encoding: "utf-8", mode: 0o600 });

  try {
    await fs.rename(tmpPath, targetPath);
  } catch (err) {
    const isWindows = platformInfo.os === "win32";
    const isRetryable = isErrnoCode(err, "EPERM") || isErrnoCode(err, "EBUSY");
    if (isWindows && isRetryable) {
      await fs.unlink(targetPath);
      await fs.rename(tmpPath, targetPath);
    } else {
      throw err;
    }
  }

  return { path: targetPath };
}
