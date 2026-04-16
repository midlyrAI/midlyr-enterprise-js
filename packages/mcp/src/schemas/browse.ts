import { z } from "zod";

const DocumentCategoryEnum = z.enum([
  "statute",
  "regulation",
  "interagencyGuidance",
  "agencyGuidance",
  "examinationHandbook",
  "interpretiveAction",
  "sroRule",
]);

export const name = "browse_regulatory_library";

export const description =
  "Search and browse the regulatory document library. Returns summaries of matching regulations with pagination.";

export const schema = {
  query: z.string().optional().describe("Search query text"),
  category: z.array(DocumentCategoryEnum).optional().describe("Filter by document category"),
  authorities: z.array(z.string()).optional().describe("Filter by issuing authority (e.g. OCC, FDIC)"),
  jurisdictions: z.array(z.string()).optional().describe("Filter by jurisdiction (e.g. us-federal, us-state:ny)"),
  cursor: z.string().optional().describe("Pagination cursor from a previous response"),
};
