export interface ErrorDetail {
  code: string;
  message: string;
}

export interface PaginationResult {
  next_cursor: string | null;
  has_more: boolean;
  approximate_total: number;
}
