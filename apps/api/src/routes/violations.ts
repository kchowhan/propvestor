import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { parseBody, parseQuery } from '../validators/common.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { optionalHomeownerAuth } from '../middleware/homeowner-auth.js';

export const violationRouter = Router();

const createViolationSchema = z.object({
  associationId: z.string().uuid(),
  homeownerId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  type: z.string().min(1), // e.g., 'NOISE', 'PARKING', 'TRASH', 'LANDSCAPING', 'ARCHITECTURAL', 'PET', 'OTHER'
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL']).default('MINOR'),
  description: z.string().min(1),
  violationDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateViolationSchema = z.object({
  type: z.string().min(1).optional(),
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL']).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'APPEALED', 'CLOSED']).optional(),
  resolvedDate: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
});

const querySchema = z.object({
  associationId: z.string().uuid().optional(),
  homeownerId: z.string().uuid().or(z.literal('current')).optional(),
  unitId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'APPEALED', 'CLOSED']).optional(),
  severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL']).optional(),
  type: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// List violations
violationRouter.get('/', optionalHomeownerAuth, optionalAuth, async (req, res, next) => {
  try {
    const query = parseQuery(querySchema, req.query);
    const where: any = {};

    // Check if this is a homeowner portal request
    if (req.homeownerAuth && query.homeownerId === 'current') {
      // Homeowner portal access - only show their own violations
      where.homeownerId = req.homeownerAuth.homeownerId;
      where.associationId = req.homeownerAuth.associationId;
    } else {
      // Property manager access - require regular auth
      if (!req.auth) {
        throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context. Property manager access requires authentication.');
      }

      // Filter by association (must have access)
      if (query.associationId) {
        // Verify user has access to this association
        const association = await prisma.association.findFirst({
          where: {
            id: query.associationId,
            organization: {
              memberships: {
                some: {
                  userId: req.auth.userId,
                },
              },
            },
          },
        });

        if (!association) {
          throw new AppError(403, 'FORBIDDEN', 'Access denied to this association.');
        }

        where.associationId = query.associationId;
      } else {
        // If no associationId specified, filter by user's accessible associations
        const userOrgs = await prisma.organizationMembership.findMany({
          where: { userId: req.auth.userId },
          select: { organizationId: true },
        });

        const orgIds = userOrgs.map((m) => m.organizationId);
        const associations = await prisma.association.findMany({
          where: { organizationId: { in: orgIds } },
          select: { id: true },
        });

        where.associationId = { in: associations.map((a) => a.id) };
      }

      if (query.homeownerId && query.homeownerId !== 'current') {
        where.homeownerId = query.homeownerId;
      }
    }

    if (query.unitId) {
      where.unitId = query.unitId;
    }

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.type) {
      where.type = { contains: query.type, mode: 'insensitive' };
    }

    const [violations, total] = await Promise.all([
      prisma.violation.findMany({
        where,
        include: {
          association: {
            select: {
              id: true,
              name: true,
            },
          },
          homeowner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
          property: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              fileType: true,
              storageKey: true,
            },
          },
          letters: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Get most recent letter
            select: {
              id: true,
              letterType: true,
              sentDate: true,
            },
          },
          _count: {
            select: {
              documents: true,
              letters: true,
            },
          },
        },
        orderBy: { violationDate: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.violation.count({ where }),
    ]);

    res.json({
      data: violations,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single violation
violationRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const violation = await prisma.violation.findUnique({
      where: { id: req.params.id },
      include: {
        association: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        homeowner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            unit: {
              select: {
                id: true,
                name: true,
                property: {
                  select: {
                    id: true,
                    name: true,
                    addressLine1: true,
                    addressLine2: true,
                    city: true,
                    state: true,
                    postalCode: true,
                  },
                },
              },
            },
            property: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
              },
            },
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
            property: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
              },
            },
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        letters: {
          orderBy: { createdAt: 'desc' },
          include: {
            sentBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!violation) {
      throw new AppError(404, 'NOT_FOUND', 'Violation not found.');
    }

    // Verify user has access to this association
    const association = await prisma.association.findFirst({
      where: {
        id: violation.associationId,
        organization: {
          memberships: {
            some: {
              userId: req.auth.userId,
            },
          },
        },
      },
    });

    if (!association) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this violation.');
    }

    res.json({ data: violation });
  } catch (error) {
    next(error);
  }
});

// Create violation
violationRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const body = parseBody(createViolationSchema, req.body);

    // Verify user has access to this association
    const association = await prisma.association.findFirst({
      where: {
        id: body.associationId,
        organization: {
          memberships: {
            some: {
              userId: req.auth.userId,
            },
          },
        },
      },
    });

    if (!association) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this association.');
    }

    // Verify homeowner exists and belongs to association
    const homeowner = await prisma.homeowner.findFirst({
      where: {
        id: body.homeownerId,
        associationId: body.associationId,
      },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found in this association.');
    }

    // Verify unit/property if provided
    if (body.unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: body.unitId,
          property: {
            organization: {
              memberships: {
                some: {
                  userId: req.auth.userId,
                },
              },
            },
          },
        },
      });

      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
      }
    }

    if (body.propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: body.propertyId,
          organization: {
            memberships: {
              some: {
                userId: req.auth.userId,
              },
            },
          },
        },
      });

      if (!property) {
        throw new AppError(404, 'NOT_FOUND', 'Property not found.');
      }
    }

    const violation = await prisma.violation.create({
      data: {
        associationId: body.associationId,
        homeownerId: body.homeownerId,
        unitId: body.unitId,
        propertyId: body.propertyId,
        type: body.type,
        severity: body.severity,
        description: body.description,
        violationDate: body.violationDate ? new Date(body.violationDate) : new Date(),
        createdByUserId: req.auth.userId,
        notes: body.notes,
      },
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
        homeowner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({ data: violation });
  } catch (error) {
    next(error);
  }
});

