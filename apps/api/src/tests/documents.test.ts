import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { createTestUser, createTestOrganization, createTestMembership, cleanupTestData } from './setup.js';

// Mock storage functions
vi.mock('../lib/storage.js', () => ({
  uploadFile: vi.fn(() => Promise.resolve('documents/test-file.pdf')),
  getSignedUrl: vi.fn(() => Promise.resolve('https://signed-url.com')),
  deleteFile: vi.fn(() => Promise.resolve()),
}));

const app = createApp();

describe('Documents Routes', () => {
  let testUser: any;
  let testOrg: any;
  let token: string;

  beforeEach(async () => {
    await cleanupTestData();

    testUser = await createTestUser();
    testOrg = await createTestOrganization();
    await createTestMembership(testUser.id, testOrg.id);
    token = jwt.sign(
      { userId: testUser.id, organizationId: testOrg.id },
      env.JWT_SECRET
    );
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('GET /api/documents', () => {
    it('should return empty array when no documents exist', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/documents/upload', () => {
    it('should upload document', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('test content'), 'test.pdf')
        .field('fileName', 'test.pdf');

      expect(response.status).toBe(201);
      expect(response.body.data.fileName).toBe('test.pdf');
    });

    it('should return 400 when no file provided', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('fileName', 'test.pdf');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/documents/:id/download', () => {
    let document: any;

    beforeEach(async () => {
      document = await prisma.document.create({
        data: {
          organizationId: testOrg.id,
          uploadedByUserId: testUser.id,
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          storageKey: 'documents/test.pdf',
        },
      });
    });

    it('should return signed URL for document', async () => {
      const response = await request(app)
        .get(`/api/documents/${document.id}/download`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.url).toBeDefined();
    });
  });

  describe('DELETE /api/documents/:id', () => {
    let document: any;

    beforeEach(async () => {
      document = await prisma.document.create({
        data: {
          organizationId: testOrg.id,
          uploadedByUserId: testUser.id,
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          storageKey: 'documents/test.pdf',
        },
      });
    });

    it('should delete document', async () => {
      const response = await request(app)
        .delete(`/api/documents/${document.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });
});

