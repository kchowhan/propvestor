import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // Check if subscription plans exist, if not create them
  const existingPlans = await prisma.subscriptionPlan.findMany();
  let proPlan;
  
  if (existingPlans.length === 0) {
    console.log('Creating subscription plans...');
    
    await prisma.subscriptionPlan.create({
      data: {
        name: 'Free',
        slug: 'free',
        price: 0,
        billingInterval: 'monthly',
        features: { properties: true, tenants: true, leases: true, workOrders: true, reports: false, api: false },
        limits: { properties: 1, tenants: 5, users: 2, storage: 100, apiCalls: 100 },
        isActive: true,
        displayOrder: 0,
      },
    });

    await prisma.subscriptionPlan.create({
      data: {
        name: 'Basic',
        slug: 'basic',
        price: 49,
        billingInterval: 'monthly',
        features: { properties: true, tenants: true, leases: true, workOrders: true, reports: true, api: false },
        limits: { properties: 10, tenants: 50, users: 5, storage: 1000, apiCalls: 1000 },
        isActive: true,
        displayOrder: 1,
      },
    });

    proPlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Pro',
        slug: 'pro',
        price: 149,
        billingInterval: 'monthly',
        features: { properties: true, tenants: true, leases: true, workOrders: true, reports: true, api: true, advancedReports: true },
        limits: { properties: 50, tenants: 250, users: 15, storage: 10000, apiCalls: 10000 },
        isActive: true,
        displayOrder: 2,
      },
    });

    await prisma.subscriptionPlan.create({
      data: {
        name: 'Enterprise',
        slug: 'enterprise',
        price: 499,
        billingInterval: 'monthly',
        features: { properties: true, tenants: true, leases: true, workOrders: true, reports: true, api: true, advancedReports: true, sso: true, whiteLabel: true, dedicatedSupport: true },
        limits: { properties: 999999, tenants: 999999, users: 999999, storage: 999999, apiCalls: 999999 },
        isActive: true,
        displayOrder: 3,
      },
    });
    
    console.log('✓ Subscription plans created');
  } else {
    proPlan = existingPlans.find(p => p.slug === 'pro') || existingPlans[0];
    console.log('Subscription plans already exist');
  }

  const organization = await prisma.organization.create({
    data: {
      name: 'PropVestor Demo Org',
      slug: `demo-org-${Date.now().toString(36)}`,
    },
  });

  // Create a subscription for the demo organization
  const subscriptionEndDate = new Date();
  subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
  
  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      planId: proPlan!.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: subscriptionEndDate,
    },
  });
  console.log('✓ Demo organization subscription created (Pro plan)');

  // Create demo user (regular user)
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

  // Create super admin user
  const adminUser = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@propvestor.dev',
      passwordHash,
      isSuperAdmin: true,
      memberships: {
        create: {
          organizationId: organization.id,
          role: 'OWNER',
        },
      },
    },
  });
  console.log('✓ Super admin user created (admin@propvestor.dev / password123)');

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

  console.log('\n✅ Seed data created successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Demo User:   demo@propvestor.dev / password123');
  console.log('   Super Admin: admin@propvestor.dev / password123');
  console.log('\n🏢 Organization:', organization.name);
  console.log('🏠 Property:', property.name);
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
