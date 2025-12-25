import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  console.log('🌱 Starting seed...\n');
  
  // Clear existing data (optional - comment out if you want to preserve data)
  console.log('🗑️  Clearing existing data...');
  try {
    await prisma.boardMember.deleteMany();
    await prisma.homeowner.deleteMany();
    await prisma.association.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.charge.deleteMany();
    await prisma.leaseTenant.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.organizationMembership.deleteMany();
    await prisma.organization.deleteMany();
    // Delete all users except super admin
    await prisma.user.deleteMany({ where: { email: { not: 'admin@propvestor.dev' } } });
    console.log('  ✓ Existing data cleared\n');
  } catch (err) {
    console.log('  ⚠ Could not clear all data (some may not exist):', (err as Error).message);
  }
  
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // Check if subscription plans exist, if not create them
  const existingPlans = await prisma.subscriptionPlan.findMany();
  let freePlan, basicPlan, proPlan, enterprisePlan;
  
  if (existingPlans.length === 0) {
    console.log('Creating subscription plans...');
    
    freePlan = await prisma.subscriptionPlan.create({
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

    basicPlan = await prisma.subscriptionPlan.create({
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

    enterprisePlan = await prisma.subscriptionPlan.create({
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
    freePlan = existingPlans.find(p => p.slug === 'free') || existingPlans[0];
    basicPlan = existingPlans.find(p => p.slug === 'basic') || existingPlans[0];
    proPlan = existingPlans.find(p => p.slug === 'pro') || existingPlans[0];
    enterprisePlan = existingPlans.find(p => p.slug === 'enterprise') || existingPlans[0];
    console.log('✓ Subscription plans already exist');
  }

  // ============================================================================
  // ORGANIZATION 1 - PropVestor Demo Org (Basic Plan - 2 properties)
  // ============================================================================
  console.log('\n📦 Creating Organization 1: PropVestor Demo Org...');
  
  const org1 = await prisma.organization.create({
    data: {
      name: 'PropVestor Demo Org',
      slug: `demo-org-${Date.now().toString(36)}`,
    },
  });

  // Create subscription for org1 (Basic plan - suitable for 2 properties)
  const subscriptionEndDate1 = new Date();
  subscriptionEndDate1.setFullYear(subscriptionEndDate1.getFullYear() + 1);
  
  await prisma.subscription.create({
    data: {
      organizationId: org1.id,
      planId: basicPlan!.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: subscriptionEndDate1,
    },
  });
  console.log('  ✓ Basic plan subscription created (2 properties)');

  // Create users for org1
  const demoUser = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'demo@propvestor.dev',
      passwordHash,
      memberships: {
        create: {
          organizationId: org1.id,
          role: 'OWNER',
        },
      },
    },
  });

  // Create or update super admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@propvestor.dev' },
    update: {
      name: 'Super Admin',
      passwordHash,
      isSuperAdmin: true,
    },
    create: {
      name: 'Super Admin',
      email: 'admin@propvestor.dev',
      passwordHash,
      isSuperAdmin: true,
      memberships: {
        create: {
          organizationId: org1.id,
          role: 'OWNER',
        },
      },
    },
  });
  
  // Ensure super admin has membership in org1
  const existingMembership = await prisma.organizationMembership.findFirst({
    where: {
      userId: adminUser.id,
      organizationId: org1.id,
    },
  });
  
  if (!existingMembership) {
    await prisma.organizationMembership.create({
      data: {
        userId: adminUser.id,
        organizationId: org1.id,
        role: 'OWNER',
      },
    });
  }

  const org1Manager = await prisma.user.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah@propvestor.dev',
      passwordHash,
      memberships: {
        create: {
          organizationId: org1.id,
          role: 'MANAGER',
        },
      },
    },
  });
  console.log('  ✓ 3 users created');

  // Create properties for org1
  const property1 = await prisma.property.create({
    data: {
      organizationId: org1.id,
      name: 'Sunset Apartments',
      addressLine1: '123 Main St',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA',
      type: 'MULTI_FAMILY',
      status: 'ACTIVE',
    },
  });

  const property2 = await prisma.property.create({
    data: {
      organizationId: org1.id,
      name: 'Oak Street Duplex',
      addressLine1: '456 Oak Street',
      city: 'Austin',
      state: 'TX',
      postalCode: '78702',
      country: 'USA',
      type: 'MULTI_FAMILY',
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ 2 properties created');

  // Create units for property1
  const unit1A = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      name: 'Unit 101',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 900,
      marketRent: 1800,
      status: 'OCCUPIED',
    },
  });

  const unit1B = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      name: 'Unit 102',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1200,
      marketRent: 2400,
      status: 'OCCUPIED',
    },
  });

  const unit1C = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      name: 'Unit 103',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 650,
      marketRent: 1400,
      status: 'VACANT',
    },
  });

  // Create units for property2
  const unit2A = await prisma.unit.create({
    data: {
      propertyId: property2.id,
      name: 'Unit A',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1500,
      marketRent: 2600,
      status: 'OCCUPIED',
    },
  });

  const unit2B = await prisma.unit.create({
    data: {
      propertyId: property2.id,
      name: 'Unit B',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1500,
      marketRent: 2600,
      status: 'UNDER_RENOVATION',
    },
  });
  console.log('  ✓ 5 units created');

  // Create tenants for org1
  const tenant1 = await prisma.tenant.create({
    data: {
      organizationId: org1.id,
      firstName: 'Jordan',
      lastName: 'Lee',
      email: 'jordan.lee@example.com',
      phone: '555-0101',
      status: 'ACTIVE',
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      organizationId: org1.id,
      firstName: 'Emily',
      lastName: 'Martinez',
      email: 'emily.martinez@example.com',
      phone: '555-0102',
      status: 'ACTIVE',
    },
  });

  const tenant3 = await prisma.tenant.create({
    data: {
      organizationId: org1.id,
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@example.com',
      phone: '555-0103',
      status: 'ACTIVE',
    },
  });

  const tenant4 = await prisma.tenant.create({
    data: {
      organizationId: org1.id,
      firstName: 'Alex',
      lastName: 'Taylor',
      email: 'alex.taylor@example.com',
      phone: '555-0104',
      status: 'PROSPECT',
    },
  });
  console.log('  ✓ 4 tenants created');

  // Create leases for org1
  const lease1 = await prisma.lease.create({
    data: {
      organizationId: org1.id,
      unitId: unit1A.id,
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(new Date().getFullYear() + 1, 0, 1),
      rentAmount: 1800,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant1.id, isPrimary: true }],
      },
    },
  });

  const lease2 = await prisma.lease.create({
    data: {
      organizationId: org1.id,
      unitId: unit1B.id,
      startDate: new Date(new Date().getFullYear(), 2, 1),
      endDate: new Date(new Date().getFullYear() + 1, 2, 1),
      rentAmount: 2400,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant2.id, isPrimary: true }],
      },
    },
  });

  const lease3 = await prisma.lease.create({
    data: {
      organizationId: org1.id,
      unitId: unit2A.id,
      startDate: new Date(new Date().getFullYear(), 5, 1),
      endDate: new Date(new Date().getFullYear() + 1, 5, 1),
      rentAmount: 2600,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant3.id, isPrimary: true }],
      },
    },
  });
  console.log('  ✓ 3 leases created');

  // Create charges and payments for org1
  const charge1 = await prisma.charge.create({
    data: {
      organizationId: org1.id,
      leaseId: lease1.id,
      unitId: unit1A.id,
      type: 'RENT',
      description: 'December 2025 Rent',
      amount: 1800,
      dueDate: new Date(2025, 11, 1),
      status: 'PAID',
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org1.id,
      leaseId: lease1.id,
      chargeId: charge1.id,
      amount: 1800,
      receivedDate: new Date(2025, 11, 1),
      method: 'BANK_TRANSFER',
      reference: 'ACH-12345',
    },
  });

  const charge2 = await prisma.charge.create({
    data: {
      organizationId: org1.id,
      leaseId: lease2.id,
      unitId: unit1B.id,
      type: 'RENT',
      description: 'December 2025 Rent',
      amount: 2400,
      dueDate: new Date(2025, 11, 1),
      status: 'PARTIALLY_PAID',
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org1.id,
      leaseId: lease2.id,
      chargeId: charge2.id,
      amount: 1200,
      receivedDate: new Date(2025, 11, 5),
      method: 'CHECK',
      reference: 'Check #1234',
    },
  });

  await prisma.charge.create({
    data: {
      organizationId: org1.id,
      leaseId: lease3.id,
      unitId: unit2A.id,
      type: 'RENT',
      description: 'December 2025 Rent',
      amount: 2600,
      dueDate: new Date(2025, 11, 1),
      status: 'PENDING',
    },
  });
  console.log('  ✓ 3 charges and 2 payments created');

  // Create vendors for org1
  const vendor1 = await prisma.vendor.create({
    data: {
      organizationId: org1.id,
      name: 'ABC Plumbing',
      email: 'bob@abcplumbing.com',
      phone: '555-1001',
      category: 'PLUMBING',
      notes: 'Contact: Bob Smith. Specializes in plumbing repairs and installations.',
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      organizationId: org1.id,
      name: 'Cool Air HVAC',
      email: 'jane@coolairhvac.com',
      phone: '555-1002',
      category: 'HVAC',
      notes: 'Contact: Jane Wilson. HVAC maintenance and repair specialist.',
    },
  });
  console.log('  ✓ 2 vendors created');

  // Create work orders for org1
  await prisma.workOrder.create({
    data: {
      organizationId: org1.id,
      propertyId: property1.id,
      unitId: unit1A.id,
      title: 'Leaky faucet in kitchen',
      description: 'Tenant reported a dripping faucet',
      priority: 'NORMAL',
      status: 'OPEN',
      category: 'PLUMBING',
      openedAt: new Date(),
      assignedVendorId: vendor1.id,
    },
  });

  await prisma.workOrder.create({
    data: {
      organizationId: org1.id,
      propertyId: property1.id,
      unitId: unit1B.id,
      title: 'HVAC seasonal maintenance',
      description: 'Annual HVAC inspection and filter replacement',
      priority: 'LOW',
      status: 'IN_PROGRESS',
      category: 'HVAC',
      openedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      assignedVendorId: vendor2.id,
    },
  });

  await prisma.workOrder.create({
    data: {
      organizationId: org1.id,
      propertyId: property2.id,
      unitId: unit2A.id,
      title: 'Paint touch-up in living room',
      description: 'Scuff marks on walls need touch-up',
      priority: 'LOW',
      status: 'COMPLETED',
      category: 'GENERAL',
      openedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('  ✓ 3 work orders created');

  // ============================================================================
  // ORGANIZATION 2 - Acme Properties (Free Plan - 1 property)
  // ============================================================================
  console.log('\n📦 Creating Organization 2: Acme Properties...');
  
  const org2 = await prisma.organization.create({
    data: {
      name: 'Acme Properties',
      slug: `acme-${Date.now().toString(36)}`,
    },
  });

  // Create subscription for org2 (Free plan - suitable for 1 property)
  const subscriptionEndDate2 = new Date();
  subscriptionEndDate2.setFullYear(subscriptionEndDate2.getFullYear() + 1);
  
  await prisma.subscription.create({
    data: {
      organizationId: org2.id,
      planId: freePlan!.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: subscriptionEndDate2,
    },
  });
  console.log('  ✓ Free plan subscription created (1 property)');

  // Create users for org2
  const org2Owner = await prisma.user.create({
    data: {
      name: 'John Smith',
      email: 'john@acmeproperties.com',
      passwordHash,
      memberships: {
        create: {
          organizationId: org2.id,
          role: 'OWNER',
        },
      },
    },
  });

  const org2Admin = await prisma.user.create({
    data: {
      name: 'Lisa Brown',
      email: 'lisa@acmeproperties.com',
      passwordHash,
      memberships: {
        create: {
          organizationId: org2.id,
          role: 'ADMIN',
        },
      },
    },
  });
  console.log('  ✓ 2 users created');

  // Create property for org2
  const property3 = await prisma.property.create({
    data: {
      organizationId: org2.id,
      name: 'Riverside Condos',
      addressLine1: '789 River Road',
      city: 'San Antonio',
      state: 'TX',
      postalCode: '78201',
      country: 'USA',
      type: 'CONDO',
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ 1 property created');

  // Create units for property3
  const unit3A = await prisma.unit.create({
    data: {
      propertyId: property3.id,
      name: 'Condo 201',
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1100,
      marketRent: 2200,
      status: 'OCCUPIED',
    },
  });

  const unit3B = await prisma.unit.create({
    data: {
      propertyId: property3.id,
      name: 'Condo 202',
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1100,
      marketRent: 2200,
      status: 'OCCUPIED',
    },
  });

  const unit3C = await prisma.unit.create({
    data: {
      propertyId: property3.id,
      name: 'Condo 301',
      bedrooms: 3,
      bathrooms: 2.5,
      squareFeet: 1500,
      marketRent: 2800,
      status: 'VACANT',
    },
  });
  console.log('  ✓ 3 units created');

  // Create tenants for org2
  const tenant5 = await prisma.tenant.create({
    data: {
      organizationId: org2.id,
      firstName: 'David',
      lastName: 'Rodriguez',
      email: 'david.rodriguez@example.com',
      phone: '555-0201',
      status: 'ACTIVE',
    },
  });

  const tenant6 = await prisma.tenant.create({
    data: {
      organizationId: org2.id,
      firstName: 'Amanda',
      lastName: 'Williams',
      email: 'amanda.williams@example.com',
      phone: '555-0202',
      status: 'ACTIVE',
    },
  });

  const tenant7 = await prisma.tenant.create({
    data: {
      organizationId: org2.id,
      firstName: 'Chris',
      lastName: 'Davis',
      email: 'chris.davis@example.com',
      phone: '555-0203',
      status: 'PROSPECT',
    },
  });
  console.log('  ✓ 3 tenants created');

  // Create leases for org2
  const lease4 = await prisma.lease.create({
    data: {
      organizationId: org2.id,
      unitId: unit3A.id,
      startDate: new Date(new Date().getFullYear(), 1, 1),
      endDate: new Date(new Date().getFullYear() + 1, 1, 1),
      rentAmount: 2200,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant5.id, isPrimary: true }],
      },
    },
  });

  const lease5 = await prisma.lease.create({
    data: {
      organizationId: org2.id,
      unitId: unit3B.id,
      startDate: new Date(new Date().getFullYear(), 4, 1),
      endDate: new Date(new Date().getFullYear() + 1, 4, 1),
      rentAmount: 2200,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant6.id, isPrimary: true }],
      },
    },
  });
  console.log('  ✓ 2 leases created');

  // Create charges and payments for org2
  const charge4 = await prisma.charge.create({
    data: {
      organizationId: org2.id,
      leaseId: lease4.id,
      unitId: unit3A.id,
      type: 'RENT',
      description: 'December 2025 Rent',
      amount: 2200,
      dueDate: new Date(2025, 11, 1),
      status: 'PAID',
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org2.id,
      leaseId: lease4.id,
      chargeId: charge4.id,
      amount: 2200,
      receivedDate: new Date(2025, 10, 28),
      method: 'BANK_TRANSFER',
      reference: 'ACH-98765',
    },
  });

  await prisma.charge.create({
    data: {
      organizationId: org2.id,
      leaseId: lease5.id,
      unitId: unit3B.id,
      type: 'RENT',
      description: 'December 2025 Rent',
      amount: 2200,
      dueDate: new Date(2025, 11, 1),
      status: 'PENDING',
    },
  });
  console.log('  ✓ 2 charges and 1 payment created');

  // Create vendor for org2
  const vendor3 = await prisma.vendor.create({
    data: {
      organizationId: org2.id,
      name: 'QuickFix Maintenance',
      email: 'tom@quickfix.com',
      phone: '555-2001',
      category: 'GENERAL',
      notes: 'Contact: Tom Johnson. General maintenance and repair services.',
    },
  });
  console.log('  ✓ 1 vendor created');

  // Create work orders for org2
  await prisma.workOrder.create({
    data: {
      organizationId: org2.id,
      propertyId: property3.id,
      unitId: unit3A.id,
      title: 'Replace air filter',
      description: 'Quarterly air filter replacement',
      priority: 'LOW',
      status: 'COMPLETED',
      category: 'HVAC',
      openedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      assignedVendorId: vendor3.id,
    },
  });

  await prisma.workOrder.create({
    data: {
      organizationId: org2.id,
      propertyId: property3.id,
      unitId: unit3C.id,
      title: 'Deep cleaning before showing',
      description: 'Professional cleaning for vacant unit',
      priority: 'NORMAL',
      status: 'OPEN',
      category: 'GENERAL',
      openedAt: new Date(),
    },
  });
  console.log('  ✓ 2 work orders created');

  // ============================================================================
  // HOA MANAGEMENT DATA - Associations, Homeowners, Board Members
  // ============================================================================
  console.log('\n🏘️  Creating HOA Management Data...');

  // ===== ORGANIZATION 1 ASSOCIATIONS =====
  console.log('\n  Organization 1: PropVestor Demo Org');

  // Association 1: Sunset View HOA
  const association1 = await prisma.association.create({
    data: {
      organizationId: org1.id,
      name: 'Sunset View HOA',
      addressLine1: '123 Main St',
      addressLine2: 'Suite 100',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'USA',
      email: 'board@sunsetviewhoa.com',
      phone: '512-555-1000',
      website: 'https://sunsetviewhoa.com',
      fiscalYearStart: 1, // January
      notes: 'Established 2015. Managed by PropVestor Demo Org.',
      isActive: true,
    },
  });
  console.log('  ✓ Association created: Sunset View HOA');

  // Homeowners for Sunset View HOA
  const homeowner1 = await prisma.homeowner.create({
    data: {
      associationId: association1.id,
      unitId: unit1A.id,
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '512-555-1001',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 0,
      status: 'ACTIVE',
    },
  });

  const homeowner2 = await prisma.homeowner.create({
    data: {
      associationId: association1.id,
      unitId: unit1B.id,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phone: '512-555-1002',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 150.50,
      status: 'ACTIVE',
    },
  });

  const homeowner3 = await prisma.homeowner.create({
    data: {
      associationId: association1.id,
      unitId: unit2A.id,
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com',
      phone: '512-555-1003',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 0,
      status: 'ACTIVE',
    },
  });

  const homeowner6 = await prisma.homeowner.create({
    data: {
      associationId: association1.id,
      propertyId: property1.id, // Property-level homeowner (no specific unit)
      firstName: 'Mary',
      lastName: 'Williams',
      email: 'mary.williams@example.com',
      phone: '512-555-1004',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 225.75,
      status: 'ACTIVE',
    },
  });

  const homeowner7 = await prisma.homeowner.create({
    data: {
      associationId: association1.id,
      unitId: unit2B.id,
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@example.com',
      phone: '512-555-1005',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 0,
      status: 'DELINQUENT',
    },
  });
  console.log('  ✓ 5 homeowners created for Sunset View HOA');

  // Board Members for Sunset View HOA
  await prisma.boardMember.create({
    data: {
      associationId: association1.id,
      homeownerId: homeowner1.id,
      role: 'PRESIDENT',
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      isActive: true,
    },
  });

  await prisma.boardMember.create({
    data: {
      associationId: association1.id,
      userId: org1Manager.id,
      role: 'SECRETARY',
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
      isActive: true,
    },
  });

  await prisma.boardMember.create({
    data: {
      associationId: association1.id,
      homeownerId: homeowner2.id,
      role: 'TREASURER',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
      isActive: true,
    },
  });

  await prisma.boardMember.create({
    data: {
      associationId: association1.id,
      homeownerId: homeowner3.id,
      role: 'VICE_PRESIDENT',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
      isActive: true,
    },
  });
  console.log('  ✓ 4 board members created for Sunset View HOA');

  // Association 2 for org1: Riverside Condominiums
  const association3 = await prisma.association.create({
    data: {
      organizationId: org1.id,
      name: 'Riverside Condominiums',
      addressLine1: '789 Riverside Drive',
      city: 'Austin',
      state: 'TX',
      postalCode: '78703',
      country: 'USA',
      email: 'board@riversidecondos.com',
      phone: '512-555-2000',
      fiscalYearStart: 7, // July
      notes: 'Luxury condominium complex. Managed by PropVestor Demo Org.',
      isActive: true,
    },
  });
  console.log('  ✓ Association created: Riverside Condominiums');

  // Homeowners for Riverside Condominiums
  const homeowner8 = await prisma.homeowner.create({
    data: {
      associationId: association3.id,
      propertyId: property2.id,
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@example.com',
      phone: '512-555-2001',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 0,
      status: 'ACTIVE',
    },
  });

  const homeowner9 = await prisma.homeowner.create({
    data: {
      associationId: association3.id,
      propertyId: property2.id,
      firstName: 'Susan',
      lastName: 'Anderson',
      email: 'susan.anderson@example.com',
      phone: '512-555-2002',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 50.00,
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ 2 homeowners created for Riverside Condominiums');

  // Board Member for Riverside Condominiums
  await prisma.boardMember.create({
    data: {
      associationId: association3.id,
      homeownerId: homeowner8.id,
      role: 'PRESIDENT',
      startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 4 months ago
      isActive: true,
    },
  });
  console.log('  ✓ 1 board member created for Riverside Condominiums');

  // ===== ORGANIZATION 2 ASSOCIATIONS =====
  console.log('\n  Organization 2: Acme Properties');

  // Association 2: Oak Street Community
  const association2 = await prisma.association.create({
    data: {
      organizationId: org2.id,
      name: 'Oak Street Community',
      addressLine1: '456 Oak Street',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75202',
      country: 'USA',
      email: 'info@oakstreetcommunity.com',
      phone: '214-555-2000',
      website: 'https://oakstreetcommunity.com',
      fiscalYearStart: 7, // July
      notes: 'Established 2018. Managed by Acme Properties.',
      isActive: true,
    },
  });
  console.log('  ✓ Association created: Oak Street Community');

  // Homeowners for Oak Street Community
  const homeowner4 = await prisma.homeowner.create({
    data: {
      associationId: association2.id,
      unitId: unit3A.id,
      firstName: 'Alice',
      lastName: 'Williams',
      email: 'alice.williams@example.com',
      phone: '214-555-2001',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 0,
      status: 'ACTIVE',
    },
  });

  const homeowner5 = await prisma.homeowner.create({
    data: {
      associationId: association2.id,
      unitId: unit3B.id,
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie.brown@example.com',
      phone: '214-555-2002',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 75.25,
      status: 'ACTIVE',
    },
  });

  const homeowner10 = await prisma.homeowner.create({
    data: {
      associationId: association2.id,
      unitId: unit3C.id,
      firstName: 'Michael',
      lastName: 'Davis',
      email: 'michael.davis@example.com',
      phone: '214-555-2003',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 0,
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ 3 homeowners created for Oak Street Community');

  // Board Members for Oak Street Community
  await prisma.boardMember.create({
    data: {
      associationId: association2.id,
      homeownerId: homeowner4.id,
      role: 'TREASURER',
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
      isActive: true,
    },
  });

  await prisma.boardMember.create({
    data: {
      associationId: association2.id,
      userId: org2Admin.id, // Use org2Admin as the manager
      role: 'SECRETARY',
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
      isActive: true,
    },
  });
  console.log('  ✓ 2 board members created for Oak Street Community');

  // Association 3 for org2: Parkview Estates
  const association4 = await prisma.association.create({
    data: {
      organizationId: org2.id,
      name: 'Parkview Estates',
      addressLine1: '321 Parkview Lane',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75203',
      country: 'USA',
      email: 'board@parkviewestates.com',
      phone: '214-555-3000',
      fiscalYearStart: 1, // January
      notes: 'New development. Managed by Acme Properties.',
      isActive: true,
    },
  });
  console.log('  ✓ Association created: Parkview Estates');

  // Homeowner for Parkview Estates
  const homeowner11 = await prisma.homeowner.create({
    data: {
      associationId: association4.id,
      propertyId: property3.id,
      firstName: 'Emily',
      lastName: 'Martinez',
      email: 'emily.martinez@example.com',
      phone: '214-555-3001',
      passwordHash: await bcrypt.hash('password123', 10),
      emailVerified: true,
      accountBalance: 0,
      status: 'ACTIVE',
    },
  });
  console.log('  ✓ 1 homeowner created for Parkview Estates');

  // Board Member for Parkview Estates
  await prisma.boardMember.create({
    data: {
      associationId: association4.id,
      homeownerId: homeowner11.id,
      role: 'PRESIDENT',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
      isActive: true,
    },
  });
  console.log('  ✓ 1 board member created for Parkview Estates');

  console.log('\n✅ Seed completed successfully!\n');
  console.log('=' .repeat(60));
  console.log('📝 LOGIN CREDENTIALS');
  console.log('=' .repeat(60));
  console.log('\n🔐 Super Admin:');
  console.log('   Email:    admin@propvestor.dev');
  console.log('   Password: password123');
  console.log('\n👤 Organization 1 Users (PropVestor Demo Org):');
  console.log('   Email:    demo@propvestor.dev');
  console.log('   Password: password123');
  console.log('   Email:    sarah@propvestor.dev');
  console.log('   Password: password123');
  console.log('\n👤 Organization 2 Users (Acme Properties):');
  console.log('   Email:    john@acmeproperties.com');
  console.log('   Password: password123');
  console.log('   Email:    lisa@acmeproperties.com');
  console.log('   Password: password123');
  console.log('\n🏘️  Homeowner Portal Credentials:');
  console.log('\n   Organization 1 - Sunset View HOA:');
  console.log('     Email:    john.smith@example.com / password123');
  console.log('     Email:    jane.doe@example.com / password123');
  console.log('     Email:    bob.johnson@example.com / password123');
  console.log('     Email:    mary.williams@example.com / password123');
  console.log('     Email:    david.brown@example.com / password123');
  console.log('\n   Organization 1 - Riverside Condominiums:');
  console.log('     Email:    robert.taylor@example.com / password123');
  console.log('     Email:    susan.anderson@example.com / password123');
  console.log('\n   Organization 2 - Oak Street Community:');
  console.log('     Email:    alice.williams@example.com / password123');
  console.log('     Email:    charlie.brown@example.com / password123');
  console.log('     Email:    michael.davis@example.com / password123');
  console.log('\n   Organization 2 - Parkview Estates:');
  console.log('     Email:    emily.martinez@example.com / password123');
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(60));
  console.log('\n🏢 Organization 1: PropVestor Demo Org (Basic Plan - $49/month)');
  console.log('   ✓ Appropriate plan for 2 properties (limit: 10 properties)');
  console.log('   - 3 users');
  console.log('   - 2 properties (5 units)');
  console.log('   - 4 tenants (3 active, 1 prospect)');
  console.log('   - 3 active leases');
  console.log('   - 3 charges, 2 payments');
  console.log('   - 2 vendors');
  console.log('   - 3 work orders');
  console.log('\n🏢 Organization 2: Acme Properties (Free Plan - $0/month)');
  console.log('   ✓ Appropriate plan for 1 property (limit: 1 property)');
  console.log('   - 2 users');
  console.log('   - 1 property (3 units)');
  console.log('   - 3 tenants (2 active, 1 prospect)');
  console.log('   - 2 active leases');
  console.log('   - 2 charges, 1 payment');
  console.log('   - 1 vendor');
  console.log('   - 2 work orders');
  console.log('\n🏘️  HOA Management:');
  console.log('   Organization 1 (PropVestor Demo Org):');
  console.log('     - Sunset View HOA: 5 homeowners, 4 board members');
  console.log('     - Riverside Condominiums: 2 homeowners, 1 board member');
  console.log('   Organization 2 (Acme Properties):');
  console.log('     - Oak Street Community: 3 homeowners, 2 board members');
  console.log('     - Parkview Estates: 1 homeowner, 1 board member');
  console.log('   Total: 4 associations, 11 homeowners, 8 board members');
  console.log('\n' + '=' .repeat(60));
};

run()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
