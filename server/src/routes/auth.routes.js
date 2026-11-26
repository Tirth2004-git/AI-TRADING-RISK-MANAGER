import { Router } from 'express';
import validate from '../middleware/validate.js';
import { requireAuth, requireRegisteredUser } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';
import {
  deleteAccount,
  getMe,
  postChangePassword,
  postDemo,
  postForgotPassword,
  postLogin,
  postLogout,
  postLogoutAll,
  postRegister,
  postResendVerification,
  postResetPassword,
  postVerifyEmail,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), postRegister);
router.post('/login', authRateLimiter, validate(loginSchema), postLogin);
router.post('/demo', postDemo);
router.post('/logout', postLogout);
router.post('/logout-all', requireAuth, postLogoutAll);
router.get('/me', requireAuth, getMe);
router.post('/verify-email', validate(verifyEmailSchema), postVerifyEmail);
router.post(
  '/resend-verification',
  authRateLimiter,
  requireAuth,
  requireRegisteredUser,
  postResendVerification
);
router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  postForgotPassword
);
router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  postResetPassword
);
router.post(
  '/change-password',
  requireAuth,
  requireRegisteredUser,
  validate(changePasswordSchema),
  postChangePassword
);
router.delete(
  '/account',
  requireAuth,
  requireRegisteredUser,
  validate(deleteAccountSchema),
  deleteAccount
);

export default router;
