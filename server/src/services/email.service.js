import env from '../config/env.js';

async function sendViaResend({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Email provider error (${res.status})`);
  }
}

export async function sendVerificationEmail({ to, name, token }) {
  const verifyUrl = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  if (env.resendApiKey) {
    await sendViaResend({
      to,
      subject: 'Verify your AI Trading Risk Manager email',
      html: `<p>Hi ${name},</p><p>Verify your email by clicking <a href="${verifyUrl}">this link</a> (expires in 24 hours).</p>`,
    });
    return { delivered: true, provider: 'resend' };
  }

  if (env.nodeEnv === 'development') {
    console.info(`[DEV EMAIL] Verification link generated for ${to}: ${verifyUrl}`);
  }
  return { delivered: false, provider: 'dev-noop' };
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const resetUrl = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  if (env.resendApiKey) {
    await sendViaResend({
      to,
      subject: 'Reset your AI Trading Risk Manager password',
      html: `<p>Hi ${name},</p><p>Reset your password using <a href="${resetUrl}">this link</a> (expires in 1 hour).</p>`,
    });
    return { delivered: true, provider: 'resend' };
  }

  if (env.nodeEnv === 'development') {
    console.info(`[DEV EMAIL] Password reset link generated for ${to}: ${resetUrl}`);
  }
  return { delivered: false, provider: 'dev-noop' };
}
