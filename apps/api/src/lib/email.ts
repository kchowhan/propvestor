import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Create transporter - defaults to console logging if SMTP not configured
const createTransporter = () => {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 587,
      secure: env.SMTP_SECURE === 'true',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  // Development mode: log emails to console
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
};

const transporter = createTransporter();

/**
 * Generic email sending function
 */
export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> => {
  const mailOptions = {
    from: env.SMTP_FROM || 'noreply@propvestor.dev',
    to,
    subject,
    text,
    html: html || text,
  };

  try {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}`);
    } else {
      // Development mode: log to console
      console.log('\n=== EMAIL (Development Mode) ===');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Body (text):', text.substring(0, 200) + '...');
      console.log('================================\n');
    }
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, name: string, password: string, organizationName: string) => {
  const mailOptions = {
    from: env.SMTP_FROM || 'noreply@propvestor.dev',
    to: email,
    subject: `Welcome to ${organizationName} on PropVestor`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827;">Welcome to PropVestor!</h2>
        <p>Hi ${name},</p>
        <p>You've been added to <strong>${organizationName}</strong> on PropVestor.</p>
        <p>Your login credentials are:</p>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 8px 0;"><strong>Password:</strong> ${password}</p>
        </div>
        <p>Please log in at <a href="${env.APP_URL || 'http://localhost:3000'}/login">${env.APP_URL || 'http://localhost:3000'}/login</a> and change your password after first login.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This is an automated message. Please do not reply.</p>
      </div>
    `,
    text: `
Welcome to PropVestor!

Hi ${name},

You've been added to ${organizationName} on PropVestor.

Your login credentials are:
Email: ${email}
Password: ${password}

Please log in at ${env.APP_URL || 'http://localhost:3000'}/login and change your password after first login.

This is an automated message. Please do not reply.
    `,
  };

  try {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
    } else {
      // Development mode: log to console (with sensitive data redacted)
      // CodeQL: Redact passwords from logs to prevent exposure of sensitive data
      const redactedBody = mailOptions.text
        ? mailOptions.text.replace(/Password:.*$/gm, 'Password: [REDACTED]')
        : '';
      
      console.log('\n=== EMAIL (Development Mode) ===');
      console.log('To:', email);
      console.log('Subject:', mailOptions.subject);
      console.log('Body:', redactedBody);
      console.log('===============================\n');
    }
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw - email failure shouldn't block user creation
    return false;
  }
};

