import type {
  BrowseRegulationsQuery,
  ReadRegulationContentQuery,
} from "@midlyr/sdk";
import type { MidlyrClient } from "../sdk/midlyr-client.js";

type DocumentsClient = Pick<MidlyrClient, "browseDocuments" | "readDocumentContent">;

export class DocumentsService {
  constructor(private readonly client: DocumentsClient) {}

  browse(input: BrowseRegulationsQuery) {
    return this.client.browseDocuments(input);
  }

  read(id: string, input: ReadRegulationContentQuery) {
    return this.client.readDocumentContent(id, input);
  }
}
