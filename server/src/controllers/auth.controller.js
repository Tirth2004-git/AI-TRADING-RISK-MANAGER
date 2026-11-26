import env from '../config/env.js';
import {
  DEMO_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '../middleware/auth.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as authService from '../services/auth.service.js';

function getCookieOptions(expiresAt = null) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

function clearAuthCookies(res) {
  res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
  res.clearCookie(DEMO_COOKIE_NAME, getCookieOptions());
}

export async function postRegister(req, res) {
  const { user, session } = await authService.registerUser({
    ...req.body,
    userAgent: req.get('user-agent'),
  });
  res.clearCookie(DEMO_COOKIE_NAME, getCookieOptions());
  res.cookie(SESSION_COOKIE_NAME, session.rawToken, getCookieOptions(session.expiresAt));
  return sendSuccess(res, { user }, 201);
}

export async function postLogin(req, res) {
  const { user, session } = await authService.loginUser({
    ...req.body,
    userAgent: req.get('user-agent'),
  });
  res.clearCookie(DEMO_COOKIE_NAME, getCookieOptions());
  res.cookie(SESSION_COOKIE_NAME, session.rawToken, getCookieOptions(session.expiresAt));
  return sendSuccess(res, { user });
}

export async function postDemo(req, res) {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (rawToken) {
    await authService.logoutSession(rawToken);
  }
  res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions());
  res.cookie(
    DEMO_COOKIE_NAME,
    '1',
    getCookieOptions(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  return sendSuccess(res, {
    user: {
      _id: null,
      name: 'Demo Trader',
      email: 'demo@local',
      role: 'DEMO',
      emailVerified: true,
      isActive: true,
      isDemo: true,
    },
  });
}

export async function postLogout(req, res) {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (rawToken) {
    await authService.logoutSession(rawToken);
  }
  clearAuthCookies(res);
  return sendSuccess(res, { loggedOut: true });
}

export async function postLogoutAll(req, res) {
  if (!req.auth.isDemo && req.auth.userId) {
    await authService.logoutAllSessions(req.auth.userId);
  }
  clearAuthCookies(res);
  return sendSuccess(res, { loggedOutAll: true });
}

export async function getMe(req, res) {
  return sendSuccess(res, {
    user: authService.sanitizeUser(req.auth.user),
  });
}

export async function postVerifyEmail(req, res) {
  const user = await authService.verifyEmail(req.body.token);
  return sendSuccess(res, { user });
}

export async function postResendVerification(req, res) {
  const result = await authService.resendVerification(req.auth.userId);
  return sendSuccess(res, result);
}

export async function postForgotPassword(req, res) {
  const result = await authService.forgotPassword(req.body.email);
  return sendSuccess(res, result);
}

export async function postResetPassword(req, res) {
  const result = await authService.resetPassword(req.body);
  clearAuthCookies(res);
  return sendSuccess(res, result);
}

export async function postChangePassword(req, res) {
  const { changed, session } = await authService.changePassword(req.auth.userId, {
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    userAgent: req.get('user-agent'),
  });
  res.cookie(SESSION_COOKIE_NAME, session.rawToken, getCookieOptions(session.expiresAt));
  return sendSuccess(res, { changed });
}

export async function deleteAccount(req, res) {
  const result = await authService.deleteAccount(req.auth.userId, req.body);
  clearAuthCookies(res);
  return sendSuccess(res, result);
}
