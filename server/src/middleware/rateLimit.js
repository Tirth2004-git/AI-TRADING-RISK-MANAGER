import rateLimit from 'express-rate-limit';

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      error: {
        message: 'Too many AI requests. Limit is 10 requests per minute.',
      },
    });
  },
});

export function createHeavyRouteLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        data: null,
        error: {
          message: 'Too many requests. Please wait a minute and try again.',
        },
      });
    },
  });
}

export const heavyRouteLimiter = createHeavyRouteLimiter();

export function createAuthRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        data: null,
        error: {
          message: 'Too many authentication attempts. Please try again later.',
        },
      });
    },
  });
}

export const authRateLimiter = createAuthRateLimiter();