export interface AdverseActionData {
  applicantName: string;
  propertyAddress?: string;
  recommendation: 'DECLINED' | 'BORDERLINE';
  creditScore?: number;
  evictionHistory?: boolean;
  criminalHistory?: boolean;
  incomeVerified?: boolean;
  flags?: string[];
  reportPdfUrl?: string;
  organizationName: string;
  organizationContact?: string;
  rentspreeContactInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

/**
 * Send FCRA-compliant adverse action notice email
 */
export const sendAdverseActionNotice = async (
  email: string,
  data: AdverseActionData
): Promise<boolean> => {
  // Default RentSpree contact information (should be updated based on actual provider)
  const creditAgency = data.rentspreeContactInfo || {
    name: 'RentSpree / TransUnion',
    address: 'P.O. Box 2000, Chester, PA 19016',
    phone: '1-800-916-8800',
    email: 'support@rentspree.com',
  };

  // Build decision factors list
  const decisionFactors: string[] = [];
  if (data.creditScore !== undefined && data.creditScore < 600) {
    decisionFactors.push(`Credit score below threshold (${data.creditScore})`);
  }
  if (data.evictionHistory) {
    decisionFactors.push('Eviction history found');
  }
  if (data.criminalHistory) {
    decisionFactors.push('Criminal history found');
  }
  if (data.incomeVerified === false) {
    decisionFactors.push('Income verification failed');
  }
  if (data.flags && data.flags.length > 0) {
    decisionFactors.push(`Additional concerns: ${data.flags.join(', ')}`);
  }
  if (decisionFactors.length === 0) {
    decisionFactors.push('Information in screening report');
  }

  const recommendationText = data.recommendation === 'DECLINED' 
    ? 'has been denied' 
    : 'has been conditionally approved with additional requirements';

  const mailOptions = {
    from: env.SMTP_FROM || 'noreply@propvestor.dev',
    to: email,
    subject: 'Important Information About Your Rental Application',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Important Information About Your Rental Application
        </h2>
        
        <p>Dear ${data.applicantName},</p>
        
        <p>We regret to inform you that your rental application${data.propertyAddress ? ` for ${data.propertyAddress}` : ''} ${recommendationText} based on information contained in your tenant screening report.</p>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">Credit Reporting Agency Information</h3>
          <p style="margin: 8px 0;"><strong>${creditAgency.name}</strong></p>
          <p style="margin: 8px 0;">${creditAgency.address}</p>
          <p style="margin: 8px 0;">Phone: ${creditAgency.phone}</p>
          <p style="margin: 8px 0;">Email: ${creditAgency.email}</p>
          <p style="margin: 8px 0; font-size: 14px; color: #78350f;">
            <strong>Important:</strong> This agency did not make the decision to ${data.recommendation === 'DECLINED' ? 'deny' : 'conditionally approve'} your application and cannot explain why the decision was made.
          </p>
        </div>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">Your Rights Under the Fair Credit Reporting Act (FCRA)</h3>
          <p style="margin: 8px 0;">You have the right to:</p>
          <ol style="margin: 8px 0; padding-left: 20px;">
            <li>Obtain a free copy of your screening report within 60 days of this notice</li>
            <li>Dispute any inaccurate information in the report</li>
            <li>Request that the credit reporting agency investigate and correct any errors</li>
          </ol>
          <p style="margin: 16px 0 8px 0;">To obtain your free report or file a dispute, contact:</p>
          <p style="margin: 8px 0;"><strong>${creditAgency.name}</strong></p>
          <p style="margin: 8px 0;">Phone: ${creditAgency.phone}</p>
          <p style="margin: 8px 0;">Email: ${creditAgency.email}</p>
        </div>
        
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; margin: 20px 0;">
          <h3 style="color: #111827; margin-top: 0;">Decision Factors</h3>
          <p style="margin: 8px 0;">The specific factors that contributed to this decision include:</p>
          <ul style="margin: 8px 0; padding-left: 20px;">
            ${decisionFactors.map(factor => `<li>${factor}</li>`).join('')}
          </ul>
        </div>
        
        ${data.reportPdfUrl ? `
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>Your Screening Report</strong></p>
          <p style="margin: 8px 0;">You can access your full screening report at:</p>
          <p style="margin: 8px 0;"><a href="${data.reportPdfUrl}" style="color: #059669;">${data.reportPdfUrl}</a></p>
        </div>
        ` : ''}
        
        <p>If you have questions about this decision, please contact us at:</p>
        <p style="margin: 8px 0;"><strong>${data.organizationName}</strong></p>
        ${data.organizationContact ? `<p style="margin: 8px 0;">${data.organizationContact}</p>` : ''}
        
        <p style="margin-top: 24px;">Sincerely,</p>
        <p><strong>${data.organizationName}</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          This notice is provided in compliance with the Fair Credit Reporting Act (FCRA). 
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
    text: `
IMPORTANT INFORMATION ABOUT YOUR RENTAL APPLICATION

Dear ${data.applicantName},

We regret to inform you that your rental application${data.propertyAddress ? ` for ${data.propertyAddress}` : ''} ${recommendationText} based on information contained in your tenant screening report.

CREDIT REPORTING AGENCY INFORMATION

${creditAgency.name}
${creditAgency.address}
Phone: ${creditAgency.phone}
Email: ${creditAgency.email}

IMPORTANT: This agency did not make the decision to ${data.recommendation === 'DECLINED' ? 'deny' : 'conditionally approve'} your application and cannot explain why the decision was made.

YOUR RIGHTS UNDER THE FAIR CREDIT REPORTING ACT (FCRA)

You have the right to:
1. Obtain a free copy of your screening report within 60 days of this notice
2. Dispute any inaccurate information in the report
3. Request that the credit reporting agency investigate and correct any errors

To obtain your free report or file a dispute, contact:
${creditAgency.name}
Phone: ${creditAgency.phone}
Email: ${creditAgency.email}

DECISION FACTORS

The specific factors that contributed to this decision include:
${decisionFactors.map((factor, i) => `${i + 1}. ${factor}`).join('\n')}

${data.reportPdfUrl ? `\nYOUR SCREENING REPORT\n\nYou can access your full screening report at:\n${data.reportPdfUrl}\n` : ''}

If you have questions about this decision, please contact us at:
${data.organizationName}
${data.organizationContact || ''}

Sincerely,
${data.organizationName}

---
This notice is provided in compliance with the Fair Credit Reporting Act (FCRA).
This is an automated message. Please do not reply to this email.
    `,
  };

  try {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`Adverse action notice sent to ${email}`);
      return true;
    } else {
      // Development mode: log to console
      console.log('\n=== ADVERSE ACTION NOTICE (Development Mode) ===');
      console.log('To:', email);
      console.log('Subject:', mailOptions.subject);
      console.log('Body:', mailOptions.text);
      console.log('================================================\n');
      return true;
    }
  } catch (error) {
    console.error('Failed to send adverse action notice:', error);
    throw error; // Throw error so caller can handle it
  }
};

