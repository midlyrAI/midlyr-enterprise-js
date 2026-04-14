export class CliInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliInputError";
  }
}

export class CliJobTimeoutError extends Error {
  readonly jobId: string;
  readonly timeoutMs: number;

  constructor(jobId: string, timeoutMs: number) {
    super(`screen-analysis timed out after ${timeoutMs}ms`);
    this.name = "CliJobTimeoutError";
    this.jobId = jobId;
    this.timeoutMs = timeoutMs;
  }
}

export class CliInterruptedError extends Error {
  readonly jobId?: string;

  constructor(jobId?: string) {
    super(jobId ? `screen-analysis interrupted; job id: ${jobId}` : "command interrupted");
    this.name = "CliInterruptedError";
    this.jobId = jobId;
  }
}
