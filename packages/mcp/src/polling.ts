import type { Midlyr, Job } from "@midlyr/sdk";

const BACKOFF_DELAYS = [2_000, 4_000, 8_000, 16_000, 30_000];
const MAX_DELAY = 30_000;
const MAX_TIMEOUT_MS = 30 * 60 * 1_000;
const MAX_CONSECUTIVE_ERRORS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PollResult {
  job: Job;
  timedOut: boolean;
}

export async function pollJob(client: Midlyr, jobId: string): Promise<PollResult> {
  const startTime = Date.now();
  let consecutiveErrors = 0;
  let i = 0;

  while (true) {
    const delay = BACKOFF_DELAYS[i] ?? MAX_DELAY;
    await sleep(delay);
    i++;

    try {
      const job = await client.jobs.get(jobId);
      consecutiveErrors = 0;

      if (job.status === "succeeded" || job.status === "failed") {
        return { job, timedOut: false };
      }

      if (Date.now() - startTime > MAX_TIMEOUT_MS) {
        return { job, timedOut: true };
      }
    } catch (error) {
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw error;
      }
    }
  }
}
