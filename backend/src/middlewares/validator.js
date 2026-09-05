import { ApiError } from './errorHandler.js';

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const fields = {};
    result.error.errors.forEach((err) => {
      const fieldPath = err.path.join('.') || 'body';
      fields[fieldPath] = err.message;
    });

    const firstMessage = result.error.errors[0]?.message || 'Input schema violation';
    return next(new ApiError(422, 'VALIDATION_ERROR', firstMessage, fields));
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const fields = {};
    result.error.errors.forEach((err) => {
      const fieldPath = err.path.join('.') || 'query';
      fields[fieldPath] = err.message;
    });
    const firstMessage = result.error.errors[0]?.message || 'Input schema violation';
    return next(new ApiError(422, 'VALIDATION_ERROR', firstMessage, fields));
  }
  req.query = result.data;
  next();
};

export const validateParamsAndQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse({ params: req.params, query: req.query });
  if (!result.success) {
    // If qrToken is malformed or not 64 hex characters, spec states return 404 NOT_FOUND directly (EC 02, EC 03)
    const hasTokenIssue = result.error.errors.some((err) => err.path.includes('qrToken'));
    if (hasTokenIssue) {
      return next(new ApiError(404, 'NOT_FOUND', 'Asset not found.'));
    }

    const fields = {};
    result.error.errors.forEach((err) => {
      const fieldPath = err.path.join('.');
      fields[fieldPath] = err.message;
    });
    return next(new ApiError(422, 'VALIDATION_ERROR', 'Input schema violation', fields));
  }
  req.params = result.data.params;
  req.query = result.data.query;
  next();
};
