import { PrismaClient } from '@prisma/client';

// Use the same Prisma instance from the app
export { prisma } from '../lib/prisma.js';

import { prisma } from '../lib/prisma.js';

export const createTestUser = async (data?: {
  email?: string;
  name?: string;
  passwordHash?: string;
}) => {
  const uuid = require('crypto').randomUUID();
  return prisma.user.create({
    data: {
      email: data?.email || `test-${uuid}@test.com`,
      name: data?.name || 'Test User',
      passwordHash: data?.passwordHash || 'hashed-password',
    },
  });
};

export const createTestOrganization = async (data?: {
  name?: string;
  slug?: string;
}) => {
  const uuid = require('crypto').randomUUID();
  return prisma.organization.create({
    data: {
      name: data?.name || 'Test Organization',
      slug: data?.slug || `test-org-${uuid}`,
    },
  });
};

export const createTestMembership = async (
  userId: string,
  organizationId: string,
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'VIEWER' = 'OWNER'
) => {
  return prisma.organizationMembership.create({
    data: {
      userId,
      organizationId,
      role,
    },
  });
};

// Helper function to clean up all test data in the correct order
export const cleanupTestData = async () => {
  // Delete in order of dependencies (children first, then parents)
  // Wrap each delete in try-catch to handle cases where records don't exist
  
  // Phase 2 models (Investment Management) - delete in dependency order
  try { await prisma.distribution.deleteMany(); } catch {}
  try { await prisma.capitalContribution.deleteMany(); } catch {}
  try { await prisma.valuationSnapshot.deleteMany(); } catch {}
  try { await prisma.ownership.deleteMany(); } catch {}
  try { await prisma.investor.deleteMany(); } catch {}
  try { await prisma.investmentEntity.deleteMany(); } catch {}
  
  // Reconciliation (matches before reconciliation, before bank transactions)
  try { await prisma.reconciliationMatch.deleteMany(); } catch {}
  try { await prisma.reconciliation.deleteMany(); } catch {}
  try { await prisma.bankTransaction.deleteMany(); } catch {}
  
  // Payment methods and screening (reference tenants and organizations)
  try { await prisma.tenantPaymentMethod.deleteMany(); } catch {}
  try { await prisma.screeningRequest.deleteMany(); } catch {}
  
  // Documents (must be deleted before users due to uploadedByUserId foreign key)
  try { await prisma.document.deleteMany(); } catch {}
  
  // Payments (reference charges, tenants, organizations)
  try { await prisma.payment.deleteMany(); } catch {}
  // Charges (reference leases, properties, units, organizations)
  try { await prisma.charge.deleteMany(); } catch {}
  
  // Leases (must delete LeaseTenant before Tenant and Lease)
  try { await prisma.leaseTenant.deleteMany(); } catch {}
  try { await prisma.lease.deleteMany(); } catch {}
  
  // Work orders (reference properties, units, vendors, organizations)
  try { await prisma.workOrder.deleteMany(); } catch {}
  // Vendors (reference organizations)
  try { await prisma.vendor.deleteMany(); } catch {}
  
  // Tenants (after LeaseTenant is deleted, reference properties, units, organizations)
  try { await prisma.tenant.deleteMany(); } catch {}
  
  // Units (reference properties)
  try { await prisma.unit.deleteMany(); } catch {}
  // Properties (reference organizations)
  try { await prisma.property.deleteMany(); } catch {}
  
  // SaaS - Subscriptions (invoices before subscriptions, subscriptions before plans)
  try { await prisma.invoice.deleteMany(); } catch {}
  try { await prisma.subscription.deleteMany(); } catch {}
  // Note: We don't delete subscription plans as they're shared across organizations
  
  // Organization fees (reference charges, payments, screening requests)
  try { await prisma.organizationFee.deleteMany(); } catch {}
  
  // Delete memberships before users and organizations (memberships reference both)
  try { await prisma.organizationMembership.deleteMany(); } catch {}
  // Delete users before organizations (users may have documents/reconciliations)
  try { await prisma.user.deleteMany(); } catch {}
  // Organizations last (everything references them)
  try { await prisma.organization.deleteMany(); } catch {}
};

