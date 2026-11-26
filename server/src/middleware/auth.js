import crypto from 'node:crypto';
import Session from '../models/Session.js';
import ApiError from '../utils/ApiError.js';

export const SESSION_COOKIE_NAME = 'rm_session';
export const DEMO_COOKIE_NAME = 'rm_demo';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function requireAuth(req, _res, next) {
  try {
    const rawSession = req.cookies?.[SESSION_COOKIE_NAME];
    if (rawSession) {
      const tokenHash = hashToken(rawSession);
      const session = await Session.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() },
      })
        .populate('userId')
        .lean();

      if (!session || !session.userId) {
        return next(new ApiError(401, 'Session expired or invalid. Please sign in.'));
      }

      if (!session.userId.isActive) {
        return next(new ApiError(403, 'Account is deactivated.'));
      }

      req.auth = {
        userId: session.userId._id,
        user: session.userId,
        isDemo: false,
        sessionId: session._id,
      };
      return next();
    }

    if (req.cookies?.[DEMO_COOKIE_NAME] === '1') {
      req.auth = {
        userId: null,
        user: {
          _id: null,
          name: 'Demo Trader',
          email: 'demo@local',
          role: 'DEMO',
          emailVerified: true,
          isActive: true,
          isDemo: true,
        },
        isDemo: true,
        sessionId: null,
      };
      return next();
    }

    return next(new ApiError(401, 'Authentication required. Please sign in or continue as Demo.'));
  } catch (err) {
    return next(err);
  }
}

export function requireRegisteredUser(req, _res, next) {
  if (!req.auth || req.auth.isDemo || !req.auth.userId) {
    return next(
      new ApiError(
        403,
        'Demo account is read-only. Create a free account to save or modify data.'
      )
    );
  }
  return next();
}
