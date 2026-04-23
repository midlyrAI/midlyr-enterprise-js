import { CliInputError } from "../domain/errors.js";

const VALUELESS_LONG_OPTIONS: ReadonlySet<string> = new Set(["help", "version"]);
const VALUELESS_SHORT_OPTIONS: ReadonlySet<string> = new Set(["h", "v"]);

export class ParsedArgs {
  constructor(
    readonly command: string | undefined,
    readonly positionals: readonly string[],
    private readonly options: ReadonlyMap<string, readonly string[]>,
    private readonly booleans: ReadonlySet<string>,
  ) {}

  hasBoolean(key: string): boolean {
    return this.booleans.has(key);
  }

  option(key: string): string | undefined {
    const values = this.options.get(key);
    return values?.[values.length - 1];
  }

  multiOption(key: string): string[] | undefined {
    const values = this.options.get(key);
    if (!values || values.length === 0) {
      return undefined;
    }

    return values.flatMap((value) => value.split(",").map((item) => item.trim())).filter(Boolean);
  }

  numberOption(key: string): number | undefined {
    const value = this.option(key);
    if (value === undefined) {
      return undefined;
    }

    return parseCliNumber(value, `--${key}`);
  }
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const options = new Map<string, string[]>();
  const booleans = new Set<string>();
  const positionals: string[] = [];
  let command: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;

    if (arg === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const flag = arg.slice(2);
      const equalsIndex = flag.indexOf("=");
      if (equalsIndex >= 0) {
        addOption(options, flag.slice(0, equalsIndex), flag.slice(equalsIndex + 1));
        continue;
      }

      if (VALUELESS_LONG_OPTIONS.has(flag)) {
        booleans.add(flag);
        continue;
      }

      if (flag.startsWith("no-")) {
        booleans.add(flag);
        continue;
      }

      const next = argv[index + 1];
      if (next && !next.startsWith("-")) {
        addOption(options, flag, next);
        index += 1;
      } else {
        booleans.add(flag);
      }
      continue;
    }

    if (arg.startsWith("-") && arg.length > 1) {
      const flag = arg.slice(1);
      if (VALUELESS_SHORT_OPTIONS.has(flag)) {
        booleans.add(flag);
        continue;
      }
      throw new CliInputError(`Unknown short option '-${flag}'.`);
    }

    if (!command) {
      command = arg;
      continue;
    }

    positionals.push(arg);
  }

  return new ParsedArgs(command, positionals, options, booleans);
}

export function parseCliNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CliInputError(`${label} must be a number.`);
  }
  return parsed;
}

function addOption(options: Map<string, string[]>, key: string, value: string): void {
  const normalized = key.trim();
  if (!normalized) {
    throw new CliInputError("Empty option name.");
  }

  const values = options.get(normalized) ?? [];
  values.push(value);
  options.set(normalized, values);
}
