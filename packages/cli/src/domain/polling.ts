import type { Job } from "@midlyr/sdk";
import type { MidlyrClient } from "../sdk/midlyr-client.js";
import { CliInterruptedError, CliJobTimeoutError } from "./errors.js";

type JobClient = Pick<MidlyrClient, "getJob">;

export type SignalName = "SIGINT" | "SIGTERM";
export type SignalHandler = () => void;

export interface PollingRuntime {
  now(): number;
  sleep(ms: number): Promise<void>;
  onSignal(signal: SignalName, handler: SignalHandler): void;
}

export interface PollingPolicy {
  timeoutMs: number;
  pollIntervalMs: number;
}

export const DEFAULT_SCREEN_ANALYSIS_TIMEOUT_MS = 300_000;
export const DEFAULT_POLL_INTERVAL_MS = 2_000;

export class ScreenAnalysisPollingService {
  constructor(
    private readonly client: JobClient,
    private readonly runtime: PollingRuntime,
  ) {}

  async poll(jobId: string, policy: PollingPolicy): Promise<Job> {
    const startedAt = this.runtime.now();
    let interrupted = false;
    this.runtime.onSignal("SIGINT", () => {
      interrupted = true;
    });
    this.runtime.onSignal("SIGTERM", () => {
      interrupted = true;
    });

    for (;;) {
      await this.runtime.sleep(policy.pollIntervalMs);

      if (interrupted) {
        throw new CliInterruptedError(jobId);
      }
      if (this.runtime.now() - startedAt >= policy.timeoutMs) {
        throw new CliJobTimeoutError(jobId, policy.timeoutMs);
      }

      const job = await this.client.getJob(jobId);
      if (job.status === "succeeded" || job.status === "failed") {
        return job;
      }
    }
  }
}
