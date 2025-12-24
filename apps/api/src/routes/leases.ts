import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody } from '../validators/common.js';
import { createRentChargeForLease } from '../lib/rent.js';
import { generateAndUploadLeasePdf, LeaseTemplateData } from '../lib/pdf.js';
import { sendEnvelope, downloadCompletedDocument } from '../lib/docusign.js';

export const leaseRouter = Router();

const leaseSchema = z.object({
  unitId: z.string().uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  rentAmount: z.coerce.number(),
  depositAmount: z.coerce.number().optional().nullable(),
  rentDueDay: z.coerce.number().int().min(1).max(31),
  status: z.enum(['DRAFT', 'ACTIVE', 'TERMINATED', 'EXPIRED']).optional(),
  tenantIds: z.array(z.string().uuid()).min(1),
  primaryTenantId: z.string().uuid().optional(),
});

leaseRouter.get('/', async (req, res, next) => {
  try {
    const { status, limit, offset } = req.query;
    const take = limit ? Math.min(Number(limit), 100) : 100; // Max 100 per page
    const skip = offset ? Number(offset) : 0;
    
    const where: any = { organizationId: req.auth?.organizationId };
    if (status) {
      where.status = String(status);
    }
    
    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
        where,
        include: {
          unit: { include: { property: true } },
          tenants: { include: { tenant: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.lease.count({ where }),
    ]);

    res.json({ 
      data: leases,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + take < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

leaseRouter.post('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const data = parseBody(leaseSchema, req.body);

    const unit = await prisma.unit.findFirst({
      where: { id: data.unitId, property: { organizationId: req.auth.organizationId } },
    });

    if (!unit) {
      throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
    }

    const tenants = await prisma.tenant.findMany({
      where: { id: { in: data.tenantIds }, organizationId: req.auth.organizationId, archivedAt: null },
    });

    if (tenants.length !== data.tenantIds.length) {
      throw new AppError(400, 'BAD_REQUEST', 'One or more tenants are invalid.');
    }

    const leaseStatus = data.status ?? 'DRAFT';

    // Check for overlapping active leases for the same unit
    // Only prevent overlap if creating an ACTIVE lease or if there's already an ACTIVE lease
    if (leaseStatus === 'ACTIVE') {
      const overlappingLease = await prisma.lease.findFirst({
        where: {
          unitId: data.unitId,
          status: 'ACTIVE',
          OR: [
            // New lease starts before existing lease ends and ends after existing lease starts
            {
              startDate: { lte: data.endDate },
              endDate: { gte: data.startDate },
            },
          ],
        },
      });

      if (overlappingLease) {
        throw new AppError(
          400,
          'BAD_REQUEST',
          `Cannot create active lease: Unit already has an active lease from ${new Date(overlappingLease.startDate).toLocaleDateString()} to ${new Date(overlappingLease.endDate).toLocaleDateString()}. Please terminate the existing lease first or create this as a DRAFT lease.`,
        );
      }
    }
    // Auto-assign primary tenant if not specified (use first tenant)
    const primaryTenantId = data.primaryTenantId || data.tenantIds[0];
    
    // Validate that primary tenant is in the tenant list
    if (!data.tenantIds.includes(primaryTenantId)) {
      throw new AppError(400, 'BAD_REQUEST', 'Primary tenant must be one of the selected tenants.');
    }

    const lease = await prisma.lease.create({
      data: {
        organizationId: req.auth.organizationId,
        unitId: unit.id,
        startDate: data.startDate,
        endDate: data.endDate,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount ?? undefined,
        rentDueDay: data.rentDueDay,
        status: leaseStatus,
        tenants: {
          create: tenants.map((tenant) => ({
            tenantId: tenant.id,
            isPrimary: tenant.id === primaryTenantId,
          })),
        },
      },
      include: { tenants: { include: { tenant: true } } },
    });

    // Update unit status if lease is active
    if (leaseStatus === 'ACTIVE') {
      await prisma.unit.update({
        where: { id: unit.id },
        data: { status: 'OCCUPIED' },
      });
    }

    res.status(201).json({ data: lease });
  } catch (err) {
    next(err);
  }
});

leaseRouter.get('/:id', async (req, res, next) => {
  try {
    const lease = await prisma.lease.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
      include: {
        unit: { include: { property: true } },
        tenants: { include: { tenant: true } },
        charges: true,
        payments: true,
      },
    });

    if (!lease) {
      throw new AppError(404, 'NOT_FOUND', 'Lease not found.');
    }

    res.json({ data: lease });
  } catch (err) {
    next(err);
  }
});

leaseRouter.put('/:id', async (req, res, next) => {
  try {
    const data = parseBody(leaseSchema.partial(), req.body);
    const lease = await prisma.lease.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
      include: { tenants: true },
    });

    if (!lease) {
      throw new AppError(404, 'NOT_FOUND', 'Lease not found.');
    }

    // Check for overlapping active leases if status is being changed to ACTIVE
    const newStatus = data.status ?? lease.status;
    const newStartDate = data.startDate ? new Date(data.startDate) : lease.startDate;
    const newEndDate = data.endDate ? new Date(data.endDate) : lease.endDate;

    if (newStatus === 'ACTIVE' && lease.status !== 'ACTIVE') {
      const overlappingLease = await prisma.lease.findFirst({
        where: {
          unitId: lease.unitId,
          status: 'ACTIVE',
          id: { not: lease.id },
          OR: [
            {
              startDate: { lte: newEndDate },
              endDate: { gte: newStartDate },
            },
          ],
        },
      });

      if (overlappingLease) {
        throw new AppError(
          400,
          'BAD_REQUEST',
          `Cannot activate lease: Unit already has an active lease from ${new Date(overlappingLease.startDate).toLocaleDateString()} to ${new Date(overlappingLease.endDate).toLocaleDateString()}. Please terminate the existing lease first.`,
        );
      }
    }

    const updated = await prisma.lease.update({
      where: { id: lease.id },
      data: {
        startDate: data.startDate ?? undefined,
        endDate: data.endDate ?? undefined,
        rentAmount: data.rentAmount ?? undefined,
        depositAmount: data.depositAmount ?? undefined,
        rentDueDay: data.rentDueDay ?? undefined,
        status: data.status ?? undefined,
      },
      include: { tenants: { include: { tenant: true } }, unit: { include: { property: true } } },
    });

    // Update unit status if lease is being activated
    if (newStatus === 'ACTIVE' && lease.status !== 'ACTIVE') {
      await prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: 'OCCUPIED' },
      });
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

leaseRouter.post('/:id/activate', async (req, res, next) => {
  try {
    const lease = await prisma.lease.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!lease) {
      throw new AppError(404, 'NOT_FOUND', 'Lease not found.');
    }

    // Check for overlapping active leases before activating
    const overlappingLease = await prisma.lease.findFirst({
      where: {
        unitId: lease.unitId,
        status: 'ACTIVE',
        id: { not: lease.id }, // Exclude the current lease
        OR: [
          // New lease starts before existing lease ends and ends after existing lease starts
          {
            startDate: { lte: lease.endDate },
            endDate: { gte: lease.startDate },
          },
        ],
      },
    });

    if (overlappingLease) {
      throw new AppError(
        400,
        'BAD_REQUEST',
        `Cannot activate lease: Unit already has an active lease from ${new Date(overlappingLease.startDate).toLocaleDateString()} to ${new Date(overlappingLease.endDate).toLocaleDateString()}. Please terminate the existing lease first.`,
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.lease.update({
        where: { id: lease.id },
        data: { status: 'ACTIVE' },
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: 'OCCUPIED' },
      }),
    ]);

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

leaseRouter.post('/:id/terminate', async (req, res, next) => {
  try {
    const terminateSchema = z.object({ endDate: z.coerce.date().optional() });
    const data = parseBody(terminateSchema, req.body ?? {});
    const lease = await prisma.lease.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!lease) {
      throw new AppError(404, 'NOT_FOUND', 'Lease not found.');
    }

    const [updated] = await prisma.$transaction([
      prisma.lease.update({
        where: { id: lease.id },
        data: { status: 'TERMINATED', endDate: data.endDate ?? new Date() },
      }),
      prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: 'VACANT' },
      }),
    ]);

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

leaseRouter.post('/:id/generate-rent-charge', async (req, res, next) => {
  try {
    const rentSchema = z.object({
      month: z.coerce.number().int().min(1).max(12),
      year: z.coerce.number().int().min(2000),
    });
    const data = parseBody(rentSchema, req.body);
    const lease = await prisma.lease.findFirst({
      where: { id: req.params.id, organizationId: req.auth?.organizationId },
    });

    if (!lease) {
      throw new AppError(404, 'NOT_FOUND', 'Lease not found.');
    }

    const charge = await createRentChargeForLease(lease, data.month, data.year);
    if (!charge) {
      throw new AppError(409, 'CONFLICT', 'Rent charge already exists for that month.');
    }

    res.status(201).json({ data: charge });
  } catch (err) {
    next(err);
  }
});

// Generate PDF for lease
leaseRouter.post('/:id/generate-pdf', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const lease = await prisma.lease.findFirst({
      where: { id: req.params.id, organizationId: req.auth.organizationId },
      include: {
        organization: true,
        unit: { include: { property: true } },
        tenants: { include: { tenant: true } },
      },
    });

    if (!lease) {
      throw new AppError(404, 'NOT_FOUND', 'Lease not found.');
    }

    // Prepare template data
    const property = lease.unit.property;
    const propertyAddress = [
      property.addressLine1,
      property.addressLine2,
      property.city,
      property.state,
      property.postalCode,
    ]
      .filter(Boolean)
      .join(', ');

    const templateData: LeaseTemplateData = {
      organizationName: lease.organization.name,
      propertyName: property.name,
      propertyAddress,
      state: property.state,
      unitName: lease.unit.name,
      bedrooms: lease.unit.bedrooms ?? undefined,
      bathrooms: lease.unit.bathrooms ?? undefined,
      squareFeet: lease.unit.squareFeet ?? undefined,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      rentAmount: lease.rentAmount.toString(),
      depositAmount: lease.depositAmount?.toString(),
      rentDueDay: lease.rentDueDay,
      tenants: lease.tenants.map((lt) => ({
        firstName: lt.tenant.firstName,
        lastName: lt.tenant.lastName,
        email: lt.tenant.email ?? undefined,
        phone: lt.tenant.phone ?? undefined,
        isPrimary: lt.isPrimary,
      })),
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    // Generate and upload PDF
    const { storageKey, url } = await generateAndUploadLeasePdf(
      templateData,
      lease.organizationId,
      lease.id
    );

    // Create document record
    const document = await prisma.document.create({
      data: {
        organizationId: lease.organizationId,
        leaseId: lease.id,
        fileName: `lease-${lease.id}.pdf`,
        fileType: 'application/pdf',
        storageKey,
        uploadedByUserId: req.auth.userId,
      },
    });

    res.status(201).json({
      data: {
        documentId: document.id,
        storageKey,
        url,
        message: 'PDF generated successfully',
      },
    });
  } catch (err) {
    next(err);
  }
});

