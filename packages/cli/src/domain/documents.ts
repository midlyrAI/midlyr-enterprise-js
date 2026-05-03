import type {
  BrowseRegulationsQuery,
  QueryRegulationsBody,
  ReadRegulationContentQuery,
} from "@midlyr/sdk-js";
import type { MidlyrClient } from "../sdk/midlyr-client.js";

type DocumentsClient = Pick<
  MidlyrClient,
  "browseDocuments" | "getDocumentDetails" | "readDocumentContent" | "queryDocuments"
>;

export class DocumentsService {
  constructor(private readonly client: DocumentsClient) {}

  browse(input: BrowseRegulationsQuery) {
    return this.client.browseDocuments(input);
  }

  getDetails(id: string) {
    return this.client.getDocumentDetails(id);
  }

  readContent(id: string, input: ReadRegulationContentQuery) {
    return this.client.readDocumentContent(id, input);
  }

  query(input: QueryRegulationsBody) {
    return this.client.queryDocuments(input);
  }
}
