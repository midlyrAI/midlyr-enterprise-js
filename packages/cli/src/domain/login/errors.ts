export type LoginErrorCode =
  | "login_state_mismatch"
  | "login_timeout"
  | "login_callback_error"
  | "login_server_start_failed"
  | "login_session_start_failed"
  | "login_exchange_failed";

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
