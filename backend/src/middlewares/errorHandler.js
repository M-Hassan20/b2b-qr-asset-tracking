export class ApiError extends Error {
  constructor(statusCode, code, message, fields = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export const errorHandler = (err, req, res, next) => {
  // If already handled ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(Object.keys(err.fields || {}).length > 0 ? { fields: err.fields } : {})
      }
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource could not be found.'
      }
    });
  }

  // Handle JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid request format. Please check your data and try again.'
      }
    });
  }

  // Default internal server error
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.'
    }
  });
};
