import type { ListJobsRequest } from "@midlyr/sdk-js";
import type { MidlyrClient } from "../sdk/midlyr-client.js";

type JobsClient = Pick<MidlyrClient, "listJobs" | "getJob">;

export class JobsService {
  constructor(private readonly client: JobsClient) {}

  list(input: ListJobsRequest) {
    return this.client.listJobs(input);
  }

  get(id: string) {
    return this.client.getJob(id);
  }
}
