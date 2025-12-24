import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import {
  mockStripeCustomers,
  mockStripeSetupIntents,
  mockStripePaymentMethods,
} from './setup/stripe-mock.js';
import Stripe from 'stripe';

describe('Payment Setup', () => {
  const app = createApp();
  let ownerToken: string;
  let managerToken: string;
  let organizationId: string;
  let ownerUserId: string;

  beforeEach(async () => {
    // Clean up test data
    await prisma.organizationMembership.deleteMany({
      where: {
        organization: {
          name: 'Payment Test Org',
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['payment-owner@example.com', 'payment-manager@example.com'],
        },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        name: 'Payment Test Org',
      },
    });

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Payment Test Org',
        slug: 'payment-test-org',
      },
    });
    organizationId = org.id;

    // Create owner user
    const passwordHash = await bcrypt.hash('password123', 10);
    const ownerUser = await prisma.user.create({
      data: {
        name: 'Owner User',
        email: 'payment-owner@example.com',
        passwordHash,
        emailVerified: true,
        memberships: {
          create: {
            organizationId: org.id,
            role: 'OWNER',
          },
        },
      },
    });
    ownerUserId = ownerUser.id;

    // Create manager user
    const managerUser = await prisma.user.create({
      data: {
        name: 'Manager User',
        email: 'payment-manager@example.com',
        passwordHash,
        emailVerified: true,
        memberships: {
          create: {
            organizationId: org.id,
            role: 'MANAGER',
          },
        },
      },
    });

    // Generate tokens
    ownerToken = jwt.sign(
      { userId: ownerUser.id, organizationId: org.id },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    managerToken = jwt.sign(
      { userId: managerUser.id, organizationId: org.id },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('POST /api/payment-setup/setup-intent', () => {
    it('should create setup intent for owner', async () => {
      const response = await request(app)
        .post('/api/payment-setup/setup-intent')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        clientSecret: expect.stringContaining('seti_'),
        customerId: expect.stringContaining('cus_'),
      });

      // Verify organization was updated with Stripe customer ID
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });
      expect(org?.stripeCustomerId).toBe('cus_test123');
    });

    it('should reject setup intent for non-owner', async () => {
      const response = await request(app)
        .post('/api/payment-setup/setup-intent')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatchObject({
        code: 'FORBIDDEN',
        message: expect.stringContaining('Only organization owners'),
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/api/payment-setup/setup-intent');

      expect(response.status).toBe(401);
    });

    it('should reuse existing Stripe customer', async () => {
      // Create setup intent once
      await request(app)
        .post('/api/payment-setup/setup-intent')
        .set('Authorization', `Bearer ${ownerToken}`);

      // Create setup intent again - should reuse customer
      const response = await request(app)
        .post('/api/payment-setup/setup-intent')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.customerId).toBe('cus_test123');
    });
  });

  describe('POST /api/payment-setup/confirm-setup', () => {
    beforeEach(async () => {
      // Create Stripe customer first
      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: 'cus_test123' },
      });
    });

    it('should confirm payment method setup for owner', async () => {
      const response = await request(app)
        .post('/api/payment-setup/confirm-setup')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ paymentMethodId: 'pm_test123' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('successfully'),
        organization: {
          id: organizationId,
          paymentMethodSetupComplete: true,
        },
      });

      // Verify organization was updated
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });
      expect(org?.defaultPaymentMethodId).toBe('pm_test123');
      expect(org?.paymentMethodSetupComplete).toBe(true);
    });

    it('should reject confirm for non-owner', async () => {
      const response = await request(app)
        .post('/api/payment-setup/confirm-setup')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ paymentMethodId: 'pm_test123' });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatchObject({
        code: 'FORBIDDEN',
        message: expect.stringContaining('Only organization owners'),
      });
    });

    it('should require payment method ID', async () => {
      const response = await request(app)
        .post('/api/payment-setup/confirm-setup')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payment-setup/payment-methods', () => {
    beforeEach(async () => {
      // Setup organization with Stripe customer and payment method
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          stripeCustomerId: 'cus_test123',
          defaultPaymentMethodId: 'pm_test123',
          paymentMethodSetupComplete: true,
        },
      });
    });

    it('should list payment methods for owner', async () => {
      const response = await request(app)
        .get('/api/payment-setup/payment-methods')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: 'pm_test123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
        },
        isDefault: true,
      });
    });

    it('should list payment methods for admin', async () => {
      // Update manager to admin
      await prisma.organizationMembership.update({
        where: {
          userId_organizationId: {
            userId: (await prisma.user.findUnique({ where: { email: 'payment-manager@example.com' } }))!.id,
            organizationId,
          },
        },
        data: { role: 'ADMIN' },
      });

      // Re-generate token with admin role
      const adminUser = await prisma.user.findUnique({
        where: { email: 'payment-manager@example.com' },
      });
      const adminToken = jwt.sign(
        { userId: adminUser!.id, organizationId },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/api/payment-setup/payment-methods')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should reject for non-admin/non-owner', async () => {
      const response = await request(app)
        .get('/api/payment-setup/payment-methods')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
    });

    it('should return empty array for org without Stripe customer', async () => {
      // Remove Stripe customer
      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: null },
      });

      const response = await request(app)
        .get('/api/payment-setup/payment-methods')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('DELETE /api/payment-setup/payment-methods/:id', () => {
    beforeEach(async () => {
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          stripeCustomerId: 'cus_test123',
          defaultPaymentMethodId: 'pm_test123',
        },
      });
    });

    it('should remove payment method for owner', async () => {
      const response = await request(app)
        .delete('/api/payment-setup/payment-methods/pm_test123')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: expect.stringContaining('removed successfully'),
      });
    });

    it('should reject remove for non-owner', async () => {
      const response = await request(app)
        .delete('/api/payment-setup/payment-methods/pm_test123')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatchObject({
        code: 'FORBIDDEN',
        message: expect.stringContaining('Only organization owners'),
      });
    });
  });
});

