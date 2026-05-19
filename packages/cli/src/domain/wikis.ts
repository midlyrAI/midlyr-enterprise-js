import type { ListRegulationWikisRequest } from "@midlyr/sdk-js";
import type { MidlyrClient } from "../sdk/midlyr-client.js";

type WikisClient = Pick<MidlyrClient, "browseWikis" | "getWiki">;

export class WikisService {
  constructor(private readonly client: WikisClient) {}

  browse(input: ListRegulationWikisRequest) {
    return this.client.browseWikis(input);
  }

  get(slug: string) {
    return this.client.getWiki(slug);
  }
}
