import { describe, expect, it, vi } from "vitest";
import { CliInterruptedError, CliJobTimeoutError } from "../../src/domain/errors.js";
import { ScreenAnalysisPollingService } from "../../src/domain/polling.js";
import type { MidlyrClient } from "../../src/sdk/midlyr-client.js";

function createClient(statuses: Array<"pending" | "in_progress" | "completed" | "failed">) {
  const getJob = vi.fn(async () => {
    const status = statuses.shift() ?? "completed";
    return {
      job_id: "job_1",
      type: "screening",
      status,
      created_at: "2026-04-14T00:00:00.000Z",
      updated_at: "2026-04-14T00:00:00.000Z",
      result: null,
      error: null,
    };
  });

  return { getJob } as Pick<MidlyrClient, "getJob">;
}

describe("ScreenAnalysisPollingService", () => {
  it("polls until completed", async () => {
    const client = createClient(["in_progress", "completed"]);
    let now = 0;
    const service = new ScreenAnalysisPollingService(client, {
      now: () => now,
      sleep: async () => {
        now += 10;
      },
      onSignal: vi.fn(),
    });

    const result = await service.poll("job_1", { timeoutMs: 100, pollIntervalMs: 10 });

    expect(result.status).toBe("completed");
    expect(client.getJob).toHaveBeenCalledTimes(2);
  });

  it("returns failed terminal jobs", async () => {
    const client = createClient(["failed"]);
    const service = new ScreenAnalysisPollingService(client, {
      now: () => 0,
      sleep: async () => undefined,
      onSignal: vi.fn(),
    });

    await expect(
      service.poll("job_1", { timeoutMs: 100, pollIntervalMs: 0 }),
    ).resolves.toMatchObject({
      status: "failed",
    });
  });

  it("preserves job id when timeout crosses during sleep before another poll", async () => {
    const client = createClient(["completed"]);
    let now = 0;
    const service = new ScreenAnalysisPollingService(client, {
      now: () => now,
      sleep: async () => {
        now = 101;
      },
      onSignal: vi.fn(),
    });

    await expect(
      service.poll("job_timeout", { timeoutMs: 100, pollIntervalMs: 10 }),
    ).rejects.toMatchObject({
      jobId: "job_timeout",
    } satisfies Partial<CliJobTimeoutError>);
    expect(client.getJob).not.toHaveBeenCalled();
  });

  it("preserves job id when interrupted", async () => {
    const client = createClient(["completed"]);
    let handler: (() => void) | undefined;
    const service = new ScreenAnalysisPollingService(client, {
      now: () => 0,
      sleep: async () => handler?.(),
      onSignal: (_signal, next) => {
        handler = next;
      },
    });

    await expect(
      service.poll("job_interrupt", { timeoutMs: 100, pollIntervalMs: 1 }),
    ).rejects.toMatchObject({
      jobId: "job_interrupt",
    } satisfies Partial<CliInterruptedError>);
    expect(client.getJob).not.toHaveBeenCalled();
  });
});
