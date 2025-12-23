import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60) || 'org';

const run = async () => {
  console.log('🌱 Starting database seed...\n');

  // Clean up existing demo data first
  console.log('🧹 Cleaning up existing demo data...');
  await cleanupDemoData();
  console.log('✅ Cleanup complete\n');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Organization 1: PropVestor Demo Org
  console.log('📦 Creating Organization 1: PropVestor Demo Org...');
  const org1 = await prisma.organization.create({
    data: {
      name: 'PropVestor Demo Org',
      slug: 'propvestor-demo-org',
    },
  });

  const user1 = await prisma.user.create({
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
  console.log(`  ✓ Created user: ${user1.email} (OWNER)`);

  // Create additional users for org1
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@propvestor.dev',
      passwordHash: await bcrypt.hash('password123', 10),
      memberships: {
        create: {
          organizationId: org1.id,
          role: 'ADMIN',
        },
      },
    },
  });
  console.log(`  ✓ Created user: ${adminUser.email} (ADMIN)`);

  const managerUser = await prisma.user.create({
    data: {
      name: 'Manager User',
      email: 'manager@propvestor.dev',
      passwordHash: await bcrypt.hash('password123', 10),
      memberships: {
        create: {
          organizationId: org1.id,
          role: 'MANAGER',
        },
      },
    },
  });
  console.log(`  ✓ Created user: ${managerUser.email} (MANAGER)`);

  // Create properties for org1
  console.log('\n🏠 Creating properties for Organization 1...');
  
  const property1 = await prisma.property.create({
    data: {
      organizationId: org1.id,
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

  const unit1 = await prisma.unit.create({
    data: {
      propertyId: property1.id,
      name: 'Main Unit',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1600,
      marketRent: 2400,
      status: 'OCCUPIED',
    },
  });

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

  const lease1 = await prisma.lease.create({
    data: {
      organizationId: org1.id,
      unitId: unit1.id,
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(new Date().getFullYear(), 11, 31),
      rentAmount: 2400,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant1.id, isPrimary: true }],
      },
    },
  });

  const charge1 = await prisma.charge.create({
    data: {
      organizationId: org1.id,
      leaseId: lease1.id,
      unitId: unit1.id,
      propertyId: property1.id,
      type: 'RENT',
      description: 'Monthly rent - January',
      amount: 2400,
      dueDate: new Date(new Date().getFullYear(), 0, 1),
      status: 'PARTIALLY_PAID',
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org1.id,
      leaseId: lease1.id,
      chargeId: charge1.id,
      amount: 1200,
      receivedDate: new Date(),
      method: 'ONLINE_PROCESSOR',
      reference: 'Payment #001',
    },
  });

  console.log(`  ✓ Created property: ${property1.name}`);
  console.log(`  ✓ Created tenant: ${tenant1.firstName} ${tenant1.lastName}`);
  console.log(`  ✓ Created lease and charge`);

  // Property 2: Multi-family
  const property2 = await prisma.property.create({
    data: {
      organizationId: org1.id,
      name: '789 Elm Street',
      addressLine1: '789 Elm Street',
      city: 'Austin',
      state: 'TX',
      postalCode: '78702',
      country: 'USA',
      type: 'MULTI_FAMILY',
      status: 'ACTIVE',
    },
  });

  const unit2a = await prisma.unit.create({
    data: {
      propertyId: property2.id,
      name: 'Unit A',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 1100,
      marketRent: 1800,
      status: 'OCCUPIED',
    },
  });

  const unit2b = await prisma.unit.create({
    data: {
      propertyId: property2.id,
      name: 'Unit B',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 800,
      marketRent: 1400,
      status: 'VACANT',
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      organizationId: org1.id,
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah.chen@example.com',
      phone: '555-0202',
      status: 'ACTIVE',
    },
  });

  const lease2 = await prisma.lease.create({
    data: {
      organizationId: org1.id,
      unitId: unit2a.id,
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(new Date().getFullYear(), 11, 31),
      rentAmount: 1800,
      rentDueDay: 5,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant2.id, isPrimary: true }],
      },
    },
  });

  console.log(`  ✓ Created property: ${property2.name} (2 units)`);

  // Property 3: Commercial
  const property3 = await prisma.property.create({
    data: {
      organizationId: org1.id,
      name: '321 Park Avenue',
      addressLine1: '321 Park Avenue',
      city: 'Austin',
      state: 'TX',
      postalCode: '78703',
      country: 'USA',
      type: 'COMMERCIAL',
      status: 'ACTIVE',
    },
  });

  const unit3 = await prisma.unit.create({
    data: {
      propertyId: property3.id,
      name: 'Suite 100',
      squareFeet: 2500,
      marketRent: 3500,
      status: 'OCCUPIED',
    },
  });

  console.log(`  ✓ Created property: ${property3.name} (Commercial)`);

  // Create vendors for org1
  console.log('\n🔧 Creating vendors...');
  const vendors = [
    { name: 'ABC Plumbing Services', email: 'contact@abcplumbing.com', phone: '(555) 123-4567', category: 'PLUMBING' },
    { name: 'Bright Electric Co', email: 'service@brightelectric.com', phone: '(555) 345-6789', category: 'ELECTRICAL' },
    { name: 'Cool Air Systems', email: 'info@coolairsystems.com', phone: '(555) 567-8901', category: 'HVAC' },
    { name: 'Green Thumb Landscaping', email: 'info@greenthumb.com', phone: '(555) 901-2345', category: 'LANDSCAPING' },
    { name: 'Pro Painters LLC', email: 'quote@propainters.com', phone: '(555) 123-7890', category: 'PAINTING' },
  ];

  for (const vendorData of vendors) {
    await prisma.vendor.create({
      data: {
        organizationId: org1.id,
        ...vendorData,
      },
    });
    console.log(`  ✓ Created vendor: ${vendorData.name}`);
  }

  // Create work orders
  console.log('\n📋 Creating work orders...');
  const workOrder1 = await prisma.workOrder.create({
    data: {
      organizationId: org1.id,
      propertyId: property1.id,
      unitId: unit1.id,
      title: 'HVAC inspection',
      description: 'Seasonal HVAC maintenance check',
      priority: 'NORMAL',
      status: 'OPEN',
      category: 'HVAC',
      openedAt: new Date(),
    },
  });

  const workOrder2 = await prisma.workOrder.create({
    data: {
      organizationId: org1.id,
      propertyId: property2.id,
      unitId: unit2a.id,
      title: 'Leaky faucet repair',
      description: 'Kitchen sink faucet needs repair',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      category: 'PLUMBING',
      openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  });

  console.log(`  ✓ Created work order: ${workOrder1.title}`);
  console.log(`  ✓ Created work order: ${workOrder2.title}`);

  // Create Organization 2: Second Property Group
  console.log('\n📦 Creating Organization 2: Second Property Group...');
  const org2 = await prisma.organization.create({
    data: {
      name: 'Second Property Group',
      slug: 'second-property-group',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Second Org Owner',
      email: 'owner2@propvestor.dev',
      passwordHash: await bcrypt.hash('password123', 10),
      memberships: {
        create: {
          organizationId: org2.id,
          role: 'OWNER',
        },
      },
    },
  });
  console.log(`  ✓ Created user: ${user2.email} (OWNER)`);

  // Add user1 to org2 as well (multi-org user)
  await prisma.organizationMembership.create({
    data: {
      userId: user1.id,
      organizationId: org2.id,
      role: 'ADMIN',
    },
  });
  console.log(`  ✓ Added ${user1.email} to ${org2.name} as ADMIN`);

  // Create properties for org2
  const property4 = await prisma.property.create({
    data: {
      organizationId: org2.id,
      name: '456 Oak Boulevard',
      addressLine1: '456 Oak Boulevard',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75201',
      country: 'USA',
      type: 'SINGLE_FAMILY',
      status: 'ACTIVE',
    },
  });

  const unit4 = await prisma.unit.create({
    data: {
      propertyId: property4.id,
      name: 'Main House',
      bedrooms: 4,
      bathrooms: 3,
      squareFeet: 2200,
      marketRent: 2800,
      status: 'OCCUPIED',
    },
  });

  const tenant3 = await prisma.tenant.create({
    data: {
      organizationId: org2.id,
      firstName: 'Michael',
      lastName: 'Rodriguez',
      email: 'michael.r@example.com',
      phone: '555-0303',
      status: 'ACTIVE',
    },
  });

  const lease3 = await prisma.lease.create({
    data: {
      organizationId: org2.id,
      unitId: unit4.id,
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(new Date().getFullYear(), 11, 31),
      rentAmount: 2800,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant3.id, isPrimary: true }],
      },
    },
  });

  console.log(`  ✓ Created property: ${property4.name}`);

  // Add vendors to org2
  for (const vendorData of vendors.slice(0, 3)) {
    await prisma.vendor.create({
      data: {
        organizationId: org2.id,
        ...vendorData,
      },
    });
  }

  console.log('\n✅ Seed complete!');
  console.log('\n📊 Summary:');
  console.log(`  - Organizations: 2`);
  console.log(`  - Users: 4`);
  console.log(`  - Properties: 4`);
  console.log(`  - Units: 5`);
  console.log(`  - Tenants: 3`);
  console.log(`  - Leases: 3`);
  console.log(`  - Vendors: 8`);
  console.log(`  - Work Orders: 2`);
  console.log('\n🔑 Demo Credentials:');
  console.log('  Email: demo@propvestor.dev');
  console.log('  Password: password123');
  console.log('\n  Email: admin@propvestor.dev');
  console.log('  Password: password123');
  console.log('\n  Email: manager@propvestor.dev');
  console.log('  Password: password123');
  console.log('\n  Email: owner2@propvestor.dev');
  console.log('  Password: password123');
};

