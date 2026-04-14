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
  annual_count: number;
  year: number;
}

export interface StartComplianceScreeningBody {
  institution_type: InstitutionType;
  institution_subtype?: string;
  total_assets?: number;
  transaction_volumes?: TransactionVolume[];
}

export interface StartComplianceScreeningResponse {
  job_id: string;
  status: ComplianceScreeningStatus;
  created_at: string;
}

export interface ScreeningResultRegulation {
  regulation_id: string;
  regulation_name: string;
  applies: boolean;
  confidence: number;
  reason: string;
}

export interface ScreeningResult {
  regulations: ScreeningResultRegulation[];
  total_applicable: number;
  total_evaluated: number;
}
