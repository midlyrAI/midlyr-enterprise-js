import type { Midlyr, StartComplianceScreeningBody } from "@midlyr/sdk";
import { textResult, errorResult } from "../errors.js";
import { pollJob } from "../polling.js";

export async function screeningHandler(
  params: StartComplianceScreeningBody,
  client: Midlyr,
) {
  const screening = await client.analysis.startScreening(params);

  if (!screening.jobId) {
    return errorResult("Compliance screening service is not yet available.");
  }

  try {
    const { job, timedOut } = await pollJob(client, screening.jobId);

    if (timedOut) {
      return errorResult(
        `Screening timed out after 30 minutes. Job ID: ${screening.jobId}, status: ${job.status}. It may still complete — check back later.`,
      );
    }

    if (job.status === "failed") {
      return errorResult(`Screening failed: ${job.error?.message ?? "Unknown error"}`);
    }

    return textResult(job.result);
  } catch (error) {
    return errorResult(
      `Failed to poll screening status. Job ID: ${screening.jobId}. Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
