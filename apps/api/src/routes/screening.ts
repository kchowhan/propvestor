import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery, paginationQuerySchema } from '../validators/common.js';
import { createScreeningApplication, getApplicationStatus } from '../lib/rentspree.js';
import { sendAdverseActionNotice } from '../lib/email.js';
import { createRentSpreeScreeningFee } from '../lib/organization-fees.js';

export const screeningRouter = Router();

const listQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  tenantId: z.string().uuid().optional(),
});

// Request screening for an applicant
screeningRouter.post('/request', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      tenantId: z.string().uuid(),
      propertyId: z.string().uuid().optional(),
      unitId: z.string().uuid().optional(),
      rentAmount: z.coerce.number().optional(),
    });
    const data = parseBody(schema, req.body);

    const tenant = await prisma.tenant.findFirst({
      where: {
        id: data.tenantId,
        organizationId: req.auth.organizationId,
      },
      include: { property: true, unit: true },
    });

    if (!tenant) {
      throw new AppError(404, 'NOT_FOUND', 'Tenant not found.');
    }

    if (!tenant.email) {
      throw new AppError(400, 'BAD_REQUEST', 'Email is required for screening.');
    }

    // Get property/unit info
    const propertyId = data.propertyId || tenant.propertyId;
    const unitId = data.unitId || tenant.unitId;
    let property = tenant.property;
    let unit = tenant.unit;

    if (propertyId) {
      property = await prisma.property.findFirst({
        where: { id: propertyId, organizationId: req.auth.organizationId },
      });
    }

    if (unitId) {
      const unitWithProperty = await prisma.unit.findFirst({
        where: {
          id: unitId,
          property: { organizationId: req.auth.organizationId },
        },
        include: { property: true },
      });
      if (unitWithProperty) {
        unit = unitWithProperty;
        if (!property) {
          property = unitWithProperty.property;
        }
      }
    }

    // Build property address
    const propertyAddress = property
      ? [
          property.addressLine1,
          property.addressLine2,
          property.city,
          property.state,
          property.postalCode,
        ]
          .filter(Boolean)
          .join(', ')
      : undefined;

    // Create screening application in RentSpree
    const rentspreeResponse = await createScreeningApplication({
      applicantFirstName: tenant.firstName,
      applicantLastName: tenant.lastName,
      applicantEmail: tenant.email!,
      applicantPhone: tenant.phone ?? undefined,
      propertyAddress,
      unitNumber: unit?.name,
      rentAmount: data.rentAmount,
    });

    // Create screening request record
    const screeningRequest = await prisma.screeningRequest.create({
      data: {
        organizationId: req.auth.organizationId,
        tenantId: tenant.id,
        externalRequestId: rentspreeResponse.applicationId,
        applicationUrl: rentspreeResponse.applicationUrl,
        status: rentspreeResponse.status || 'PENDING',
      },
      include: {
        tenant: true,
      },
    });

    // Create organization fee for RentSpree screening
    // Default fee: $29.95 (typical RentSpree screening fee)
    // This can be configured via environment variable or retrieved from RentSpree response
    const rentspreeFeeAmount = parseFloat(process.env.RENTSPREE_SCREENING_FEE || '29.95');
    try {
      await createRentSpreeScreeningFee(
        req.auth.organizationId,
        screeningRequest.id,
        rentspreeFeeAmount,
        `Background check for ${tenant.firstName} ${tenant.lastName}`
      );
    } catch (feeError: any) {
      // Log error but don't fail the screening request creation
      console.error('Failed to create RentSpree screening fee:', feeError);
    }

    // Update tenant status to SCREENING
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'SCREENING' },
    });

    res.status(201).json({
      data: {
        ...screeningRequest,
        applicationUrl: rentspreeResponse.applicationUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get screening request status
screeningRouter.get('/:id', async (req, res, next) => {
  try {
    const screeningRequest = await prisma.screeningRequest.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth?.organizationId,
      },
      include: {
        tenant: { include: { property: true, unit: true } },
      },
    });

    if (!screeningRequest) {
      throw new AppError(404, 'NOT_FOUND', 'Screening request not found.');
    }

    // If we have an external request ID, try to get latest status from RentSpree
    if (screeningRequest.externalRequestId && screeningRequest.status !== 'COMPLETED') {
      try {
        const rentspreeStatus = await getApplicationStatus(screeningRequest.externalRequestId);
        
        // Update local record with latest status
        await prisma.screeningRequest.update({
          where: { id: screeningRequest.id },
          data: {
            status: rentspreeStatus.status,
            recommendation: rentspreeStatus.recommendation,
            creditScore: rentspreeStatus.creditScore,
            incomeVerified: rentspreeStatus.incomeVerified,
            evictionHistory: rentspreeStatus.evictionHistory,
            criminalHistory: rentspreeStatus.criminalHistory,
            flags: rentspreeStatus.flags ? JSON.stringify(rentspreeStatus.flags) : null,
            reportPdfUrl: rentspreeStatus.reportPdfUrl,
            completedAt: rentspreeStatus.status === 'COMPLETED' ? new Date() : undefined,
          },
        });

        // Refresh from database
        const updated = await prisma.screeningRequest.findUnique({
          where: { id: screeningRequest.id },
          include: {
            tenant: { include: { property: true, unit: true } },
          },
        });

        return res.json({ data: updated });
      } catch (error) {
        // If RentSpree API fails, return cached data
        console.error('Failed to fetch status from RentSpree:', error);
      }
    }

    res.json({ data: screeningRequest });
  } catch (err) {
    next(err);
  }
});

