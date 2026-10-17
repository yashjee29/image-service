import { AppError } from '../../utils/errors.js';

export class SvgRasterizationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(`SVG rasterization failed: ${message}`, 500, 'RASTERIZATION_ERROR', details);
  }
}
