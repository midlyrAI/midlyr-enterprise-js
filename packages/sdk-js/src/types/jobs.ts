import type { ErrorDetail, PaginationResult } from "./common.js";
import type { ScreenAnalysisJobResult } from "./analysis.js";

/**
 * Job types exposed by the public REST API. Server-internal types
 * (regulation_recommendation, context_generation, regulation_discovery) are
 * intentionally absent from this list and are filtered out server-side.
 */
export const JOB_TYPES = ["screen_analysis"] as const;
export type ScreenAnalysisJobType = (typeof JOB_TYPES)[number];

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
 *
 * Only `screen_analysis` is exposed via the public REST API today; other server
 * job types are internal and intentionally absent from this SDK surface.
 */
export type JobListStatus = "running" | "completed" | "failed";

export type JobTriggerType = "manual" | "automatic";

export interface JobSummary {
  jobId: string;
  jobType: ScreenAnalysisJobType;
  status: JobListStatus;
  triggerType: JobTriggerType;
  createdAt: string;
  updatedAt: string;
}

export interface ListJobsQuery {
  jobType?: ScreenAnalysisJobType | ScreenAnalysisJobType[];
  start?: string;
  end?: string;
  cursor?: string;
  limit?: number;
}

export interface ListJobsResponse {
  results: JobSummary[];
  pagination: PaginationResult;
}
