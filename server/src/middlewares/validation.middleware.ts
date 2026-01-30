import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ResponseFormatter } from '../utils/response.util';
import { formatValidationErrors } from './error.middleware';
import logger from '../config/logger.config';

/**
 * Validation result handler middleware
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
      userId: req.user?.userId,
    });

    ResponseFormatter.validationError(res, formattedErrors);
    return;
  }

  next();
};

/**
 * Validate request with custom validators
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    handleValidationErrors(req, res, next);
  };
};

/**
 * Sanitize request body fields
 */
export const sanitizeBody = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body) {
      next();
      return;
    }

    fields.forEach((field) => {
      if (typeof req.body[field] === 'string') {
        req.body[field] = req.body[field].trim();
      }
    });

    next();
  };
};

/**
 * Sanitize query parameters
 */
export const sanitizeQuery = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.query) {
      next();
      return;
    }

    fields.forEach((field) => {
      if (typeof req.query[field] === 'string') {
        req.query[field] = (req.query[field] as string).trim();
      }
    });

    next();
  };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const { page, limit } = req.query;

  if (page) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      ResponseFormatter.badRequest(res, 'Invalid page number');
      return;
    }
  }

  if (limit) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      ResponseFormatter.badRequest(res, 'Invalid limit (must be between 1 and 100)');
      return;
    }
  }

  next();
};

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];

    if (!value) {
      ResponseFormatter.badRequest(res, `${paramName} is required`);
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(value)) {
      ResponseFormatter.badRequest(res, `Invalid ${paramName} format`);
      return;
    }

    next();
  };
};

/**
 * Validate date range
 */
export const validateDateRange = (startDateField: string, endDateField: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startDate = req.query[startDateField] as string;
    const endDate = req.query[endDateField] as string;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        ResponseFormatter.badRequest(res, 'Invalid date format');
        return;
      }

      if (start > end) {
        ResponseFormatter.badRequest(res, 'Start date must be before end date');
        return;
      }
    }

    next();
  };
};

/**
 * Validate file upload
 */
export const validateFileUpload = (options: {
  required?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const file = req.file;

    if (options.required && !file) {
      ResponseFormatter.badRequest(res, 'File is required');
      return;
    }

    if (!file) {
      next();
      return;
    }

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      ResponseFormatter.badRequest(res, `File size exceeds limit of ${options.maxSize} bytes`);
      return;
    }

    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      ResponseFormatter.badRequest(res, `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
      return;
    }

    next();
  };
};

/**
 * Validate JSON body
 */
export const validateJSON = (req: Request, res: Response, next: NextFunction): void => {
  if (req.headers['content-type']?.includes('application/json')) {
    if (!req.body || Object.keys(req.body).length === 0) {
      ResponseFormatter.badRequest(res, 'Request body is required');
      return;
    }
  }

  next();
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missingFields: string[] = [];

    fields.forEach((field) => {
      if (!(field in req.body) || req.body[field] === undefined || req.body[field] === null) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      ResponseFormatter.badRequest(res, `Missing required fields: ${missingFields.join(', ')}`);
      return;
    }

    next();
  };
};

/**
 * Validate allowed fields (prevent extra fields)
 */
export const validateAllowedFields = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const bodyFields = Object.keys(req.body);
    const extraFields = bodyFields.filter((field) => !allowedFields.includes(field));

    if (extraFields.length > 0) {
      ResponseFormatter.badRequest(res, `Unexpected fields: ${extraFields.join(', ')}`);
      return;
    }

    next();
  };
};

/**
 * Validate enum value
 */
export const validateEnum = (field: string, allowedValues: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.body[field];

    if (value && !allowedValues.includes(value)) {
      ResponseFormatter.badRequest(
        res,
        `Invalid value for ${field}. Allowed values: ${allowedValues.join(', ')}`
      );
      return;
    }

    next();
  };
};

/**
 * Validate array field
 */
export const validateArray = (
  field: string,
  options: {
    minLength?: number;
    maxLength?: number;
    itemType?: 'string' | 'number' | 'object';
  } = {}
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.body[field];

    if (!value) {
      next();
      return;
    }

    if (!Array.isArray(value)) {
      ResponseFormatter.badRequest(res, `${field} must be an array`);
      return;
    }

    if (options.minLength !== undefined && value.length < options.minLength) {
      ResponseFormatter.badRequest(res, `${field} must have at least ${options.minLength} items`);
      return;
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      ResponseFormatter.badRequest(res, `${field} must have at most ${options.maxLength} items`);
      return;
    }

    if (options.itemType) {
      const invalidItems = value.filter((item) => typeof item !== options.itemType);
      if (invalidItems.length > 0) {
        ResponseFormatter.badRequest(res, `All items in ${field} must be of type ${options.itemType}`);
        return;
      }
    }

    next();
  };
};

/**
 * Combine multiple validation middlewares
 */
export const combineValidations = (...validations: Function[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const runValidation = (index: number): void => {
      if (index >= validations.length) {
        next();
        return;
      }

      validations[index](req, res, (err?: any) => {
        if (err) {
          next(err);
        } else if (!res.headersSent) {
          runValidation(index + 1);
        }
      });
    };

    runValidation(0);
  };
};

export default {
  handleValidationErrors,
  validate,
  sanitizeBody,
  sanitizeQuery,
  validatePagination,
  validateUUID,
  validateDateRange,
  validateFileUpload,
  validateJSON,
  validateRequiredFields,
  validateAllowedFields,
  validateEnum,
  validateArray,
  combineValidations,
};