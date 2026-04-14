import type { StartComplianceScreeningBody } from "@midlyr/sdk";
import type { MidlyrClient } from "../sdk/midlyr-client.js";
import { CliInputError } from "./errors.js";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_SCREEN_ANALYSIS_TIMEOUT_MS,
  type ScreenAnalysisPollingService,
} from "./polling.js";

type ScreenAnalysisClient = Pick<MidlyrClient, "startScreenAnalysis">;

export interface ScreenAnalysisInput {
  body: StartComplianceScreeningBody;
  wait?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export class ScreenAnalysisService {
  constructor(
    private readonly client: ScreenAnalysisClient,
    private readonly polling: ScreenAnalysisPollingService,
  ) {}

  async run(input: ScreenAnalysisInput) {
    const submitted = await this.client.startScreenAnalysis(input.body);
    if (input.wait === false) {
      return submitted;
    }

    if (!submitted.job_id) {
      throw new CliInputError("screen-analysis response did not include a job_id to poll.");
    }

    return this.polling.poll(submitted.job_id, {
      timeoutMs: input.timeoutMs ?? DEFAULT_SCREEN_ANALYSIS_TIMEOUT_MS,
      pollIntervalMs: input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    });
  }
}
