import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { requireHomeownerAuth } from '../middleware/homeowner-auth.js';

export const homeownerPortalRouter = Router();

// All portal routes require homeowner authentication
homeownerPortalRouter.use(requireHomeownerAuth);

// Get homeowner dashboard data
homeownerPortalRouter.get('/dashboard', async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { id: req.homeownerAuth.homeownerId },
      include: {
        association: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            phone: true,
            email: true,
          },
        },
        unit: {
          include: {
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
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    if (homeowner.archivedAt) {
      throw new AppError(403, 'FORBIDDEN', 'Your account has been archived.');
    }

    // Get recent work orders (if any - will be added in Phase 2)
    // Get recent violations (if any - will be added in Phase 3)
    
    // Get recent payments
    const recentPayments = await prisma.homeownerPayment.findMany({
      where: { homeownerId: homeowner.id },
      include: {
        hoaFee: {
          select: {
            id: true,
            type: true,
            description: true,
            amount: true,
          },
        },
      },
      orderBy: { receivedDate: 'desc' },
      take: 5,
    });

    // Get pending HOA fees
    const pendingFees = await prisma.hOAFee.findMany({
      where: {
        homeownerId: homeowner.id,
        status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    res.json({
      data: {
        homeowner: {
          id: homeowner.id,
          firstName: homeowner.firstName,
          lastName: homeowner.lastName,
          email: homeowner.email,
          phone: homeowner.phone,
          status: homeowner.status,
          accountBalance: homeowner.accountBalance,
          emailVerified: homeowner.emailVerified,
        },
        association: homeowner.association,
        unit: homeowner.unit,
        property: homeowner.property,
        // Recent data
        recentWorkOrders: [], // Will be added when maintenance requests are implemented
        recentViolations: [], // Will be added in Phase 3
        recentPayments: recentPayments.map((p) => ({
          id: p.id,
          amount: p.amount,
          receivedDate: p.receivedDate,
          method: p.method,
          hoaFee: p.hoaFee,
        })),
        pendingFees: pendingFees.map((f) => ({
          id: f.id,
          type: f.type,
          description: f.description,
          amount: f.amount,
          dueDate: f.dueDate,
          status: f.status,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get account balance
homeownerPortalRouter.get('/balance', async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { id: req.homeownerAuth.homeownerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        accountBalance: true,
        status: true,
      },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    res.json({
      data: {
        homeownerId: homeowner.id,
        name: `${homeowner.firstName} ${homeowner.lastName}`,
        email: homeowner.email,
        accountBalance: homeowner.accountBalance,
        status: homeowner.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get documents (association documents visible to homeowners)
homeownerPortalRouter.get('/documents', async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { id: req.homeownerAuth.homeownerId },
      include: {
        association: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    // Get documents for the association (via organization)
    // For now, return empty - will be enhanced when document sharing is implemented
    const documents = await prisma.document.findMany({
      where: {
        organizationId: homeowner.association.organizationId,
        // Future: Add document visibility/sharing logic
        // For now, homeowners can see association-level documents
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
      take: 50, // Limit to recent documents
    });

    res.json({
      data: documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        uploadedAt: doc.uploadedAt,
        uploadedBy: doc.uploadedBy,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Get HOA fees for homeowner
homeownerPortalRouter.get('/fees', async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { id: req.homeownerAuth.homeownerId },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    const query = req.query;
    const where: any = {
      homeownerId: homeowner.id,
    };

    // Filter by status if provided
    if (query.status && typeof query.status === 'string') {
      where.status = query.status;
    }

    const fees = await prisma.hOAFee.findMany({
      where,
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            receivedDate: true,
            method: true,
          },
          orderBy: { receivedDate: 'desc' },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    // Calculate paid amount for each fee
    const feesWithPaidAmount = fees.map((fee) => {
      const paidAmount = fee.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        ...fee,
        paidAmount,
        remainingAmount: Number(fee.amount) - paidAmount,
      };
    });

    res.json({
      data: feesWithPaidAmount,
    });
  } catch (err) {
    next(err);
  }
});

// Get payment history for homeowner
homeownerPortalRouter.get('/payments', async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { id: req.homeownerAuth.homeownerId },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    const payments = await prisma.homeownerPayment.findMany({
      where: { homeownerId: homeowner.id },
      include: {
        hoaFee: {
          select: {
            id: true,
            type: true,
            description: true,
            amount: true,
            dueDate: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
            type: true,
            last4: true,
            cardBrand: true,
            bankName: true,
          },
        },
      },
      orderBy: { receivedDate: 'desc' },
      take: 50, // Limit to recent payments
    });

    res.json({
      data: payments,
    });
  } catch (err) {
    next(err);
  }
});

// Get homeowner's maintenance requests
homeownerPortalRouter.get('/maintenance-requests', async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const homeowner = await prisma.homeowner.findUnique({
      where: { id: req.homeownerAuth.homeownerId },
      include: {
        association: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    const workOrders = await prisma.workOrder.findMany({
      where: {
        requestedByHomeownerId: homeowner.id,
        organizationId: homeowner.association.organizationId,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedVendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
    });

    res.json({
      data: workOrders,
    });
  } catch (err) {
    next(err);
  }
});

// Submit maintenance request
homeownerPortalRouter.post('/maintenance-requests', async (req, res, next) => {
  try {
    if (!req.homeownerAuth) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing auth context.');
    }

    const schema = z.object({
      propertyId: z.string().uuid(),
      unitId: z.string().uuid().optional().nullable(),
      title: z.string().min(1),
      description: z.string().min(1),
      category: z.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCE', 'LANDSCAPING', 'PAINTING', 'CARPENTRY', 'ROOFING', 'FLOORING', 'GENERAL', 'OTHER']),
      priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']).optional(),
    });

    const data = parseBody(schema, req.body);

    const homeowner = await prisma.homeowner.findUnique({
      where: { id: req.homeownerAuth.homeownerId },
      include: {
        association: {
          select: {
            organizationId: true,
          },
        },
        unit: {
          select: {
            propertyId: true,
          },
        },
        property: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!homeowner) {
      throw new AppError(404, 'NOT_FOUND', 'Homeowner not found.');
    }

    // Verify property belongs to homeowner's association's organization
    const property = await prisma.property.findFirst({
      where: {
        id: data.propertyId,
        organizationId: homeowner.association.organizationId,
      },
    });

    if (!property) {
      throw new AppError(404, 'NOT_FOUND', 'Property not found.');
    }

    // Verify unit if provided
    if (data.unitId) {
      const unit = await prisma.unit.findFirst({
        where: {
          id: data.unitId,
          propertyId: data.propertyId,
        },
      });

      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', 'Unit not found.');
      }
    }

    // Create work order
    const workOrder = await prisma.workOrder.create({
      data: {
        organizationId: homeowner.association.organizationId,
        propertyId: data.propertyId,
        unitId: data.unitId ?? undefined,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority ?? 'NORMAL',
        status: 'OPEN',
        requestedByHomeownerId: homeowner.id,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Send email notification to property manager
    try {
      const { sendMaintenanceRequestNotification } = await import('../lib/email.js');
      const organization = await prisma.organization.findUnique({
        where: { id: homeowner.association.organizationId },
        select: { name: true },
      });

      await sendMaintenanceRequestNotification(
        homeowner.email,
        `${homeowner.firstName} ${homeowner.lastName}`,
        workOrder.property.name,
        workOrder.unit?.name || null,
        workOrder.title,
        workOrder.description,
        workOrder.category,
        workOrder.priority,
        workOrder.id,
        organization?.name || 'Your Association'
      );
    } catch (emailError) {
      console.error('Failed to send maintenance request notification:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      data: workOrder,
      message: 'Maintenance request submitted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

