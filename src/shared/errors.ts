export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = 'ERROR',
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Kayıt bulunamadı') {
    super(404, message, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Kayıt başka bir işlem tarafından güncellendi') {
    super(409, message, 'REVISION_CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Gönderilen bilgiler geçersiz') {
    super(422, message, 'VALIDATION_ERROR');
  }
}
