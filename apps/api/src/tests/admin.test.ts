import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import {
  createTestUser,
  createTestOrganization,
  createTestMembership,
  createTestSubscriptionPlan,
  createTestSubscription,
  cleanupTestData,
  prisma,
} from './setup.js';

const app = createApp();

describe('Admin Routes', () => {
  let superAdminUser: any;
  let regularUser: any;
  let testOrg: any;
  let testOrg2: any;
  let testPlan: any;
  let superAdminToken: string;
  let regularToken: string;

  beforeAll(async () => {
    await cleanupTestData();

    // Create super admin user
    superAdminUser = await prisma.user.create({
      data: {
        email: 'superadmin@test.com',
        name: 'Super Admin',
        passwordHash: 'hashed-password',
        isSuperAdmin: true,
      },
    });

    // Create regular user
    regularUser = await createTestUser({ email: 'regular@test.com', name: 'Regular User' });

    // Create test organizations
    testOrg = await createTestOrganization({ name: 'Test Org 1' });
    testOrg2 = await createTestOrganization({ name: 'Test Org 2' });

    // Create memberships
    await createTestMembership(superAdminUser.id, testOrg.id, 'OWNER');
    await createTestMembership(regularUser.id, testOrg2.id, 'OWNER');

    // Create subscription plan and subscriptions
    testPlan = await createTestSubscriptionPlan();
    await createTestSubscription(testOrg.id, testPlan.id);
    await createTestSubscription(testOrg2.id, testPlan.id);

    // Generate tokens
    superAdminToken = jwt.sign(
      { userId: superAdminUser.id, organizationId: testOrg.id },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    regularToken = jwt.sign(
      { userId: regularUser.id, organizationId: testOrg2.id },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Admin Access Control', () => {
    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Super admin access required');
    });

    it('should deny access to unauthenticated requests', async () => {
      const response = await request(app).get('/api/admin/stats');

      expect(response.status).toBe(401);
    });

    it('should allow access to super admin users', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        totalOrganizations: expect.any(Number),
        totalUsers: expect.any(Number),
        totalProperties: expect.any(Number),
        totalTenants: expect.any(Number),
        subscriptions: {
          active: expect.any(Number),
          trial: expect.any(Number),
          cancelled: expect.any(Number),
          total: expect.any(Number),
        },
        revenue: {
          mrr: expect.any(Number),
          arr: expect.any(Number),
        },
      });
    });
  });

  describe('GET /api/admin/organizations', () => {
    it('should list all organizations with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('should filter organizations by search term', async () => {
      const response = await request(app)
        .get('/api/admin/organizations?search=Test Org 1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.some((org: any) => org.name === 'Test Org 1')).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/admin/organizations?page=1&limit=1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/admin/organizations/:id', () => {
    it('should return organization details', async () => {
      const response = await request(app)
        .get(`/api/admin/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: testOrg.id,
        name: 'Test Org 1',
        subscription: expect.any(Object),
        memberships: expect.any(Array),
        _count: expect.any(Object),
      });
    });

    it('should return 404 for non-existent organization', async () => {
      const response = await request(app)
        .get('/api/admin/organizations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/organizations/:id', () => {
    it('should update organization name', async () => {
      const response = await request(app)
        .patch(`/api/admin/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Updated Org Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Org Name');

      // Reset name for other tests
      await prisma.organization.update({
        where: { id: testOrg.id },
        data: { name: 'Test Org 1' },
      });
    });

    it('should update subscription status', async () => {
      const response = await request(app)
        .patch(`/api/admin/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ subscriptionStatus: 'TRIAL' });

      expect(response.status).toBe(200);
      expect(response.body.data.subscription.status).toBe('TRIAL');

      // Reset status
      await prisma.subscription.update({
        where: { organizationId: testOrg.id },
        data: { status: 'ACTIVE' },
      });
    });

    it('should extend trial period', async () => {
      // First set to trial
      await prisma.subscription.update({
        where: { organizationId: testOrg.id },
        data: { 
          status: 'TRIAL',
          trialEndsAt: new Date(),
        },
      });

      const response = await request(app)
        .patch(`/api/admin/organizations/${testOrg.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ extendTrial: 14 });

      expect(response.status).toBe(200);
      expect(response.body.data.subscription.trialEndsAt).toBeDefined();

      // Reset
      await prisma.subscription.update({
        where: { organizationId: testOrg.id },
        data: { status: 'ACTIVE', trialEndsAt: null },
      });
    });
  });

  describe('POST /api/admin/organizations/:id/suspend', () => {
    it('should suspend an organization', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrg.id}/suspend`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('suspended');

      // Verify subscription is cancelled
      const subscription = await prisma.subscription.findUnique({
        where: { organizationId: testOrg.id },
      });
      expect(subscription?.status).toBe('CANCELLED');

      // Reset
      await prisma.subscription.update({
        where: { organizationId: testOrg.id },
        data: { status: 'ACTIVE' },
      });
    });
  });

  describe('POST /api/admin/organizations/:id/reactivate', () => {
    it('should reactivate an organization', async () => {
      // First suspend
      await prisma.subscription.update({
        where: { organizationId: testOrg.id },
        data: { status: 'CANCELLED' },
      });

      const response = await request(app)
        .post(`/api/admin/organizations/${testOrg.id}/reactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('reactivated');

      // Verify subscription is active
      const subscription = await prisma.subscription.findUnique({
        where: { organizationId: testOrg.id },
      });
      expect(subscription?.status).toBe('ACTIVE');
    });
  });

  describe('GET /api/admin/users', () => {
    it('should list all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter users by search term', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=Super')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.some((u: any) => u.name.includes('Super'))).toBe(true);
    });

    it('should filter super admins only', async () => {
      const response = await request(app)
        .get('/api/admin/users?superAdminOnly=true')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((u: any) => u.isSuperAdmin)).toBe(true);
    });
  });

  describe('PATCH /api/admin/users/:id/admin', () => {
    it('should grant super admin privileges', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${regularUser.id}/admin`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isSuperAdmin: true });

      expect(response.status).toBe(200);
      expect(response.body.data.isSuperAdmin).toBe(true);

      // Reset
      await prisma.user.update({
        where: { id: regularUser.id },
        data: { isSuperAdmin: false },
      });
    });

    it('should prevent removing own super admin status', async () => {
      const response = await request(app)
        .patch(`/api/admin/users/${superAdminUser.id}/admin`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isSuperAdmin: false });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Cannot remove your own');
    });
  });

  describe('GET /api/admin/plans', () => {
    it('should list all subscription plans', async () => {
      const response = await request(app)
        .get('/api/admin/plans')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        price: expect.any(String), // Decimal as string
        _count: expect.any(Object),
      });
    });
  });

  describe('PATCH /api/admin/plans/:id', () => {
    it('should update subscription plan', async () => {
      const response = await request(app)
        .patch(`/api/admin/plans/${testPlan.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Updated Plan Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Plan Name');

      // Reset
      await prisma.subscriptionPlan.update({
        where: { id: testPlan.id },
        data: { name: 'Test Plan' },
      });
    });

    it('should update plan limits', async () => {
      const response = await request(app)
        .patch(`/api/admin/plans/${testPlan.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ limits: { properties: 200, tenants: 200, users: 200, storage: 20000 } });

      expect(response.status).toBe(200);
      expect(response.body.data.limits.properties).toBe(200);
    });
  });

  describe('GET /api/admin/activity', () => {
    it('should return recent activity', async () => {
      const response = await request(app)
        .get('/api/admin/activity')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        subscriptions: expect.any(Array),
        organizations: expect.any(Array),
        users: expect.any(Array),
      });
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/admin/activity?limit=1')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.organizations.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /api/admin/organizations/:id/impersonate', () => {
    it('should return impersonation context', async () => {
      const response = await request(app)
        .post(`/api/admin/organizations/${testOrg.id}/impersonate`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        organizationId: testOrg.id,
        organizationName: 'Test Org 1',
        message: expect.any(String),
      });
    });

    it('should return 404 for non-existent organization', async () => {
      const response = await request(app)
        .post('/api/admin/organizations/00000000-0000-0000-0000-000000000000/impersonate')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('Admin Middleware', () => {
  describe('requireSuperAdmin', () => {
    let testUser: any;
    let testOrg: any;

    beforeAll(async () => {
      testUser = await createTestUser({ email: 'middleware-test@test.com' });
      testOrg = await createTestOrganization({ name: 'Middleware Test Org' });
      await createTestMembership(testUser.id, testOrg.id, 'OWNER');
    });

    afterAll(async () => {
      await cleanupTestData();
    });

    it('should reject non-super-admin users', async () => {
      const token = jwt.sign(
        { userId: testUser.id, organizationId: testOrg.id },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });
});

describe('getAdminStats', () => {
  it('should calculate MRR correctly', async () => {
    // Create a paid plan
    const paidPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Paid Plan',
        slug: `paid-plan-${Date.now()}`,
        price: 100,
        billingInterval: 'monthly',
        features: { properties: true },
        limits: { properties: 10, tenants: 50, users: 5, storage: 1000 },
        isActive: true,
      },
    });

    const org = await createTestOrganization({ name: 'MRR Test Org' });
    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planId: paidPlan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create super admin for test
    const admin = await prisma.user.create({
      data: {
        email: `mrr-admin-${Date.now()}@test.com`,
        name: 'MRR Admin',
        passwordHash: 'hash',
        isSuperAdmin: true,
      },
    });
    await createTestMembership(admin.id, org.id, 'OWNER');

    const token = jwt.sign(
      { userId: admin.id, organizationId: org.id },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.revenue.mrr).toBeGreaterThan(0);
  });
});

