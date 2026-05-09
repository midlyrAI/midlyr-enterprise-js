import type { CreateRiskAssessmentJobRequest } from "@midlyr/sdk-js";
import type { MidlyrClient } from "../sdk/midlyr-client.js";
import { CliInputError } from "./errors.js";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_RISK_ASSESSMENT_TIMEOUT_MS,
  type ScreenAnalysisPollingService,
} from "./polling.js";

type RiskAssessmentClient = Pick<MidlyrClient, "startRiskAssessment">;

export type RiskAssessmentLogger = (message: string) => void;

export interface RiskAssessmentInput {
  body: CreateRiskAssessmentJobRequest;
  wait?: boolean;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

const NOOP_LOGGER: RiskAssessmentLogger = () => {};

export class RiskAssessmentService {
  constructor(
    private readonly client: RiskAssessmentClient,
    private readonly polling: ScreenAnalysisPollingService,
    private readonly log: RiskAssessmentLogger = NOOP_LOGGER,
  ) {}

  async run(input: RiskAssessmentInput) {
    const submitted = await this.client.startRiskAssessment(input.body);
    if (input.wait === false) {
      return submitted;
    }

    if (!submitted.id) {
      throw new CliInputError("risk-assessment response did not include an id to poll.");
    }

    this.log(`Job submitted: ${submitted.id}`);
    this.log("Waiting for job to complete...");

    return this.polling.poll(submitted.id, {
      timeoutMs: input.timeoutMs ?? DEFAULT_RISK_ASSESSMENT_TIMEOUT_MS,
      pollIntervalMs: input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    });
  }
}
