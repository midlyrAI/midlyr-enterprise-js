import { z } from "zod";

const DocumentCategoryEnum = z.enum([
  "statute",
  "regulation",
  "interagency-guidance",
  "agency-guidance",
  "examination-handbook",
  "interpretive-action",
  "enforcement-action",
  "supervisory-observation",
  "rating-framework",
  "sro-rule",
  "operating-circular",
]);

export const name = "browse_regulatory_library";

export const description =
  "Search and browse the regulatory document library. Returns summaries of matching regulations with pagination.";

export const schema = {
  query: z.string().optional().describe("Search query text"),
  category: z.array(DocumentCategoryEnum).optional().describe("Filter by document category"),
  authority: z.array(z.string()).optional().describe("Filter by issuing authority (e.g. OCC, FDIC)"),
  jurisdiction: z.array(z.string()).optional().describe("Filter by jurisdiction (e.g. federal, NY)"),
  cursor: z.string().optional().describe("Pagination cursor from a previous response"),
};
