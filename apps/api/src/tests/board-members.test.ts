import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

const app = createApp();

describe('Board Members Routes', () => {
  let testUser: any;
  let testOrg: any;
  let testAssociation: any;
  let testHomeowner: any;
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

    // Create test association
    testAssociation = await prisma.association.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test HOA',
      },
    });

    // Create test homeowner
    testHomeowner = await prisma.homeowner.create({
      data: {
        associationId: testAssociation.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/board-members', () => {
    it('should list board members for organization', async () => {
      const boardMember = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date(),
        },
      });

      // Verify it was created
      const created = await prisma.boardMember.findUnique({
        where: { id: boardMember.id },
        include: { association: true },
      });
      expect(created).toBeDefined();
      expect(created?.association.organizationId).toBe(testOrg.id);

      // Verify association exists and belongs to org
      const associationCheck = await prisma.association.findUnique({
        where: { id: testAssociation.id },
      });
      expect(associationCheck?.organizationId).toBe(testOrg.id);

      const response = await request(app)
        .get('/api/board-members')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Find our specific board member
      const found = response.body.data.find((m: any) => m.id === boardMember.id);
      expect(found).toBeDefined();
      if (found) {
        expect(found.role).toBe('PRESIDENT');
      }
    });

    it('should filter by associationId', async () => {
      const association2 = await prisma.association.create({
        data: {
          organizationId: testOrg.id,
          name: 'Another HOA Filter Test',
        },
      });

      const boardMember1 = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date(),
        },
      });

      const boardMember2 = await prisma.boardMember.create({
        data: {
          associationId: association2.id,
          userId: testUser.id,
          role: 'SECRETARY',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/board-members?associationId=${testAssociation.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      // Should find boardMember1 but not boardMember2
      const found1 = response.body.data.find((m: any) => m.id === boardMember1.id);
      const found2 = response.body.data.find((m: any) => m.id === boardMember2.id);
      expect(found1).toBeDefined();
      expect(found1.role).toBe('PRESIDENT');
      expect(found2).toBeUndefined();
    });

    it('should filter by isActive', async () => {
      await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2023-12-31'),
          isActive: false,
        },
      });

      await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'VICE_PRESIDENT',
          startDate: new Date(),
          isActive: true,
        },
      });

      const response = await request(app)
        .get('/api/board-members?isActive=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const activeMembers = response.body.data.filter((m: any) => m.isActive === true);
      expect(activeMembers.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by role', async () => {
      const boardMember = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'TREASURER',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .get('/api/board-members?role=TREASURER')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      // Find our specific board member in the filtered results
      const found = response.body.data.find((m: any) => m.id === boardMember.id);
      expect(found).toBeDefined();
      expect(found.role).toBe('TREASURER');
    });

    it('should return 404 for invalid associationId', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/board-members?associationId=${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/board-members', () => {
    it('should create board member from user', async () => {
      const response = await request(app)
        .post('/api/board-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.data.role).toBe('PRESIDENT');
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.message).toBe('Board member added successfully.');
    });

    it('should create board member from homeowner', async () => {
      const response = await request(app)
        .post('/api/board-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          homeownerId: testHomeowner.id,
          role: 'SECRETARY',
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.data.role).toBe('SECRETARY');
      expect(response.body.data.homeownerId).toBe(testHomeowner.id);
      expect(response.body.data.homeowner).toBeDefined();
    });

    it('should set isActive to false if endDate is in the past', async () => {
      const pastDate = new Date('2020-01-01');
      const response = await request(app)
        .post('/api/board-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'TREASURER',
          startDate: pastDate.toISOString(),
          endDate: new Date('2023-12-31').toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 400 if neither userId nor homeownerId provided', async () => {
      const response = await request(app)
        .post('/api/board-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          role: 'PRESIDENT',
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 400 if both userId and homeownerId provided', async () => {
      const response = await request(app)
        .post('/api/board-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          userId: testUser.id,
          homeownerId: testHomeowner.id,
          role: 'PRESIDENT',
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 404 for invalid associationId', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post('/api/board-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: fakeId,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(404);
    });

    it('should return 404 for user not in organization', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const response = await request(app)
        .post('/api/board-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          userId: otherUser.id,
          role: 'PRESIDENT',
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not a member of this organization');
    });

    it('should return 409 if person is already an active board member', async () => {
      await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date(),
          isActive: true,
        },
      });

      const response = await request(app)
        .post('/api/board-members')
        .set('Authorization', `Bearer ${token}`)
        .send({
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'VICE_PRESIDENT',
          startDate: new Date().toISOString(),
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('GET /api/board-members/:id', () => {
    it('should get board member details', async () => {
      const boardMember = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/board-members/${boardMember.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(boardMember.id);
      expect(response.body.data.role).toBe('PRESIDENT');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.association).toBeDefined();
    });

    it('should return 404 for non-existent board member', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/board-members/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/board-members/:id', () => {
    it('should update board member', async () => {
      const boardMember = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date('2020-01-01'),
        },
      });

      const response = await request(app)
        .put(`/api/board-members/${boardMember.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'VICE_PRESIDENT',
          notes: 'Updated role',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('VICE_PRESIDENT');
      expect(response.body.data.notes).toBe('Updated role');
      expect(response.body.message).toBe('Board member updated successfully.');
    });

    it('should update endDate and set isActive to false', async () => {
      const boardMember = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date('2020-01-01'),
          isActive: true,
        },
      });

      const endDate = new Date('2023-12-31');
      const response = await request(app)
        .put(`/api/board-members/${boardMember.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(new Date(response.body.data.endDate).getTime()).toBe(endDate.getTime());
      expect(response.body.data.isActive).toBe(false);
    });

    it('should return 400 if trying to change userId or homeownerId', async () => {
      const boardMember = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .put(`/api/board-members/${boardMember.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Cannot change userId or homeownerId');
    });
  });

  describe('DELETE /api/board-members/:id', () => {
    it('should delete board member', async () => {
      const boardMember = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: new Date(),
        },
      });

      const response = await request(app)
        .delete(`/api/board-members/${boardMember.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Board member removed successfully.');

      // Verify it's deleted
      const deleted = await prisma.boardMember.findUnique({
        where: { id: boardMember.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/board-members/:id/tenure', () => {
    it('should get board member tenure history', async () => {
      const startDate1 = new Date('2020-01-01');
      const endDate1 = new Date('2022-12-31');
      const startDate2 = new Date('2023-01-01');

      // Create first term
      await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'PRESIDENT',
          startDate: startDate1,
          endDate: endDate1,
          isActive: false,
        },
      });

      // Create second term (current)
      const currentTerm = await prisma.boardMember.create({
        data: {
          associationId: testAssociation.id,
          userId: testUser.id,
          role: 'VICE_PRESIDENT',
          startDate: startDate2,
          isActive: true,
        },
      });

      const response = await request(app)
        .get(`/api/board-members/${currentTerm.id}/tenure`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.currentRecord).toBeDefined();
      expect(response.body.data.tenureHistory.length).toBe(2);
      expect(response.body.data.totalTenureDays).toBeGreaterThan(0);
      expect(response.body.data.totalTenureYears).toBeGreaterThanOrEqual(0);
      expect(response.body.data.totalTenureMonths).toBeGreaterThanOrEqual(0);
    });

    it('should return 404 for non-existent board member', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/board-members/${fakeId}/tenure`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

