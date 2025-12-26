import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from '../setup.js';

const app = createApp();

describe('Subscription Middleware', () => {
  let testUser: any;
  let testOrg: any;
  let token: string;
  let freePlan: any;

  beforeEach(async () => {
    await cleanupTestData();

    testUser = await createTestUser();
    testOrg = await createTestOrganization();
    await createTestMembership(testUser.id, testOrg.id, 'OWNER');

    token = jwt.sign({ userId: testUser.id, organizationId: testOrg.id, role: 'OWNER' }, env.JWT_SECRET);

    const uuid = require('crypto').randomUUID().slice(0, 8);
    freePlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Free Test',
        slug: `free-test-${uuid}`,
        price: 0,
        billingInterval: 'monthly',
        features: { properties: true },
        limits: { properties: 1, tenants: 2, users: 2, storage: 100, apiCalls: 100 },
        isActive: true,
        displayOrder: 0,
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('requireLimit middleware', () => {
    it('should allow creating property when under limit', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Property',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        });

      expect(response.status).toBe(201);
    });

    it('should block creating property when at limit', async () => {
      // Create property at limit
      await prisma.property.create({
        data: {
          organizationId: testOrg.id,
          name: 'First Property',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        },
      });

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Second Property',
          addressLine1: '456 Oak Ave',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('LIMIT_EXCEEDED');
    });

    it('should allow creating tenant when under limit', async () => {
      const property = await prisma.property.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Property',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        },
      });

      const response = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          propertyId: property.id,
        });

      expect(response.status).toBe(201);
    });

    it('should block creating tenant when at limit', async () => {
      // Create subscription with limited plan
      await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const property = await prisma.property.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Property',
          addressLine1: '123 Main St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
          country: 'USA',
          type: 'SINGLE_FAMILY',
        },
      });

      // Create tenants at limit (plan limit is 2)
      await prisma.tenant.createMany({
        data: [
          {
            organizationId: testOrg.id,
            firstName: 'Tenant',
            lastName: 'One',
            email: 'tenant1@example.com',
            propertyId: property.id,
          },
          {
            organizationId: testOrg.id,
            firstName: 'Tenant',
            lastName: 'Two',
            email: 'tenant2@example.com',
            propertyId: property.id,
          },
        ],
      });

      const response = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Tenant',
          lastName: 'Three',
          email: 'tenant3@example.com',
          propertyId: property.id,
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('LIMIT_EXCEEDED');
    });

    it('should allow creating user when under limit', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          role: 'VIEWER',
        });

      expect(response.status).toBe(201);
    });

    it('should block creating user when at limit', async () => {
      // Create subscription with limited plan
      await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create users at limit (plan limit is 2, testUser is already 1)
      const user2 = await createTestUser({ email: 'user2@example.com' });
      await createTestMembership(user2.id, testOrg.id, 'VIEWER');

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Third User',
          email: 'user3@example.com',
          role: 'VIEWER',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('LIMIT_EXCEEDED');
    });

    it('should allow unlimited resources for enterprise plan', async () => {
      const enterprisePlan = await prisma.subscriptionPlan.create({
        data: {
          name: 'Enterprise Test',
          slug: `enterprise-test-${require('crypto').randomUUID().slice(0, 8)}`,
          price: 499,
          billingInterval: 'monthly',
          features: { properties: true },
          limits: { properties: 999999, tenants: 999999, users: 999999, storage: 999999, apiCalls: 999999 },
          isActive: true,
          displayOrder: 3,
        },
      });

      await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: enterprisePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create many properties (should be allowed)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/properties')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: `Property ${i}`,
            addressLine1: '123 Main St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'USA',
            type: 'SINGLE_FAMILY',
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('requireActiveSubscription middleware', () => {
    it('should allow access when no subscription exists (free tier)', async () => {
      const { requireActiveSubscription } = await import('../../middleware/subscription.js');
      const req: any = {
        auth: { organizationId: testOrg.id },
      };
      const res: any = {};
      let nextCalled = false;
      let nextError: any = null;
      const next = (error?: any) => {
        nextCalled = true;
        nextError = error;
      };

      await requireActiveSubscription(req, res, next);

      expect(nextCalled).toBe(true);
      expect(nextError).toBeUndefined();
    });

    it('should allow access with active subscription', async () => {
      await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const { requireActiveSubscription } = await import('../../middleware/subscription.js');
      const req: any = {
        auth: { organizationId: testOrg.id },
      };
      const res: any = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await requireActiveSubscription(req, res, next);

      expect(nextCalled).toBe(true);
    });

    it('should block access with expired subscription', async () => {
      await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: freePlan.id,
          status: 'EXPIRED',
          currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const { requireActiveSubscription } = await import('../../middleware/subscription.js');
      const req: any = {
        auth: { organizationId: testOrg.id },
      };
      const res: any = {};
      let nextError: any = null;
      const next = (error?: any) => {
        nextError = error;
      };

      await requireActiveSubscription(req, res, next);

      expect(nextError).toBeDefined();
      expect(nextError.status).toBe(403);
      expect(nextError.code).toBe('SUBSCRIPTION_REQUIRED');
    });
  });

  describe('requireFeature middleware', () => {
    it('should allow access to free features without subscription', async () => {
      const { requireFeature } = await import('../../middleware/subscription.js');
      const middleware = requireFeature('properties');
      
      const req: any = {
        auth: { organizationId: testOrg.id },
      };
      const res: any = {};
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await middleware(req, res, next);

      expect(nextCalled).toBe(true);
    });

    it('should block access to premium features without subscription', async () => {
      const { requireFeature } = await import('../../middleware/subscription.js');
      const middleware = requireFeature('reports');
      
      const req: any = {
        auth: { organizationId: testOrg.id },
      };
      const res: any = {};
      let nextError: any = null;
      const next = (error?: any) => {
        nextError = error;
      };

      await middleware(req, res, next);

      expect(nextError).toBeDefined();
      expect(nextError.status).toBe(403);
      expect(nextError.code).toBe('FEATURE_NOT_AVAILABLE');
    });
  });

  describe('getSubscriptionInfo', () => {
    it('should return subscription info for organization with subscription', async () => {
      await prisma.subscription.create({
        data: {
          organizationId: testOrg.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const { getSubscriptionInfo } = await import('../../middleware/subscription.js');
      const info = await getSubscriptionInfo(testOrg.id);

      expect(info).toBeDefined();
      expect(info.subscription).toBeDefined();
      expect(info.limits).toBeDefined();
      expect(info.hasActiveSubscription).toBe(true);
    });

    it('should return subscription info for organization without subscription', async () => {
      const { getSubscriptionInfo } = await import('../../middleware/subscription.js');
      const info = await getSubscriptionInfo(testOrg.id);

      expect(info).toBeDefined();
      expect(info.subscription).toBeNull();
      expect(info.limits).toBeDefined();
      expect(info.hasActiveSubscription).toBe(false);
    });
  });
});

