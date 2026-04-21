import type { StartScreenAnalysisBody } from "@midlyr/sdk-js";
import type { MidlyrClient } from "../sdk/midlyr-client.js";
import { CliInputError } from "./errors.js";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_SCREEN_ANALYSIS_TIMEOUT_MS,
  type ScreenAnalysisPollingService,
} from "./polling.js";

type ScreenAnalysisClient = Pick<MidlyrClient, "startScreenAnalysis">;

export type ScreenAnalysisLogger = (message: string) => void;

export interface ScreenAnalysisInput {
  body: StartScreenAnalysisBody;
  wait?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

const NOOP_LOGGER: ScreenAnalysisLogger = () => {};

export class ScreenAnalysisService {
  constructor(
    private readonly client: ScreenAnalysisClient,
    private readonly polling: ScreenAnalysisPollingService,
    private readonly log: ScreenAnalysisLogger = NOOP_LOGGER,
  ) {}

  async run(input: ScreenAnalysisInput) {
    const submitted = await this.client.startScreenAnalysis(input.body);
    if (input.wait === false) {
      return submitted;
    }

    if (!submitted.id) {
      throw new CliInputError("screen-analysis response did not include an id to poll.");
    }

    this.log(`Job submitted: ${submitted.id}`);
    this.log("Waiting for job to complete...");

    return this.polling.poll(submitted.id, {
      timeoutMs: input.timeoutMs ?? DEFAULT_SCREEN_ANALYSIS_TIMEOUT_MS,
      pollIntervalMs: input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    });
  }
}
