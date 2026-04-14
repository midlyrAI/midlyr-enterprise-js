import type { ErrorDetail } from "./common.js";

export type McpJobStatus = "pending" | "in_progress" | "completed" | "failed";

export interface McpJob {
  jobId: string;
  type: string;
  status: McpJobStatus;
  createdAt: string;
  updatedAt: string;
  result: unknown | null;
  error: ErrorDetail | null;
}
