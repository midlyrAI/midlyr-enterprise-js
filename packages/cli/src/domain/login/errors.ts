export const LoginErrorCode = {
  STATE_MISMATCH: "login_state_mismatch",
  TIMEOUT: "login_timeout",
  CALLBACK_ERROR: "login_callback_error",
  SERVER_START_FAILED: "login_server_start_failed",
  SESSION_START_FAILED: "login_session_start_failed",
  EXCHANGE_FAILED: "login_exchange_failed",
} as const;
export type LoginErrorCode = (typeof LoginErrorCode)[keyof typeof LoginErrorCode];

export class LoginError extends Error {
  readonly code: LoginErrorCode;
  readonly detail?: unknown;

  constructor(code: LoginErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = "LoginError";
    this.code = code;
    this.detail = detail;
  }
}