// List all screening requests
screeningRouter.get('/', async (req, res, next) => {
  try {
    const query = parseQuery(listQuerySchema, req.query);

    const where = {
      organizationId: req.auth?.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    };

    const [screeningRequests, total] = await Promise.all([
      prisma.screeningRequest.findMany({
        where,
        include: {
          tenant: { include: { property: true, unit: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.screeningRequest.count({ where }),
    ]);

    res.json({
      data: screeningRequests,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Send adverse action notice (FCRA compliance)
screeningRouter.post('/:id/adverse-action', async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const screeningRequest = await prisma.screeningRequest.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth.organizationId,
      },
      include: {
        tenant: true,
      },
    });

    if (!screeningRequest) {
      throw new AppError(404, 'NOT_FOUND', 'Screening request not found.');
    }

    if (screeningRequest.recommendation !== 'DECLINED' && screeningRequest.recommendation !== 'BORDERLINE') {
      throw new AppError(400, 'BAD_REQUEST', 'Adverse action can only be sent for DECLINED or BORDERLINE recommendations.');
    }

    const tenant = screeningRequest.tenant;
    if (!tenant || !tenant.email) {
      throw new AppError(400, 'BAD_REQUEST', 'No contact information available.');
    }

    // Get organization name for email
    const organization = await prisma.organization.findUnique({
      where: { id: req.auth.organizationId },
    });

    // Get property address if available
    let propertyAddress: string | undefined;
    if (tenant.propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: tenant.propertyId },
      });
      if (property) {
        propertyAddress = [
          property.addressLine1,
          property.addressLine2,
          property.city,
          property.state,
          property.postalCode,
        ]
          .filter(Boolean)
          .join(', ');
      }
    }

    // Parse flags if stored as JSON string
    let flags: string[] = [];
    if (screeningRequest.flags) {
      try {
        flags = typeof screeningRequest.flags === 'string' 
          ? JSON.parse(screeningRequest.flags) 
          : screeningRequest.flags;
      } catch {
        flags = [];
      }
    }

    // Send adverse action notice email
    try {
      await sendAdverseActionNotice(tenant.email, {
        applicantName: `${tenant.firstName} ${tenant.lastName}`,
        propertyAddress,
        recommendation: screeningRequest.recommendation as 'DECLINED' | 'BORDERLINE',
        creditScore: screeningRequest.creditScore ?? undefined,
        evictionHistory: screeningRequest.evictionHistory ?? undefined,
        criminalHistory: screeningRequest.criminalHistory ?? undefined,
        incomeVerified: screeningRequest.incomeVerified ?? undefined,
        flags: flags.length > 0 ? flags : undefined,
        reportPdfUrl: screeningRequest.reportPdfUrl ?? undefined,
        organizationName: organization?.name || 'Property Management',
        // Note: Add organization contact info to Organization model if needed
        organizationContact: undefined,
        // Note: Update with actual RentSpree contact info when available
        rentspreeContactInfo: {
          name: 'RentSpree / TransUnion',
          address: 'P.O. Box 2000, Chester, PA 19016',
          phone: '1-800-916-8800',
          email: 'support@rentspree.com',
        },
      });
    } catch (emailError) {
      // Log error but don't fail the request - record is still updated
      console.error('Failed to send adverse action notice email:', emailError);
      // Continue to update the record even if email fails
    }

    // Update record
    await prisma.screeningRequest.update({
      where: { id: screeningRequest.id },
      data: {
        adverseActionSent: true,
        adverseActionSentAt: new Date(),
      },
    });

    res.json({
      data: {
        message: 'Adverse action notice sent',
        sentAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
});
