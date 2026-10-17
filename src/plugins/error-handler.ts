import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function errorHandler(error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) {
  const reqId = request.requestId ?? 'unknown';

  if (error instanceof AppError) {
    request.log.warn({
      reqId,
      errCode: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    }, 'Operational error encountered');

    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  if (error instanceof ZodError) {
    request.log.warn({
      reqId,
      errCode: 'VALIDATION_ERROR',
      issues: error.issues,
    }, 'Validation error encountered');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: error.format(),
      },
    });
  }

  // Fastify schema/validation errors
  if ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'BAD_REQUEST',
        message: error.message,
      },
    });
  }

  // Unexpected internal errors: log stack trace internally, return clean error to caller
  request.log.error({
    reqId,
    err: error,
    message: error.message,
  }, 'Unhandled internal error encountered');

  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred while processing the image',
    },
  });
}
