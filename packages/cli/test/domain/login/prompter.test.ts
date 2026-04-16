import { describe, expect, it, vi } from "vitest";
import { createPrompter } from "../../../src/domain/login/prompter.js";
import type {
  PrompterDeps,
  ReadlineFactory,
  ReadlineInterface,
} from "../../../src/domain/login/types.js";

interface HarnessOptions {
  answers?: string[];
}

interface Harness {
  deps: PrompterDeps;
  createInterface: ReturnType<typeof vi.fn>;
  iface: ReadlineInterface & { closeCalls: number; questionCalls: string[] };
}

function createHarness(opts: HarnessOptions = {}): Harness {
  const answers = opts.answers ? [...opts.answers] : [];
  const questionCalls: string[] = [];
  let closeCalls = 0;

  const iface = {
    question(query: string, cb: (answer: string) => void): void {
      questionCalls.push(query);
      const a = answers.length > 0 ? answers.shift()! : "";
      cb(a);
    },
    close(): void {
      closeCalls++;
    },
    get closeCalls() {
      return closeCalls;
    },
    get questionCalls() {
      return questionCalls;
    },
  } as ReadlineInterface & { closeCalls: number; questionCalls: string[] };

  const createInterface = vi.fn(
    (_options: { input: NodeJS.ReadableStream; output: NodeJS.WritableStream }) => iface,
  );

  const readline: ReadlineFactory = {
    createInterface,
  };

  // Minimal NodeJS stream shapes — only identity is needed.
  const stdin = {} as NodeJS.ReadableStream;
  const stdout = {} as NodeJS.WritableStream;

  return {
    deps: { readline, stdin, stdout },
    createInterface,
    iface,
  };
}

describe("createPrompter", () => {
  it("does NOT call readline.createInterface on construction", () => {
    const h = createHarness();
    createPrompter(h.deps);
    expect(h.createInterface.mock.calls.length).toBe(0);
  });

  it("lazily creates the interface on first question() and reuses it", async () => {
    const h = createHarness({ answers: ["one", "two"] });
    const p = createPrompter(h.deps);

    await p.question("a? ");
    expect(h.createInterface.mock.calls.length).toBe(1);

    await p.question("b? ");
    expect(h.createInterface.mock.calls.length).toBe(1);
  });

  it("question(prompt) resolves with the callback answer", async () => {
    const h = createHarness({ answers: ["hello"] });
    const p = createPrompter(h.deps);

    const answer = await p.question("> ");
    expect(answer).toBe("hello");
    expect(h.iface.questionCalls).toEqual(["> "]);
  });

  it("close() calls iface.close() exactly once", async () => {
    const h = createHarness({ answers: ["x"] });
    const p = createPrompter(h.deps);

    await p.question("q? ");
    p.close();
    p.close();
    expect(h.iface.closeCalls).toBe(1);
  });

  it("close() is a no-op when no question() has ever run", () => {
    const h = createHarness();
    const p = createPrompter(h.deps);
    p.close();
    expect(h.createInterface.mock.calls.length).toBe(0);
    expect(h.iface.closeCalls).toBe(0);
  });

  it("question() after close() throws", async () => {
    const h = createHarness({ answers: ["x"] });
    const p = createPrompter(h.deps);
    await p.question("first? ");
    p.close();
    await expect(p.question("after? ")).rejects.toThrow(
      /Prompter has been closed/,
    );
  });
});
