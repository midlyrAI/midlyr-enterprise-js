export interface Credentials {
  apiKey?: string;
}

export interface CredentialsStore {
  read(): Promise<Credentials>;
  write(credentials: Credentials): Promise<void>;
  path(): string;
}

export interface CredentialsFs {
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile(path: string, data: string, options: { encoding: BufferEncoding; mode: number }): Promise<void>;
  mkdir(path: string, options: { recursive: boolean; mode: number }): Promise<unknown>;
}

export function createFileCredentialsStore(
  fs: CredentialsFs,
  homeDir: string,
  cliEnv: "local" | "staging" | "production" = "production",
): CredentialsStore {
  const configDir = `${homeDir}/.config/midlyr`;
  const fileName = cliEnv === "production" ? "credentials.json" : `credentials.${cliEnv}.json`;
  const filePath = `${configDir}/${fileName}`;

  return {
    async read(): Promise<Credentials> {
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        return JSON.parse(raw) as Credentials;
      } catch {
        return {};
      }
    },

    async write(credentials: Credentials): Promise<void> {
      await fs.mkdir(configDir, { recursive: true, mode: 0o700 });
      await fs.writeFile(filePath, JSON.stringify(credentials, null, 2) + "\n", {
        encoding: "utf-8",
        mode: 0o600,
      });
    },

    path(): string {
      return filePath;
    },
  };
}
