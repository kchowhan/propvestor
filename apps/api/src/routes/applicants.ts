import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';

export const applicantRouter = Router();

// Applicant statuses (not yet active tenants)
type TenantStatus = 'PROSPECT' | 'SCREENING' | 'APPROVED' | 'ACTIVE' | 'INACTIVE' | 'DECLINED' | 'WITHDRAWN';
const APPLICANT_STATUSES: TenantStatus[] = ['PROSPECT', 'SCREENING', 'APPROVED', 'DECLINED', 'WITHDRAWN'];

const applicantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  propertyId: z.string().uuid().optional().nullable(),
  unitId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['PROSPECT', 'SCREENING', 'APPROVED', 'DECLINED', 'WITHDRAWN']).optional(),
});

applicantRouter.get('/', async (req, res, next) => {
  try {
    // Get tenants that are in applicant stages (not yet ACTIVE)
    const applicants = await prisma.tenant.findMany({
      where: {
        organizationId: req.auth?.organizationId,
        status: { in: APPLICANT_STATUSES },
      },
      include: {
        property: true,
        unit: true,
        screeningRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get most recent screening request
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: applicants });
  } catch (err) {
    next(err);
  }
});

applicantRouter.post('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(applicantSchema, req.body);

    // Verify property/unit belongs to organization if provided
    if (data.propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: data.propertyId,
          organizationId: req.auth.organizationId,
        },
      });
      if (!property) {
        throw new AppError(404, 'NOT_FOUND', 'Property not found.');
      }
    }

    if (data.unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: data.unitId,
          property: { organizationId: req.auth.organizationId },
        },
      });
      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
      }
    }

    // Create applicant as a tenant with PROSPECT status
    const applicant = await prisma.tenant.create({
      data: {
        organizationId: req.auth.organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone ?? undefined,
        propertyId: data.propertyId ?? undefined,
        unitId: data.unitId ?? undefined,
        notes: data.notes ?? undefined,
        status: 'PROSPECT',
      },
      include: {
        property: true,
        unit: true,
      },
    });

    res.status(201).json({ data: applicant });
  } catch (err) {
    next(err);
  }
});

applicantRouter.get('/:id', async (req, res, next) => {
  try {
    const applicant = await prisma.tenant.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth?.organizationId,
        status: { in: APPLICANT_STATUSES },
      },
      include: {
        property: true,
        unit: true,
        screeningRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!applicant) {
      throw new AppError(404, 'NOT_FOUND', 'Applicant not found.');
    }

    res.json({ data: applicant });
  } catch (err) {
    next(err);
  }
});

applicantRouter.put('/:id', async (req, res, next) => {
  try {
    const data = parseBody(applicantSchema.partial(), req.body);
    const applicant = await prisma.tenant.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth?.organizationId,
        status: { in: APPLICANT_STATUSES },
      },
    });

    if (!applicant) {
      throw new AppError(404, 'NOT_FOUND', 'Applicant not found.');
    }

    const updated = await prisma.tenant.update({
      where: { id: applicant.id },
      data: {
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        propertyId: data.propertyId ?? undefined,
        unitId: data.unitId ?? undefined,
        notes: data.notes ?? undefined,
        status: data.status ?? undefined,
      },
      include: {
        property: true,
        unit: true,
        screeningRequests: true,
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// Convert applicant to active tenant
applicantRouter.post('/:id/convert-to-tenant', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const applicant = await prisma.tenant.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
        status: { in: APPLICANT_STATUSES },
      },
    });

    if (!applicant) {
      throw new AppError(404, 'NOT_FOUND', 'Applicant not found.');
    }

    // Update applicant status to APPROVED (ready for lease) or ACTIVE (if lease exists)
    const tenant = await prisma.tenant.update({
      where: { id: applicant.id },
      data: { status: 'APPROVED' },
    });

    res.status(200).json({ data: tenant });
  } catch (err) {
    next(err);
  }
});
