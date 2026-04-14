import type { ErrorDetail } from "./common.js";

export type McpJobStatus = "pending" | "in_progress" | "completed" | "failed";

export interface McpJob {
  job_id: string;
  type: string;
  status: McpJobStatus;
  created_at: string;
  updated_at: string;
  result: unknown | null;
  error: ErrorDetail | null;
}
