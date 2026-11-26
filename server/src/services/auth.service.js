import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import Settings from '../models/Settings.js';
import SymbolProfile from '../models/SymbolProfile.js';
import Trade from '../models/Trade.js';
import LedgerEntry from '../models/LedgerEntry.js';
import AuditLog from '../models/AuditLog.js';
import AiReview from '../models/AiReview.js';
import ApiError from '../utils/ApiError.js';
import { DEFAULT_SETTINGS } from '../risk/constants.js';
import { hashToken } from '../middleware/auth.js';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email.service.js';

const BCRYPT_ROUNDS = 12;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    isActive: Boolean(user.isActive),
    role: user.role,
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isDemo: Boolean(user.isDemo),
  };
}

async function createSessionForUser(userId, userAgent = '') {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);

  await Session.create({
    userId,
    tokenHash,
    expiresAt,
    userAgent: String(userAgent || '').slice(0, 300),
  });

  return { rawToken, expiresAt };
}

export async function registerUser({ name, email, password, userAgent = '' }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const rawVerifyToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    emailVerified: false,
    isActive: true,
    role: 'USER',
    lastLoginAt: new Date(),
    emailVerificationTokenHash: hashToken(rawVerifyToken),
    emailVerificationExpires: new Date(Date.now() + VERIFY_TTL_MS),
  });

  await Settings.create({ ...DEFAULT_SETTINGS, userId: user._id });

  try {
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: rawVerifyToken,
    });
  } catch {
    // Registration succeeds even if email provider is temporarily unavailable
  }

  const session = await createSessionForUser(user._id, userAgent);
  return {
    user: sanitizeUser(user.toObject()),
    session,
  };
}

export async function loginUser({ email, password, userAgent = '' }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const session = await createSessionForUser(user._id, userAgent);
  return {
    user: sanitizeUser(user.toObject()),
    session,
  };
}

export async function logoutSession(rawToken) {
  if (!rawToken) return;
  await Session.deleteOne({ tokenHash: hashToken(rawToken) });
}

export async function logoutAllSessions(userId) {
  await Session.deleteMany({ userId });
}

export async function verifyEmail(rawToken) {
  const tokenHash = hashToken(rawToken);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires');

  if (!user) {
    throw new ApiError(400, 'Verification link is invalid or has expired');
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  return sanitizeUser(user.toObject());
}

export async function resendVerification(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  if (user.emailVerified) {
    return { alreadyVerified: true };
  }

  const rawVerifyToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = hashToken(rawVerifyToken);
  user.emailVerificationExpires = new Date(Date.now() + VERIFY_TTL_MS);
  await user.save();

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: rawVerifyToken,
  });

  return { sent: true };
}

export async function forgotPassword(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, isActive: true });

  if (user) {
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawResetToken);
    user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token: rawResetToken,
      });
    } catch {
      // Do not reveal delivery errors or email existence
    }
  }

  return {
    message:
      'If an account with that email exists, a password reset link has been sent.',
  };
}

export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Password reset link is invalid or has expired');
  }

  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  // Invalidate all existing sessions after password reset
  await Session.deleteMany({ userId: user._id });

  return { reset: true };
}

export async function changePassword(userId, { currentPassword, newPassword, userAgent = '' }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();

  await Session.deleteMany({ userId: user._id });
  const session = await createSessionForUser(user._id, userAgent);

  return { changed: true, session };
}

export async function deleteAccount(userId, { password }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'Password is incorrect');
  }

  await Promise.all([
    Trade.deleteMany({ userId }),
    Settings.deleteMany({ userId }),
    SymbolProfile.deleteMany({ userId }),
    LedgerEntry.deleteMany({ userId }),
    AuditLog.deleteMany({ userId }),
    AiReview.deleteMany({ userId }),
    Session.deleteMany({ userId }),
    User.deleteOne({ _id: userId }),
  ]);

  return { deleted: true };
}
