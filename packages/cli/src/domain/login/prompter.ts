import type { Prompter, PrompterDeps, ReadlineInterface } from "./types.js";

export function createPrompter(deps: PrompterDeps): Prompter {
  let rl: ReadlineInterface | null = null;
  let closed = false;

  function ensureInterface(): ReadlineInterface {
    if (closed) throw new Error("Prompter has been closed");
    if (rl === null) {
      rl = deps.readline.createInterface({
        input: deps.stdin,
        output: deps.stdout,
      });
    }
    return rl;
  }

  return {
    question(prompt: string): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        let iface: ReadlineInterface;
        try {
          iface = ensureInterface();
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
          return;
        }
        iface.question(prompt, (answer) => resolve(answer));
      });
    },
    close(): void {
      if (closed) return;
      closed = true;
      rl?.close();
      rl = null;
    },
  };
}