async function cleanupDemoData() {
  // Delete in order of dependencies (children first, then parents)
  try { await prisma.distribution.deleteMany(); } catch {}
  try { await prisma.capitalContribution.deleteMany(); } catch {}
  try { await prisma.valuationSnapshot.deleteMany(); } catch {}
  try { await prisma.ownership.deleteMany(); } catch {}
  try { await prisma.investor.deleteMany(); } catch {}
  try { await prisma.investmentEntity.deleteMany(); } catch {}
  try { await prisma.reconciliationMatch.deleteMany(); } catch {}
  try { await prisma.reconciliation.deleteMany(); } catch {}
  try { await prisma.bankTransaction.deleteMany(); } catch {}
  try { await prisma.tenantPaymentMethod.deleteMany(); } catch {}
  try { await prisma.screeningRequest.deleteMany(); } catch {}
  try { await prisma.document.deleteMany(); } catch {}
  try { await prisma.payment.deleteMany(); } catch {}
  try { await prisma.charge.deleteMany(); } catch {}
  try { await prisma.leaseTenant.deleteMany(); } catch {}
  try { await prisma.lease.deleteMany(); } catch {}
  try { await prisma.workOrder.deleteMany(); } catch {}
  try { await prisma.vendor.deleteMany(); } catch {}
  try { await prisma.tenant.deleteMany(); } catch {}
  try { await prisma.unit.deleteMany(); } catch {}
  try { await prisma.property.deleteMany(); } catch {}
  try { await prisma.organizationMembership.deleteMany(); } catch {}
  try { await prisma.user.deleteMany(); } catch {}
  try { await prisma.organization.deleteMany(); } catch {}
}

run()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

