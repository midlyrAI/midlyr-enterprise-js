import type {
  BrowseRegulationsQuery,
  QueryRegulatoryChunksBody,
  ReadRegulationQuery,
} from "@midlyr/sdk";
import type { MidlyrClient } from "../sdk/midlyr-client.js";

type DocumentsClient = Pick<MidlyrClient, "browseDocuments" | "readDocument" | "queryDocument">;

export class DocumentsService {
  constructor(private readonly client: DocumentsClient) {}

  browse(input: BrowseRegulationsQuery) {
    return this.client.browseDocuments(input);
  }

  read(id: string, input: ReadRegulationQuery) {
    return this.client.readDocument(id, input);
  }

  query(input: QueryRegulatoryChunksBody) {
    return this.client.queryDocument(input);
  }
}
