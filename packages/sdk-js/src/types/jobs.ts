import type { ErrorDetail, PaginationResult } from "./common.js";
import type { ScreenAnalysisJobResult } from "./analysis.js";

export type ScreenAnalysisJobType = "screen_analysis";

export type JobStatus = "running" | "succeeded" | "failed";

interface JobBase {
  id: string;
  type: ScreenAnalysisJobType;
  createdAt: string;
  updatedAt: string;
}

export interface JobSucceeded extends JobBase {
  status: "succeeded";
  result: ScreenAnalysisJobResult;
  error: null;
}

export interface JobRunning extends JobBase {
  status: "running";
  result: null;
  error: null;
}

export interface JobFailed extends JobBase {
  status: "failed";
  result: null;
  error: ErrorDetail;
}

export type Job = JobSucceeded | JobRunning | JobFailed;

/**
 * Job summary returned by `GET /api/v1/jobs`. Field naming follows the server's
 * list response, which differs from `Job` (`jobId` vs `id`, `jobType` vs `type`,
 * status enum uses `completed` instead of `succeeded`). Mirrored verbatim so
 * callers see what's on the wire.
 */
export type JobType =
  | "screen_analysis"
  | "regulation_recommendation"
  | "context_generation"
  | "regulation_discovery";

export type JobListStatus = "running" | "completed" | "failed";

export type JobTriggerType = "manual" | "automatic";

export interface JobSummary {
  jobId: string;
  jobType: JobType;
  status: JobListStatus;
  triggerType: JobTriggerType;
  createdAt: string;
  updatedAt: string;
}

export interface ListJobsQuery {
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
