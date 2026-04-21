export interface MidlyrResponseHeaders {
  [header: string]: string;
}

export class MidlyrError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class MidlyrAPIError extends MidlyrError {
  readonly status: number;
  readonly code?: string;
  readonly headers: MidlyrResponseHeaders;
  readonly body: unknown;

  constructor(params: {
    message: string;
    status: number;
    code?: string;
    headers: MidlyrResponseHeaders;
    body: unknown;
  }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    this.headers = params.headers;
    this.body = params.body;
  }
}

export class MidlyrNetworkError extends MidlyrError {
  readonly isTimeout: boolean;

  constructor(message: string, options: { cause: unknown; isTimeout?: boolean }) {
    super(message, { cause: options.cause });
    this.isTimeout = options.isTimeout ?? false;
  }
}
