export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "ERROR",
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Kayıt bulunamadı") {
    super(404, message, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(409, message, code);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Form yayınlanmaya hazır değil") {
    super(422, message, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(429, message, "TOO_MANY_REQUESTS");
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super(500, message, "INTERNAL_ERROR");
  }
}
