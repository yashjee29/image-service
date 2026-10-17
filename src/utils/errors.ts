export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ModuleNotFoundError extends AppError {
  constructor(moduleId: string) {
    super(`Module '${moduleId}' not found in registry`, 404, 'MODULE_NOT_FOUND', { moduleId });
  }
}

export class TemplateNotFoundError extends AppError {
  constructor(templateName: string) {
    super(`Template '${templateName}' not found`, 500, 'TEMPLATE_NOT_FOUND', { templateName });
  }
}

export class AssetFetchError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'ASSET_FETCH_ERROR', details);
  }
}

export class RenderError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 500, 'RENDER_ERROR', details);
  }
}

export class QueueFullError extends AppError {
  constructor(message = 'Render queue is full; please try again later') {
    super(message, 503, 'QUEUE_FULL');
  }
}

export class RenderTimeoutError extends AppError {
  constructor(message = 'Render execution timed out') {
    super(message, 504, 'RENDER_TIMEOUT');
  }
}
