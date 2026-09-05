import { ApiError } from './errorHandler.js';

// In-memory token bucket rate limiter
const ipRequestMap = new Map();

/**
 * Creates a rate limiting middleware.
 * @param {number} maxAttempts - Maximum attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds (default: 15 minutes)
 */
export const rateLimit = ({ maxAttempts = 10, windowMs = 15 * 60 * 1000 } = {}) => {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    const record = ipRequestMap.get(ip) || { count: 0, firstAttemptTime: now };

    // Reset window if expired
    if (now - record.firstAttemptTime > windowMs) {
      record.count = 1;
      record.firstAttemptTime = now;
    } else {
      record.count += 1;
    }

    ipRequestMap.set(ip, record);

    if (record.count > maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.firstAttemptTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(new ApiError(429, 'TOO_MANY_REQUESTS', `Too many login attempts. Please try again in ${retryAfterSeconds} seconds.`));
    }

    next();
  };
};
