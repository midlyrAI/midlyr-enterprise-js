import { z } from "zod";

const InstitutionTypeEnum = z.enum([
  "bank",
  "credit_union",
  "fintech",
  "loan_servicer",
  "mortgage_lender",
  "other",
]);

const TransactionVolumeTypeEnum = z.enum([
  "small_business_loans",
  "consumer_loans",
  "mortgage",
  "credit_cards",
  "commercial_loans",
  "auto_loans",
  "other",
]);

export const name = "start_compliance_screening";

export const description =
  "Analyze which regulations apply to a financial institution based on type, size, and transaction volumes. Long-running (up to 30 min). (Preview.)";

export const schema = {
  institutionType: InstitutionTypeEnum.describe("Institution type"),
  institutionSubtype: z.string().optional().describe("Specific subtype"),
  totalAssets: z.number().optional().describe("Total assets in millions USD"),
  transactionVolumes: z
    .array(
      z.object({
        type: TransactionVolumeTypeEnum,
        annualCount: z.number().int().min(0).describe("Annual transaction count"),
        year: z.number().int().min(2020).max(2100).describe("Reporting year"),
      }),
    )
    .optional()
    .describe("Transaction volume data by type"),
};
