import type { Midlyr, ScreenAnalysisScenario } from "@midlyr/sdk";
import { textResult, errorResult } from "../errors.js";
import { pollJob } from "../polling.js";

export async function screeningHandler(
  params: { scenario: string; text: string },
  client: Midlyr,
) {
  const response = await client.analysis.screen({
    content: { type: "text", text: params.text },
    scenario: params.scenario as ScreenAnalysisScenario,
  });

  if (!response.id) {
    return errorResult("Screen analysis service is not yet available.");
  }

  try {
    const { job, timedOut } = await pollJob(client, response.id);

    if (timedOut) {
      return errorResult(
        `Screen analysis timed out after 30 minutes. Job ID: ${response.id}, status: ${job.status}. It may still complete — check back later.`,
      );
    }

    if (job.status === "failed") {
      return errorResult(`Screen analysis failed: ${job.error?.message ?? "Unknown error"}`);
    }

    return textResult(job.result);
  } catch (error) {
    return errorResult(
      `Failed to poll screen analysis status. Job ID: ${response.id}. Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
