import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import {
  IFieldIssue,
  ValidationError,
} from '@src/common/utils/errors';

// Map zod issues to field-level details.
function zodToIssues(err: z.ZodError): IFieldIssue[] {
  return err.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

// Validate req.body with a zod schema; replaces it with the parsed
// (transformed) value and 400s with field details on failure.
export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      next();
    } else {
      next(new ValidationError(zodToIssues(result.error)));
    }
  };
}

// Validate req.params with a zod schema (e.g. uuid id's).
export function validateParams(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (result.success) {
      Object.assign(req.params, result.data);
      next();
    } else {
      next(new ValidationError(zodToIssues(result.error)));
    }
  };
}

// Validate req.query with a zod schema. Parsed values (incl. coercion of
// numeric query strings) are exposed on req.validatedQuery — Express 5's
// req.query is a re-parsing getter, so mutating it does not stick.
export function validateQuery(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (result.success) {
      req.validatedQuery = result.data as Record<string, unknown>;
      next();
    } else {
      next(new ValidationError(zodToIssues(result.error)));
    }
  };
}

export default { validateBody, validateParams, validateQuery };
