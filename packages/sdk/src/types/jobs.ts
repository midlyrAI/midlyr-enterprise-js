import type { ErrorDetail } from "./common.js";
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