// Update violation
violationRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const body = parseBody(updateViolationSchema, req.body);

    // Get violation and verify access
    const violation = await prisma.violation.findUnique({
      where: { id: req.params.id },
      include: {
        association: {
          include: {
            organization: {
              include: {
                memberships: {
                  where: { userId: req.auth.userId },
                },
              },
            },
          },
        },
      },
    });

    if (!violation) {
      throw new AppError(404, 'NOT_FOUND', 'Violation not found.');
    }

    if (violation.association.organization.memberships.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this violation.');
    }

    const updateData: any = {};

    if (body.type !== undefined) updateData.type = body.type;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.resolvedDate !== undefined) {
      updateData.resolvedDate = body.resolvedDate ? new Date(body.resolvedDate) : null;
      // If status is RESOLVED and resolvedDate is not set, set it
      if (body.status === 'RESOLVED' && !updateData.resolvedDate) {
        updateData.resolvedDate = new Date();
      }
    }
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await prisma.violation.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        association: {
          select: {
            id: true,
            name: true,
          },
        },
        homeowner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

// Delete violation
violationRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Get violation and verify access
    const violation = await prisma.violation.findUnique({
      where: { id: req.params.id },
      include: {
        association: {
          include: {
            organization: {
              include: {
                memberships: {
                  where: { userId: req.auth.userId },
                },
              },
            },
          },
        },
      },
    });

    if (!violation) {
      throw new AppError(404, 'NOT_FOUND', 'Violation not found.');
    }

    if (violation.association.organization.memberships.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this violation.');
    }

    await prisma.violation.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==================== Violation Letters ====================

const createViolationLetterSchema = z.object({
  violationId: z.string().uuid(),
  letterType: z.enum(['FIRST_NOTICE', 'SECOND_NOTICE', 'FINAL_NOTICE', 'HEARING_NOTICE', 'CUSTOM']).default('FIRST_NOTICE'),
  subject: z.string().min(1),
  content: z.string().min(1), // HTML or plain text
  notes: z.string().optional(),
});

