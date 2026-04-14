export type ComplianceScreeningStatus = "pending" | "in_progress" | "completed" | "failed";

export type InstitutionType =
  | "bank"
  | "credit_union"
  | "fintech"
  | "loan_servicer"
  | "mortgage_lender"
  | "other";

export type TransactionVolumeType =
  | "small_business_loans"
  | "consumer_loans"
  | "mortgage"
  | "credit_cards"
  | "commercial_loans"
  | "auto_loans"
  | "other";

export interface TransactionVolume {
  type: TransactionVolumeType;
  annualCount: number;
  year: number;
}

export interface StartComplianceScreeningBody {
  institutionType: InstitutionType;
  institutionSubtype?: string;
  totalAssets?: number;
  transactionVolumes?: TransactionVolume[];
}

export interface StartComplianceScreeningResponse {
  jobId: string;
  status: ComplianceScreeningStatus;
  createdAt: string;
}

export interface ScreeningResultRegulation {
  regulationId: string;
  regulationName: string;
  applies: boolean;
  confidence: number;
  reason: string;
}

export interface ScreeningResult {
  regulations: ScreeningResultRegulation[];
  totalApplicable: number;
  totalEvaluated: number;
}
