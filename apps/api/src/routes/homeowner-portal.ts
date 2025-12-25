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
    // Get recent payments (if any - will be added in Phase 2)

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
        // Placeholders for future features
        recentWorkOrders: [],
        recentViolations: [],
        recentPayments: [],
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

