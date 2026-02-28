/**
 * All possible error codes for upload operations.
 * Error codes for the S3 upload SDK.
 */
export type UploadErrorCode =
  | "ROUTE_NOT_FOUND"
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_FILES"
  | "TOO_FEW_FILES"
  | "INPUT_VALIDATION_FAILED"
  | "MIDDLEWARE_ERROR"
  | "S3_ERROR"
  | "UPLOAD_EXPIRED"
  | "UPLOAD_FAILED"
  | "INTEGRITY_CHECK_FAILED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "RETRY_EXHAUSTED"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "NOT_FOUND";

const DEFAULT_STATUS_MAP: Record<UploadErrorCode, number> = {
  ROUTE_NOT_FOUND: 404,
  INVALID_FILE_TYPE: 400,
  FILE_TOO_LARGE: 400,
  TOO_MANY_FILES: 400,
  TOO_FEW_FILES: 400,
  INPUT_VALIDATION_FAILED: 400,
  MIDDLEWARE_ERROR: 500,
  S3_ERROR: 502,
  UPLOAD_EXPIRED: 410,
  UPLOAD_FAILED: 500,
  INTEGRITY_CHECK_FAILED: 422,
  INTERNAL_ERROR: 500,
  NETWORK_ERROR: 503,
  RATE_LIMITED: 429,
  RETRY_EXHAUSTED: 503,
  PERMISSION_DENIED: 403,
  CONFLICT: 409,
  NOT_FOUND: 404,
};

export interface ClientErrorShape {
  code: UploadErrorCode;
  message: string;
  status: number;
  retryable?: boolean;
  hint?: string;
  docsUrl?: string;
  causeCode?: string;
}

/**
 * Structured error for upload operations with an error code and HTTP status.
 */
export class UploadError extends Error {
  public readonly code: UploadErrorCode;
  public readonly status: number;
  public readonly retryable?: boolean;
  public readonly hint?: string;
  public readonly docsUrl?: string;
  public readonly causeCode?: string;

  constructor(opts: {
    code: UploadErrorCode;
    message: string;
    status?: number;
    retryable?: boolean;
    hint?: string;
    docsUrl?: string;
    causeCode?: string;
  }) {
    super(opts.message);
    this.name = "UploadError";
    this.code = opts.code;
    this.status = opts.status ?? DEFAULT_STATUS_MAP[opts.code];
    this.retryable = opts.retryable;
    this.hint = opts.hint;
    this.docsUrl = opts.docsUrl;
    this.causeCode = opts.causeCode;
  }
}

/**
 * Error originating from S3 operations, wrapping the original AWS error.
 */
export class S3Error extends Error {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = "S3Error";
    this.originalError = originalError;
  }
}
