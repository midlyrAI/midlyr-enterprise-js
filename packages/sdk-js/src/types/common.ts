export interface ErrorDetail {
  code: string;
  message: string;
}

export interface PaginationResult {
  nextCursor: string | null;
  hasMore: boolean;
  approximateTotal: number;
}
