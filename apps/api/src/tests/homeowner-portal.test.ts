import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, cleanupTestData } from './setup.js';

const app = createApp();

describe('Homeowner Portal Routes', () => {
  let testOrg: any;
  let testAssociation: any;
  let testHomeowner: any;
  let testProperty: any;
  let testUnit: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();

    testOrg = await createTestOrganization();
    testAssociation = await prisma.association.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test HOA',
      },
    });

    testProperty = await prisma.property.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test Property',
        addressLine1: '123 Main St',
        city: 'Test City',
        state: 'CA',
        postalCode: '12345',
        country: 'USA',
        type: 'MULTI_FAMILY',
      },
    });

    testUnit = await prisma.unit.create({
      data: {
        propertyId: testProperty.id,
        name: 'Unit 1',
      },
    });

    testHomeowner = await prisma.homeowner.create({
      data: {
        associationId: testAssociation.id,
        unitId: testUnit.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        accountBalance: 1500.50,
      },
    });

    token = jwt.sign(
      { homeownerId: testHomeowner.id, associationId: testAssociation.id },
      env.JWT_SECRET
    );
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/homeowner-portal/dashboard', () => {
    it('should get homeowner dashboard data', async () => {
      const response = await request(app)
        .get('/api/homeowner-portal/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.homeowner.id).toBe(testHomeowner.id);
      expect(response.body.data.homeowner.firstName).toBe('John');
      expect(response.body.data.association).toBeDefined();
      expect(response.body.data.unit).toBeDefined();
      expect(response.body.data.property).toBeDefined();
      expect(Number(response.body.data.homeowner.accountBalance)).toBe(1500.50);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/homeowner-portal/dashboard');

      expect(response.status).toBe(401);
    });

    it('should return 403 for archived homeowner', async () => {
      await prisma.homeowner.update({
        where: { id: testHomeowner.id },
        data: { archivedAt: new Date() },
      });

      const response = await request(app)
        .get('/api/homeowner-portal/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/homeowner-portal/balance', () => {
    it('should get homeowner account balance', async () => {
      const response = await request(app)
        .get('/api/homeowner-portal/balance')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.homeownerId).toBe(testHomeowner.id);
      expect(Number(response.body.data.accountBalance)).toBe(1500.50);
      expect(response.body.data.name).toBe('John Doe');
      expect(response.body.data.status).toBe('ACTIVE');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/homeowner-portal/balance');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/homeowner-portal/documents', () => {
    it('should get association documents', async () => {
      // Create a test user to upload documents
      const testUser = await createTestUser();
      await prisma.organizationMembership.create({
        data: {
          userId: testUser.id,
          organizationId: testOrg.id,
          role: 'OWNER',
        },
      });

      // Create a document
      await prisma.document.create({
        data: {
          organizationId: testOrg.id,
          fileName: 'test-document.pdf',
          fileType: 'application/pdf',
          storageKey: 'test-key',
          uploadedByUserId: testUser.id,
        },
      });

      const response = await request(app)
        .get('/api/homeowner-portal/documents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].fileName).toBe('test-document.pdf');
    });

    it('should return empty array if no documents', async () => {
      const response = await request(app)
        .get('/api/homeowner-portal/documents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/homeowner-portal/documents');

      expect(response.status).toBe(401);
    });
  });
});

