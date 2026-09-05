import { Router } from 'express';
import { AuthService } from '../services/authService.js';
import { validateBody } from '../middlewares/validator.js';
import { loginSchema } from '../schemas/validationSchemas.js';
import { rateLimit } from '../middlewares/rateLimiter.js';

const router = Router();

// POST /api/auth/login with rate limiting (10 attempts per 15 minutes per IP)
router.post('/login', rateLimit({ maxAttempts: 5, windowMs: 15 * 60 * 1000 }), validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });
    return res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
