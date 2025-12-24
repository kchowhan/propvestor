import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Organizations Routes', () => {
  let testUser: any;
  let testOrg: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();

    testUser = await createTestUser();
    testOrg = await createTestOrganization();
    await createTestMembership(testUser.id, testOrg.id, 'OWNER');
    token = jwt.sign(
      { userId: testUser.id, organizationId: testOrg.id },
      env.JWT_SECRET
    );
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('POST /api/organizations', () => {
    it('should create organization for OWNER user with no subscription', async () => {
      // User with no subscription should be able to create org (first org or if feature allows)
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Organization' });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('New Organization');
      expect(response.body.data.slug).toBeDefined();
    });

    it('should return 403 for non-OWNER user', async () => {
      const managerUser = await createTestUser({ email: 'manager@test.com' });
      await createTestMembership(managerUser.id, testOrg.id, 'MANAGER');
      const managerToken = jwt.sign(
        { userId: managerUser.id, organizationId: testOrg.id },
        env.JWT_SECRET
      );

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'New Organization' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid name', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
    });

    it('should generate unique slug when slug exists', async () => {
      // Create first org with name that will generate similar slug
      await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Organization' });

      // Create second org with similar name
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Organization' });

      expect(response.status).toBe(201);
      expect(response.body.data.slug).toBeDefined();
      // Slug should be unique (includes timestamp)
      expect(response.body.data.slug).toContain('test-organization');
    });

    describe('Organization Creation Restrictions', () => {
      let freePlan: any;
      let basicPlan: any;
      let enterprisePlan: any;

      beforeEach(async () => {
        const uuid = require('crypto').randomUUID().slice(0, 8);
        freePlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Free Test',
            slug: `free-test-${uuid}`,
            price: 0,
            billingInterval: 'monthly',
            features: {},
            limits: {},
            isActive: true,
            displayOrder: 0,
          },
        });

        basicPlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Basic Test',
            slug: `basic-test-${uuid}`,
            price: 49,
            billingInterval: 'monthly',
            features: {},
            limits: {},
            stripePriceId: `price_basic_${uuid}`,
            isActive: true,
            displayOrder: 1,
          },
        });

        enterprisePlan = await prisma.subscriptionPlan.create({
          data: {
            name: 'Enterprise Test',
            slug: `enterprise-test-${uuid}`,
            price: 499,
            billingInterval: 'monthly',
            features: {},
            limits: {},
            stripePriceId: `price_enterprise_${uuid}`,
            isActive: true,
            displayOrder: 3,
          },
        });
      });

      it('should allow org creation for Enterprise plan user', async () => {
        // Set environment to require Enterprise (default behavior)
        const originalEnv = process.env.ORG_CREATION_REQUIRES_ENTERPRISE;
        process.env.ORG_CREATION_REQUIRES_ENTERPRISE = 'true';

        // Create Enterprise subscription for test org (plan slug must contain 'enterprise')
        await prisma.subscription.create({
          data: {
            organizationId: testOrg.id,
            planId: enterprisePlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        const response = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Enterprise Org' });

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('Enterprise Org');

        // Restore env
        if (originalEnv) {
          process.env.ORG_CREATION_REQUIRES_ENTERPRISE = originalEnv;
        } else {
          delete process.env.ORG_CREATION_REQUIRES_ENTERPRISE;
        }
      });

      it('should block org creation for Basic plan user when Enterprise required', async () => {
        const originalEnv = process.env.ORG_CREATION_REQUIRES_ENTERPRISE;
        process.env.ORG_CREATION_REQUIRES_ENTERPRISE = 'true';

        // Create Basic subscription for test org
        await prisma.subscription.create({
          data: {
            organizationId: testOrg.id,
            planId: basicPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        const response = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Basic Org' });

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
        expect(response.body.error.message).toContain('Enterprise plan');

        // Restore env
        if (originalEnv) {
          process.env.ORG_CREATION_REQUIRES_ENTERPRISE = originalEnv;
        } else {
          delete process.env.ORG_CREATION_REQUIRES_ENTERPRISE;
        }
      });

      it('should allow org creation for Basic plan user when Enterprise not required', async () => {
        const originalEnv = process.env.ORG_CREATION_REQUIRES_ENTERPRISE;
        process.env.ORG_CREATION_REQUIRES_ENTERPRISE = 'false';

        // Create Basic subscription for test org
        await prisma.subscription.create({
          data: {
            organizationId: testOrg.id,
            planId: basicPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        const response = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Basic Org Allowed' });

        expect(response.status).toBe(201);

        // Restore env
        if (originalEnv) {
          process.env.ORG_CREATION_REQUIRES_ENTERPRISE = originalEnv;
        } else {
          delete process.env.ORG_CREATION_REQUIRES_ENTERPRISE;
        }
      });

      it('should block org creation when feature is disabled', async () => {
        const originalEnv = process.env.ALLOW_ORG_CREATION;
        process.env.ALLOW_ORG_CREATION = 'false';

        const response = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Disabled Org' });

        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe('FORBIDDEN');
        expect(response.body.error.message).toContain('disabled');

        // Restore env
        if (originalEnv) {
          process.env.ALLOW_ORG_CREATION = originalEnv;
        } else {
          delete process.env.ALLOW_ORG_CREATION;
        }
      });

      it('should enforce MAX_ORGS_PER_USER limit', async () => {
        const originalEnv = process.env.MAX_ORGS_PER_USER;
        process.env.MAX_ORGS_PER_USER = '2';
        process.env.ORG_CREATION_REQUIRES_ENTERPRISE = 'false';

        // Create Enterprise subscription
        await prisma.subscription.create({
          data: {
            organizationId: testOrg.id,
            planId: enterprisePlan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // Create first additional org (user already owns testOrg, so this is org #2)
        const response1 = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Org 2' });

        expect(response1.status).toBe(201);

        // Try to create third org (should fail - limit is 2)
        const response2 = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Org 3' });

        expect(response2.status).toBe(403);
        expect(response2.body.error.code).toBe('LIMIT_EXCEEDED');
        expect(response2.body.error.message).toContain('maximum number of organizations');

        // Restore env
        if (originalEnv) {
          process.env.MAX_ORGS_PER_USER = originalEnv;
        } else {
          delete process.env.MAX_ORGS_PER_USER;
        }
        delete process.env.ORG_CREATION_REQUIRES_ENTERPRISE;
      });

      it('should allow org creation when user has no subscription (first org)', async () => {
        // User with no subscription should be able to create org
        // This simulates the registration flow
        const response = await request(app)
          .post('/api/organizations')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'First Org' });

        expect(response.status).toBe(201);
      });
    });
  });

  describe('GET /api/organizations', () => {
    it('should return user organizations', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/organizations/:id', () => {
    it('should return organization if user is member', async () => {
      const response = await request(app)
        .get(`/api/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testOrg.id);
    });

    it('should return 404 if user is not member', async () => {
      const otherOrg = await createTestOrganization( {
        name: 'Other Org',
        slug: 'other-org',
      });

      const response = await request(app)
        .get(`/api/organizations/${otherOrg.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

