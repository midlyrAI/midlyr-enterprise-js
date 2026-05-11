import type { ErrorDetail, PaginationResult } from "./common.js";
import type { RiskAssessmentResult, ScreenAnalysisResult } from "./analysis.js";

/**
 * Job types exposed by the public REST API. Server-internal types
 * (regulation_recommendation, context_generation, regulation_discovery) are
 * intentionally absent and are filtered out server-side.
 */
export const JobType = {
  SCREEN_ANALYSIS: "screen_analysis",
  RISK_ASSESSMENT: "risk_assessment",
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export type JobResult = ScreenAnalysisResult | RiskAssessmentResult;

export const JobStatus = {
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

interface JobBase {
  id: string;
  type: JobType;
  createdAt: string;
  updatedAt: string;
}

export interface JobSucceeded extends JobBase {
  status: typeof JobStatus.SUCCEEDED;
  result: JobResult;
  error: null;
}

export interface JobRunning extends JobBase {
  status: typeof JobStatus.RUNNING;
  result: null;
  error: null;
}

export interface JobFailed extends JobBase {
  status: typeof JobStatus.FAILED;
  result: null;
  error: ErrorDetail;
}

export type Job = JobSucceeded | JobRunning | JobFailed;

/**
 * Job summary returned by `GET /api/v1/jobs`. Field naming differs from `Job`
 * (`jobId` vs `id`, `jobType` vs `type`) — mirrored verbatim so callers see
 * what's on the wire. Status enum is now aligned with `JobStatus`.
 *
 * Only `screen_analysis` is exposed via the public REST API today; other server
 * job types are internal and intentionally absent from this SDK surface.
 */
export const JobTriggerType = {
  MANUAL: "manual",
  AUTOMATIC: "automatic",
} as const;
export type JobTriggerType = (typeof JobTriggerType)[keyof typeof JobTriggerType];

export interface JobSummary {
  jobId: string;
  jobType: JobType;
  status: JobStatus;
  triggerType: JobTriggerType;
  createdAt: string;
  updatedAt: string;
}

export interface ListJobsRequest {
  jobType?: JobType | JobType[];
  start?: string;
  end?: string;
  cursor?: string;
  limit?: number;
}

export interface ListJobsResponse {
  results: JobSummary[];
  pagination: PaginationResult;
}
