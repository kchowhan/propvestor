import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Associations Routes', () => {
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

  describe('GET /api/associations', () => {
    it('should list all associations for organization', async () => {
      // Create test associations - use same pattern as "filter by isActive" test
      const association1 = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Sunset HOA List Test',
          city: 'San Francisco',
          state: 'CA',
        },
      });

      const association2 = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Ocean View HOA List Test',
          city: 'Los Angeles',
          state: 'CA',
        },
      });

      const response = await request(app)
        .get('/api/associations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      // Find our specific associations in the response
      const association1Data = response.body.data.find((a: any) => a.id === association1.id);
      const association2Data = response.body.data.find((a: any) => a.id === association2.id);
      expect(association1Data).toBeDefined();
      expect(association2Data).toBeDefined();
      expect(association1Data.name).toBe('Sunset HOA List Test');
      expect(association2Data.name).toBe('Ocean View HOA List Test');
    });

    it('should filter by isActive=true', async () => {
      await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Active HOA',
          isActive: true,
        },
      });

      await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Inactive HOA',
          isActive: false,
        },
      });

      const response = await request(app)
        .get('/api/associations?isActive=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Active HOA');
    });

    it('should filter by isActive=false', async () => {
      await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Active HOA',
          isActive: true,
        },
      });

      await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Inactive HOA',
          isActive: false,
        },
      });

      const response = await request(app)
        .get('/api/associations?isActive=false')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Inactive HOA');
    });

    it('should include property counts from homeowners with units', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'HOA with Properties',
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
          type: 'MULTI_FAMILY',
        },
      });

      const unit1 = await prisma.unit.create({
        data: {
          propertyId: property.id,
          name: 'Unit 1',
        },
      });

      const unit2 = await prisma.unit.create({
        data: {
          propertyId: property.id,
          name: 'Unit 2',
        },
      });

      await prisma.homeowner.create({
        data: {
          associationId: association.id,
          unitId: unit1.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john-props@example.com',
        },
      });

      await prisma.homeowner.create({
        data: {
          associationId: association.id,
          unitId: unit2.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane-props@example.com',
        },
      });

      const response = await request(app)
        .get('/api/associations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const associationData = response.body.data.find((a: any) => a.id === association.id);
      expect(associationData).toBeDefined();
      expect(associationData.propertyCount).toBe(1); // Both homeowners share same property
    });

    it('should include property counts from homeowners with direct property', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'HOA with Direct Properties',
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

      await prisma.homeowner.create({
        data: {
          associationId: association.id,
          propertyId: property.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john-direct@example.com',
        },
      });

      const response = await request(app)
        .get('/api/associations')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const associationData = response.body.data.find((a: any) => a.id === association.id);
      expect(associationData).toBeDefined();
      expect(associationData.propertyCount).toBe(1);
    });

    it('should include counts for homeowners and board members', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test HOA with Counts',
        },
      });

      // Create homeowners
      await prisma.homeowner.create({
        data: {
          associationId: association.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john-counts@example.com',
        },
      });

      await prisma.homeowner.create({
        data: {
          associationId: association.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane-counts@example.com',
        },
      });

      // Create board member
      await prisma.boardMember.create({
        data: {
          associationId: association.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/associations/${association.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(association.id);
      expect(response.body.data.homeownerCount).toBe(2);
      expect(response.body.data.boardMemberCount).toBe(1);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/associations');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/associations', () => {
    it('should create association with required fields', async () => {
      const response = await request(app)
        .post('/api/associations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sunset HOA',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Sunset HOA');
      expect(response.body.data.organizationId).toBe(testOrg.id);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.message).toBe('Association created successfully.');
    });

    it('should create association with all fields', async () => {
      const response = await request(app)
        .post('/api/associations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Ocean View HOA',
          addressLine1: '123 Main St',
          addressLine2: 'Suite 100',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'USA',
          phone: '415-555-1234',
          email: 'info@oceanviewhoa.com',
          website: 'https://oceanviewhoa.com',
          fiscalYearStart: 1,
          notes: 'Test association',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Ocean View HOA');
      expect(response.body.data.addressLine1).toBe('123 Main St');
      expect(response.body.data.city).toBe('San Francisco');
      expect(response.body.data.email).toBe('info@oceanviewhoa.com');
      expect(response.body.data.fiscalYearStart).toBe(1);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/associations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test HOA',
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .post('/api/associations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test HOA',
          website: 'not-a-url',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid fiscalYearStart', async () => {
      const response = await request(app)
        .post('/api/associations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test HOA',
          fiscalYearStart: 13, // Invalid (must be 1-12)
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/associations')
        .send({ name: 'Test HOA' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/associations/:id', () => {
    it('should get association details', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Sunset HOA',
          city: 'San Francisco',
          state: 'CA',
        },
      });

      const response = await request(app)
        .get(`/api/associations/${association.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(association.id);
      expect(response.body.data.name).toBe('Sunset HOA');
      expect(response.body.data.homeownerCount).toBe(0);
      expect(response.body.data.boardMemberCount).toBe(0);
    });

    it('should return 404 for non-existent association', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/associations/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for association from different organization', async () => {
      const otherOrg = await createTestOrganization({ name: 'Other Org' });
      const otherAssociation = await prisma.association.create({
        data: {
          organizationId: otherOrg.id,
          name: 'Other HOA',
        },
      });

      const response = await request(app)
        .get(`/api/associations/${otherAssociation.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should include properties and units from homeowners with units', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'HOA with Units',
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
          type: 'MULTI_FAMILY',
        },
      });

      const unit = await prisma.unit.create({
        data: {
          propertyId: property.id,
          name: 'Unit 1',
          bedrooms: 2,
          bathrooms: 1,
          squareFeet: 1000,
        },
      });

      await prisma.homeowner.create({
        data: {
          associationId: association.id,
          unitId: unit.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john-units@example.com',
        },
      });

      const response = await request(app)
        .get(`/api/associations/${association.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.properties).toBeDefined();
      expect(response.body.data.units).toBeDefined();
      expect(response.body.data.properties.length).toBeGreaterThan(0);
      expect(response.body.data.units.length).toBeGreaterThan(0);
    });

    it('should include properties from homeowners with direct property', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'HOA with Direct Property',
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

      await prisma.homeowner.create({
        data: {
          associationId: association.id,
          propertyId: property.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john-direct-prop@example.com',
        },
      });

      const response = await request(app)
        .get(`/api/associations/${association.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.properties).toBeDefined();
      expect(response.body.data.properties.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/associations/:id', () => {
    it('should update association', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Sunset HOA',
          city: 'San Francisco',
        },
      });

      const response = await request(app)
        .put(`/api/associations/${association.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sunset HOA Updated',
          city: 'Los Angeles',
          state: 'CA',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Sunset HOA Updated');
      expect(response.body.data.city).toBe('Los Angeles');
      expect(response.body.data.state).toBe('CA');
      expect(response.body.message).toBe('Association updated successfully.');
    });

    it('should update partial fields', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Sunset HOA',
          city: 'San Francisco',
        },
      });

      const response = await request(app)
        .put(`/api/associations/${association.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          phone: '415-555-9999',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Sunset HOA'); // Unchanged
      expect(response.body.data.phone).toBe('415-555-9999');
    });

    it('should return 404 for non-existent association', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .put(`/api/associations/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should update with null values', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test HOA',
          city: 'San Francisco',
          phone: '415-555-1234',
        },
      });

      const response = await request(app)
        .put(`/api/associations/${association.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          city: null,
          phone: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.city).toBeNull();
      expect(response.body.data.phone).toBeNull();
    });
  });

  describe('DELETE /api/associations/:id', () => {
    it('should soft delete association (set isActive to false)', async () => {
      const association = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Sunset HOA',
          isActive: true,
        },
      });

      const response = await request(app)
        .delete(`/api/associations/${association.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(false);
      expect(response.body.message).toBe('Association deactivated successfully.');

      // Verify it's still in database but inactive
      const deleted = await prisma.association.findUnique({
        where: { id: association.id },
      });
      expect(deleted).toBeDefined();
      expect(deleted?.isActive).toBe(false);
    });

    it('should return 404 for non-existent association', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/associations/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

