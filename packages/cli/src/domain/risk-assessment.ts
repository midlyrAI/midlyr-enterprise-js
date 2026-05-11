import type { CreateRiskAssessmentJobRequest } from "@midlyr/sdk-js";
import type { MidlyrClient } from "../sdk/midlyr-client.js";

type RiskAssessmentClient = Pick<MidlyrClient, "assessRisk">;

export interface RiskAssessmentInput {
  body: CreateRiskAssessmentJobRequest;
}

export class RiskAssessmentService {
  constructor(private readonly client: RiskAssessmentClient) {}

  run(input: RiskAssessmentInput) {
    return this.client.assessRisk(input.body);
  }
}
