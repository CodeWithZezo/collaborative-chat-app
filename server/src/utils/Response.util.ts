import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    path?: string;
    method?: string;
    requestId?: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ResponseFormatter {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        path: res.req?.path,
        method: res.req?.method,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send success response with pagination
   */
  static successWithPagination<T>(
    res: Response,
    data: T,
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        path: res.req?.path,
        method: res.req?.method,
      },
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    details?: unknown
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
      error: {
        code: errorCode || `ERROR_${statusCode}`,
        message,
        details,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        path: res.req?.path,
        method: res.req?.method,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(res: Response, data: T, message: string = 'Resource created successfully'): Response {
    return this.success(res, data, message, 201);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send bad request error (400)
   */
  static badRequest(res: Response, message: string = 'Bad request', details?: unknown): Response {
    return this.error(res, message, 400, 'BAD_REQUEST', details);
  }

  /**
   * Send unauthorized error (401)
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Send forbidden error (403)
   */
  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Send not found error (404)
   */
  static notFound(res: Response, message: string = 'Resource not found'): Response {
    return this.error(res, message, 404, 'NOT_FOUND');
  }

  /**
   * Send conflict error (409)
   */
  static conflict(res: Response, message: string = 'Resource already exists'): Response {
    return this.error(res, message, 409, 'CONFLICT');
  }

  /**
   * Send validation error (422)
   */
  static validationError(res: Response, errors: unknown): Response {
    return this.error(res, 'Validation failed', 422, 'VALIDATION_ERROR', errors);
  }

  /**
   * Send too many requests error (429)
   */
  static tooManyRequests(res: Response, message: string = 'Too many requests'): Response {
    return this.error(res, message, 429, 'TOO_MANY_REQUESTS');
  }

  /**
   * Send internal server error (500)
   */
  static internalError(res: Response, message: string = 'Internal server error'): Response {
    return this.error(res, message, 500, 'INTERNAL_ERROR');
  }

  /**
   * Send service unavailable error (503)
   */
  static serviceUnavailable(res: Response, message: string = 'Service unavailable'): Response {
    return this.error(res, message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// Export shorthand functions
export const {
  success,
  successWithPagination,
  error,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  tooManyRequests,
  internalError,
  serviceUnavailable,
} = ResponseFormatter;

export default ResponseFormatter;