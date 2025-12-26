import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { uploadFileStream, getSignedUrl, deleteFile } from '../lib/storage.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const documentRouter = Router();

// Configure multer for file uploads (store on disk to avoid memory spikes)
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, os.tmpdir());
    },
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname);
      cb(null, `${uuidv4()}${extension}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const documentSchema = z.object({
  propertyId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  leaseId: z.string().uuid().optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
  violationId: z.string().uuid().optional().nullable(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  storageKey: z.string().min(1),
});

// Get all documents for the organization
documentRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const docs = await prisma.document.findMany({
      where: { organizationId: req.auth.organizationId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({ data: docs });
  } catch (err) {
    next(err);
  }
});

// Upload a new document
documentRouter.post('/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    if (!req.file) {
      throw new AppError(400, 'BAD_REQUEST', 'No file provided.');
    }

    const bodySchema = z.object({
      propertyId: z.string().uuid().optional().nullable(),
      unitId: z.string().uuid().optional().nullable(),
      leaseId: z.string().uuid().optional().nullable(),
      tenantId: z.string().uuid().optional().nullable(),
      violationId: z.string().uuid().optional().nullable(),
    });

    const metadata = parseBody(bodySchema, req.body);

    // Generate unique file name
    const fileExtension = req.file.originalname.split('.').pop() || '';
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const originalFileName = req.file.originalname;

    // Determine folder based on associations
    let folder = 'documents';
    if (metadata.leaseId) {
      folder = 'leases';
    } else if (metadata.violationId) {
      folder = 'violations';
    } else if (metadata.propertyId) {
      folder = 'properties';
    } else if (metadata.tenantId) {
      folder = 'tenants';
    }

    const tempPath = req.file.path;
    let storageKey = '';

    try {
      // Upload to Google Cloud Storage
      storageKey = await uploadFileStream(
        tempPath,
        uniqueFileName,
        req.file.mimetype,
        folder,
      );
    } finally {
      await fs.unlink(tempPath).catch(() => null);
    }

    // Create document record in database
    const doc = await prisma.document.create({
      data: {
        organizationId: req.auth.organizationId,
        propertyId: metadata.propertyId ?? undefined,
        unitId: metadata.unitId ?? undefined,
        leaseId: metadata.leaseId ?? undefined,
        tenantId: metadata.tenantId ?? undefined,
        violationId: metadata.violationId ?? undefined,
        fileName: originalFileName,
        fileType: req.file.mimetype,
        storageKey,
        uploadedByUserId: req.auth.userId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({ data: doc });
  } catch (err) {
    next(err);
  }
});

// Legacy endpoint - for backward compatibility (creates document record without file)
documentRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(documentSchema, req.body);

    const doc = await prisma.document.create({
      data: {
        organizationId: req.auth.organizationId,
        propertyId: data.propertyId ?? undefined,
        unitId: data.unitId ?? undefined,
        leaseId: data.leaseId ?? undefined,
        tenantId: data.tenantId ?? undefined,
        violationId: data.violationId ?? undefined,
        fileName: data.fileName,
        fileType: data.fileType,
        storageKey: data.storageKey,
        uploadedByUserId: req.auth.userId,
      },
    });

    res.status(201).json({ data: doc });
  } catch (err) {
    next(err);
  }
});

// Get download URL for a document (signed URL)
documentRouter.get('/:id/download', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const doc = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });

    if (!doc) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found.');
    }

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(doc.storageKey, 60);

    res.json({
      data: {
        url: signedUrl,
        fileName: doc.fileName,
        fileType: doc.fileType,
        expiresIn: 3600, // 1 hour in seconds
      },
    });
  } catch (err) {
    next(err);
  }
});

// Delete a document
documentRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const doc = await prisma.document.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
    });

    if (!doc) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found.');
    }

    // Delete from Google Cloud Storage
    try {
      await deleteFile(doc.storageKey);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue to delete database record even if storage deletion fails
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: doc.id },
    });

    res.json({ data: { id: doc.id } });
  } catch (err) {
    next(err);
  }
});
