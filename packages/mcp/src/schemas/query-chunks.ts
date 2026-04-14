import { z } from "zod";

export const name = "query_regulatory_chunks";

export const description =
  "Semantic search across regulatory document chunks. Returns relevant passages ranked by score. (Preview — may return limited results.)";

export const schema = {
  query: z.string().min(1).max(2_000).describe("Semantic search query"),
  documentIds: z.array(z.string()).optional().describe("Restrict to specific document IDs"),
  category: z.array(z.string()).optional().describe("Filter by document category"),
  authority: z.array(z.string()).optional().describe("Filter by issuing authority"),
  limit: z.number().int().min(1).max(50).optional().default(10).describe("Max chunks (max 50)"),
};
