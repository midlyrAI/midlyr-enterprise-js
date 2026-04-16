import { z } from "zod";

export const name = "read_regulatory_document";

export const description =
  "Read the text content of a regulatory document. Supports byte-offset pagination for long documents. Use browse_regulatory_library to find IDs.";

export const schema = {
  id: z.string().describe("Document ID from browse results"),
  offset: z.number().int().min(0).optional().default(0).describe("Byte offset to start reading from"),
  limit: z.number().int().min(1).max(40_000).optional().default(40_000).describe("Max bytes to retrieve (max 40000)"),
};
