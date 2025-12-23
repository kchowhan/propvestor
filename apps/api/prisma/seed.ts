import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  const organization = await prisma.organization.create({
    data: {
      name: 'PropVestor Demo Org',
      slug: `demo-org-${Date.now().toString(36)}`,
    },
  });

  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@propvestor.dev',
      passwordHash,
      memberships: {
        create: {
          organizationId: organization.id,
          role: 'OWNER',
        },
      },
    },
  });

  const property = await prisma.property.create({
    data: {
      organizationId: organization.id,
      name: '123 Main St',
      addressLine1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA',
      type: 'SINGLE_FAMILY',
      status: 'ACTIVE',
    },
  });

  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: 'Main Unit',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1600,
      marketRent: 2400,
      status: 'OCCUPIED',
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      organizationId: organization.id,
      firstName: 'Jordan',
      lastName: 'Lee',
      email: 'jordan.lee@example.com',
      phone: '555-0101',
    },
  });

  const lease = await prisma.lease.create({
    data: {
      organizationId: organization.id,
      unitId: unit.id,
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(new Date().getFullYear(), 11, 31),
      rentAmount: 2400,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant.id, isPrimary: true }],
      },
    },
  });

  const charge = await prisma.charge.create({
    data: {
      organizationId: organization.id,
      leaseId: lease.id,
      unitId: unit.id,
      type: 'RENT',
      description: 'Seed rent charge',
      amount: 2400,
      dueDate: new Date(),
      status: 'PENDING',
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: organization.id,
      leaseId: lease.id,
      chargeId: charge.id,
      amount: 1200,
      receivedDate: new Date(),
      method: 'MANUAL',
      reference: 'Seed payment',
    },
  });

  await prisma.workOrder.create({
    data: {
      organizationId: organization.id,
      propertyId: property.id,
      unitId: unit.id,
      title: 'HVAC inspection',
      description: 'Seasonal HVAC maintenance check',
      priority: 'NORMAL',
      status: 'OPEN',
      openedAt: new Date(),
    },
  });

  console.log('Seed data created:', { organization: organization.id, user: user.email });
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