const sendLetterSchema = z.object({
  letterId: z.string().uuid(),
  sendEmail: z.boolean().default(true),
});

// List letters for a violation
violationRouter.get('/:violationId/letters', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    // Verify violation exists and user has access
    const violation = await prisma.violation.findUnique({
      where: { id: req.params.violationId },
      include: {
        association: {
          include: {
            organization: {
              include: {
                memberships: {
                  where: { userId: req.auth.userId },
                },
              },
            },
          },
        },
      },
    });

    if (!violation) {
      throw new AppError(404, 'NOT_FOUND', 'Violation not found.');
    }

    if (violation.association.organization.memberships.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this violation.');
    }

    const letters = await prisma.violationLetter.findMany({
      where: { violationId: req.params.violationId },
      include: {
        sentBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: letters });
  } catch (error) {
    next(error);
  }
});

// Get single letter
violationRouter.get('/letters/:letterId', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const letter = await prisma.violationLetter.findUnique({
      where: { id: req.params.letterId },
      include: {
        violation: {
          include: {
            association: {
              include: {
                organization: {
                  include: {
                    memberships: {
                      where: { userId: req.auth.userId },
                    },
                  },
                },
              },
            },
          },
        },
        sentBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!letter) {
      throw new AppError(404, 'NOT_FOUND', 'Letter not found.');
    }

    if (letter.violation.association.organization.memberships.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this letter.');
    }

    res.json({ data: letter });
  } catch (error) {
    next(error);
  }
});