// Send lease for signature via DocuSign
leaseRouter.post('/:id/send-for-signature', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const sendSchema = z.object({
      emailSubject: z.string().optional(),
      emailBlurb: z.string().optional(),
    });
    const data = parseBody(sendSchema, req.body);

    const lease = await prisma.lease.findFirst({
      where: { id: req.params.id, organizationId: req.auth.organizationId },
      include: {
        organization: true,
        unit: { include: { property: true } },
        tenants: { include: { tenant: true } },
      },
    });

    if (!lease) {
      throw new AppError(404, 'NOT_FOUND', 'Lease not found.');
    }

    if (lease.docusignEnvelopeId) {
      throw new AppError(400, 'BAD_REQUEST', 'Lease has already been sent for signature.');
    }

    // Check if tenants have email addresses
    const tenantsWithEmail = lease.tenants.filter((lt) => lt.tenant.email);
    if (tenantsWithEmail.length === 0) {
      throw new AppError(400, 'BAD_REQUEST', 'At least one tenant must have an email address to send for signature.');
    }

    // Generate PDF first
    const property = lease.unit.property;
    const propertyAddress = [
      property.addressLine1,
      property.addressLine2,
      property.city,
      property.state,
      property.postalCode,
    ]
      .filter(Boolean)
      .join(', ');

    const templateData: LeaseTemplateData = {
      organizationName: lease.organization.name,
      propertyName: property.name,
      propertyAddress,
      unitName: lease.unit.name,
      state: property.state,  // Include state for template selection
      bedrooms: lease.unit.bedrooms ?? undefined,
      bathrooms: lease.unit.bathrooms ?? undefined,
      squareFeet: lease.unit.squareFeet ?? undefined,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      rentAmount: lease.rentAmount.toString(),
      depositAmount: lease.depositAmount?.toString(),
      rentDueDay: lease.rentDueDay,
      tenants: lease.tenants.map((lt) => ({
        firstName: lt.tenant.firstName,
        lastName: lt.tenant.lastName,
        email: lt.tenant.email ?? undefined,
        phone: lt.tenant.phone ?? undefined,
        isPrimary: lt.isPrimary,
      })),
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };

    const { generateLeasePdf } = await import('../lib/pdf.js');
    const pdfBuffer = await generateLeasePdf(templateData);

    // Prepare signers
    const signers = tenantsWithEmail.map((lt, index) => ({
      email: lt.tenant.email!,
      name: `${lt.tenant.firstName} ${lt.tenant.lastName}`,
      routingOrder: index + 1,
    }));

    // Send to DocuSign
    const envelopeId = await sendEnvelope({
      pdfBuffer,
      fileName: `Lease Agreement - ${property.name} - ${lease.unit.name}.pdf`,
      signers,
      emailSubject: data.emailSubject || `Please sign your lease agreement for ${property.name}`,
      emailBlurb: data.emailBlurb || 'Please review and sign the attached lease agreement.',
    });

    // Update lease with DocuSign info
    await prisma.lease.update({
      where: { id: lease.id },
      data: {
        docusignEnvelopeId: envelopeId,
        signatureStatus: 'sent',
      },
    });

    res.status(201).json({
      data: {
        envelopeId,
        status: 'sent',
        message: 'Lease sent for signature successfully',
      },
    });
  } catch (err) {
    next(err);
  }
});
