import crypto from 'crypto';
import { prisma } from './prisma.js';
import { sendEmail } from './email.js';
import { env } from '../config/env.js';

/**
 * Generate a secure random token for email verification
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get verification token expiry (24 hours from now)
 */
export function getVerificationTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

/**
 * Send email verification email to user
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const frontendUrl = env.APP_URL || 'http://localhost:3000';
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
  
  const subject = 'Verify Your Email - PropVestor';
  const text = `
Hi ${name},

Welcome to PropVestor! Please verify your email address to complete your registration.

Click the link below to verify your email:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with PropVestor, please ignore this email.

Best regards,
The PropVestor Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                PropVestor
              </h1>
              <p style="margin: 8px 0 0 0; color: #e0f2fe; font-size: 14px; text-align: center;">
                AI-Powered Property & Investment Management
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
                Welcome, ${name}!
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Thanks for signing up for PropVestor. To complete your registration and start managing your properties, please verify your email address.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);">
                  Verify Email Address
                </a>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0 0; color: #0284c7; font-size: 14px; word-break: break-all;">
                ${verificationUrl}
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                  <strong>Note:</strong> This verification link will expire in 24 hours.
                </p>
                <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                  If you didn't create an account with PropVestor, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
                © ${new Date().getFullYear()} PropVestor. All rights reserved.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                AI-powered property and investment management for landlords and investors.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await sendEmail(email, subject, text, html);
}

/**
 * Verify email token and mark user as verified
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; message: string; userId?: string }> {
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    return { success: false, message: 'Invalid verification token.' };
  }

  if (user.emailVerified) {
    return { success: true, message: 'Email already verified.', userId: user.id };
  }

  if (user.emailVerificationTokenExpiry && user.emailVerificationTokenExpiry < new Date()) {
    return { success: false, message: 'Verification token has expired.' };
  }

  // Mark user as verified and clear the token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    },
  });

  return { success: true, message: 'Email verified successfully!', userId: user.id };
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { success: false, message: 'User not found.' };
  }

  if (user.emailVerified) {
    return { success: false, message: 'Email already verified.' };
  }

  const token = generateVerificationToken();
  const expiry = getVerificationTokenExpiry();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiry,
    },
  });

  await sendVerificationEmail(user.email, user.name, token);

  return { success: true, message: 'Verification email sent.' };
}

