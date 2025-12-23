import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendWelcomeEmail, sendAdverseActionNotice } from '../../lib/email.js';
import { env } from '../../config/env.js';

// Mock nodemailer
vi.mock('nodemailer', () => {
  const mockSendMail = vi.fn(() => Promise.resolve({ messageId: 'test-id' }));
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: mockSendMail,
      })),
    },
  };
});

describe('Email Library', () => {
  beforeEach(() => {
    process.env.SMTP_FROM = 'test@example.com';
    process.env.APP_URL = 'http://localhost:3000';
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      await expect(
        sendWelcomeEmail(
          'user@example.com',
          'Test User',
          'password123',
          'Test Org'
        )
      ).resolves.not.toThrow();
    });

    it('should handle email errors gracefully', async () => {
      const nodemailer = await import('nodemailer');
      const mockTransport = nodemailer.default.createTransport();
      vi.spyOn(mockTransport, 'sendMail').mockRejectedValue(new Error('SMTP error'));

      // Should not throw even if email fails
      await expect(
        sendWelcomeEmail(
          'user@example.com',
          'Test User',
          'password123',
          'Test Org'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('sendAdverseActionNotice', () => {
    it('should send adverse action notice', async () => {
      const tenant = {
        id: 'tenant-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      const screeningRequest = {
        id: 'screening-id',
        externalRequestId: 'ext-123',
        status: 'DECLINED',
      };

      await expect(
        sendAdverseActionNotice(
          tenant as any,
          screeningRequest as any,
          'Test Org',
          ['Credit score too low', 'Income insufficient']
        )
      ).resolves.not.toThrow();
    });
  });
});