// Create violation letter
violationRouter.post('/:violationId/letters', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const body = parseBody(createViolationLetterSchema, req.body);

    // Verify violation exists and user has access
    const violation = await prisma.violation.findUnique({
      where: { id: req.params.violationId },
      include: {
        association: {
          include: {
            organization: {
              include: {
                memberships: {
                  where: { userId: req.auth.userId },
                },
              },
            },
          },
        },
        homeowner: true,
      },
    });

    if (!violation) {
      throw new AppError(404, 'NOT_FOUND', 'Violation not found.');
    }

    if (violation.association.organization.memberships.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this violation.');
    }

    if (body.violationId !== req.params.violationId) {
      throw new AppError(400, 'BAD_REQUEST', 'Violation ID mismatch.');
    }

    const letter = await prisma.violationLetter.create({
      data: {
        violationId: body.violationId,
        letterType: body.letterType,
        subject: body.subject,
        content: body.content,
        notes: body.notes,
      },
      include: {
        violation: {
          include: {
            homeowner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        sentBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({ data: letter });
  } catch (error) {
    next(error);
  }
});

// Send violation letter (email + optionally generate PDF)
violationRouter.post('/letters/:letterId/send', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const body = parseBody(sendLetterSchema, req.body);

    const letter = await prisma.violationLetter.findUnique({
      where: { id: req.params.letterId },
      include: {
        violation: {
          include: {
            association: {
              include: {
                organization: {
                  include: {
                    memberships: {
                      where: { userId: req.auth.userId },
                    },
                  },
                },
              },
            },
            homeowner: {
              include: {
                unit: {
                  include: {
                    property: true,
                  },
                },
                property: true,
              },
            },
            unit: {
              include: {
                property: true,
              },
            },
            property: true,
          },
        },
        sentBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!letter) {
      throw new AppError(404, 'NOT_FOUND', 'Letter not found.');
    }

    if (letter.violation.association.organization.memberships.length === 0) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied to this letter.');
    }

    if (body.letterId !== req.params.letterId) {
      throw new AppError(400, 'BAD_REQUEST', 'Letter ID mismatch.');
    }

    const updateData: any = {
      sentDate: new Date(),
      sentByUserId: req.auth.userId,
    };

    // Generate PDF
    const { generateAndUploadViolationLetterPdf } = await import('../lib/pdf.js');
    
    // Get association details for template
    const association = await prisma.association.findUnique({
      where: { id: letter.violation.associationId },
    });

    if (!association) {
      throw new AppError(404, 'NOT_FOUND', 'Association not found.');
    }

    // Build homeowner address
    const homeownerAddress = letter.violation.homeowner.unit?.property
      ? [
          letter.violation.homeowner.unit.property.addressLine1,
          letter.violation.homeowner.unit.property.addressLine2,
          letter.violation.homeowner.unit.property.city,
          letter.violation.homeowner.unit.property.state,
          letter.violation.homeowner.unit.property.postalCode,
        ].filter(Boolean).join(', ')
      : letter.violation.homeowner.property
      ? [
          letter.violation.homeowner.property.addressLine1,
          letter.violation.homeowner.property.addressLine2,
          letter.violation.homeowner.property.city,
          letter.violation.homeowner.property.state,
          letter.violation.homeowner.property.postalCode,
        ].filter(Boolean).join(', ')
      : '';

    // Build property address
    const propertyAddress = letter.violation.unit?.property
      ? [
          letter.violation.unit.property.addressLine1,
          letter.violation.unit.property.addressLine2,
          letter.violation.unit.property.city,
          letter.violation.unit.property.state,
          letter.violation.unit.property.postalCode,
        ].filter(Boolean).join(', ')
      : letter.violation.property
      ? [
          letter.violation.property.addressLine1,
          letter.violation.property.addressLine2,
          letter.violation.property.city,
          letter.violation.property.state,
          letter.violation.property.postalCode,
        ].filter(Boolean).join(', ')
      : '';

    const associationAddress = [
      association.addressLine1,
      association.addressLine2,
    ].filter(Boolean).join(', ');

    const templateData = {
      associationName: association.name,
      associationAddress,
      associationCity: association.city || '',
      associationState: association.state || '',
      associationPostalCode: association.postalCode || '',
      homeownerName: `${letter.violation.homeowner.firstName} ${letter.violation.homeowner.lastName}`,
      homeownerAddress: homeownerAddress || 'Address not available',
      violationType: letter.violation.type,
      violationSeverity: letter.violation.severity,
      violationDescription: letter.violation.description,
      violationDate: letter.violation.violationDate.toISOString(),
      letterType: letter.letterType,
      subject: letter.subject,
      content: letter.content,
      sentDate: new Date().toISOString(),
      propertyName: letter.violation.unit?.property?.name || letter.violation.property?.name,
      unitName: letter.violation.unit?.name,
      propertyAddress,
    };

    const { storageKey, url } = await generateAndUploadViolationLetterPdf(
      templateData,
      letter.violation.associationId,
      letter.violation.id,
      letter.id
    );

    updateData.pdfStorageKey = storageKey;
    updateData.pdfUrl = url;

    // Send email if requested
    if (body.sendEmail && letter.violation.homeowner.email) {
      const { sendEmail } = await import('../lib/email.js');
      
      // Create email with PDF attachment info
      const emailContent = `
${letter.content}

---
This violation notice has been generated and a PDF copy is available for your records.
If you have any questions, please contact the association management.
      `.trim();

      const emailHtml = `
${letter.content.replace(/\n/g, '<br>')}

<hr>
<p style="color: #666; font-size: 12px;">
This violation notice has been generated and a PDF copy is available for your records.<br>
If you have any questions, please contact the association management.
</p>
      `;

      const emailSent = await sendEmail(
        letter.violation.homeowner.email,
        letter.subject,
        emailContent,
        emailHtml
      );

      if (emailSent) {
        updateData.emailSent = true;
        updateData.emailSentAt = new Date();
      }
    }

    const updated = await prisma.violationLetter.update({
      where: { id: req.params.letterId },
      data: updateData,
      include: {
        violation: {
          include: {
            homeowner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        sentBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

