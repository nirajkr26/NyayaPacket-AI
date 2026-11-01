export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST", details: any = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details: any = null) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", details: any = null) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Permission denied", code = "FORBIDDEN", details: any = null) {
    super(message, 403, code, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details: any = null) {
    super(message, 422, "VALIDATION_ERROR", details);
  }
}
