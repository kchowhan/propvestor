import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  // Find both organizations
  const org1 = await prisma.organization.findFirst({
    where: { name: 'PropVestor Demo Org' },
  });

  const org2 = await prisma.organization.findFirst({
    where: { name: 'Second Property Group' },
  });

  if (!org1 || !org2) {
    console.error('Organizations not found. Please run seed and add-org first.');
    process.exit(1);
  }

  console.log('Adding properties to:', org1.name);
  console.log('Adding properties to:', org2.name);

  // Add properties for Organization 1 (PropVestor Demo Org)
  const prop1_2 = await prisma.property.create({
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

  const unit1_2a = await prisma.unit.create({
    data: {
      propertyId: prop1_2.id,
      name: 'Unit A',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 1100,
      marketRent: 1800,
      status: 'OCCUPIED',
    },
  });

  const unit1_2b = await prisma.unit.create({
    data: {
      propertyId: prop1_2.id,
      name: 'Unit B',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 800,
      marketRent: 1400,
      status: 'VACANT',
    },
  });

  const tenant1_2 = await prisma.tenant.create({
    data: {
      organizationId: org1.id,
      firstName: 'Sarah',
      lastName: 'Chen',
      email: 'sarah.chen@example.com',
      phone: '555-0202',
    },
  });

  const lease1_2 = await prisma.lease.create({
    data: {
      organizationId: org1.id,
      unitId: unit1_2a.id,
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(new Date().getFullYear(), 11, 31),
      rentAmount: 1800,
      rentDueDay: 5,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant1_2.id, isPrimary: true }],
      },
    },
  });

  const prop1_3 = await prisma.property.create({
    data: {
      organizationId: org1.id,
      name: '321 Park Avenue',
      addressLine1: '321 Park Avenue',
      city: 'Austin',
      state: 'TX',
      postalCode: '78703',
      country: 'USA',
      type: 'SINGLE_FAMILY',
      status: 'ACTIVE',
    },
  });

  const unit1_3 = await prisma.unit.create({
    data: {
      propertyId: prop1_3.id,
      name: 'Main House',
      bedrooms: 4,
      bathrooms: 2.5,
      squareFeet: 2200,
      marketRent: 3200,
      status: 'OCCUPIED',
    },
  });

  const tenant1_3 = await prisma.tenant.create({
    data: {
      organizationId: org1.id,
      firstName: 'Michael',
      lastName: 'Rodriguez',
      email: 'michael.r@example.com',
      phone: '555-0303',
    },
  });

  const lease1_3 = await prisma.lease.create({
    data: {
      organizationId: org1.id,
      unitId: unit1_3.id,
      startDate: new Date(new Date().getFullYear(), 2, 15),
      endDate: new Date(new Date().getFullYear() + 1, 2, 14),
      rentAmount: 3200,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant1_3.id, isPrimary: true }],
      },
    },
  });

  // Add properties for Organization 2 (Second Property Group)
  const prop2_2 = await prisma.property.create({
    data: {
      organizationId: org2.id,
      name: '555 Commerce Blvd',
      addressLine1: '555 Commerce Blvd',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75202',
      country: 'USA',
      type: 'MULTI_FAMILY',
      status: 'ACTIVE',
    },
  });

  const unit2_2a = await prisma.unit.create({
    data: {
      propertyId: prop2_2.id,
      name: 'Apt 201',
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1200,
      marketRent: 2000,
      status: 'OCCUPIED',
    },
  });

  const unit2_2b = await prisma.unit.create({
    data: {
      propertyId: prop2_2.id,
      name: 'Apt 202',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 750,
      marketRent: 1300,
      status: 'OCCUPIED',
    },
  });

  const tenant2_2a = await prisma.tenant.create({
    data: {
      organizationId: org2.id,
      firstName: 'Emily',
      lastName: 'Watson',
      email: 'emily.w@example.com',
      phone: '555-0404',
    },
  });

  const tenant2_2b = await prisma.tenant.create({
    data: {
      organizationId: org2.id,
      firstName: 'David',
      lastName: 'Kim',
      email: 'david.kim@example.com',
      phone: '555-0505',
    },
  });

  const lease2_2a = await prisma.lease.create({
    data: {
      organizationId: org2.id,
      unitId: unit2_2a.id,
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date(new Date().getFullYear(), 11, 31),
      rentAmount: 2000,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant2_2a.id, isPrimary: true }],
      },
    },
  });

  const lease2_2b = await prisma.lease.create({
    data: {
      organizationId: org2.id,
      unitId: unit2_2b.id,
      startDate: new Date(new Date().getFullYear(), 1, 1),
      endDate: new Date(new Date().getFullYear() + 1, 0, 31),
      rentAmount: 1300,
      rentDueDay: 1,
      status: 'ACTIVE',
      tenants: {
        create: [{ tenantId: tenant2_2b.id, isPrimary: true }],
      },
    },
  });

  const prop2_3 = await prisma.property.create({
    data: {
      organizationId: org2.id,
      name: '888 River Road',
      addressLine1: '888 River Road',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75203',
      country: 'USA',
      type: 'SINGLE_FAMILY',
      status: 'ACTIVE',
    },
  });

  const unit2_3 = await prisma.unit.create({
    data: {
      propertyId: prop2_3.id,
      name: 'Main Residence',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1800,
      marketRent: 2800,
      status: 'VACANT',
    },
  });

  const prop2_4 = await prisma.property.create({
    data: {
      organizationId: org2.id,
      name: '999 Sunset Drive',
      addressLine1: '999 Sunset Drive',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75204',
      country: 'USA',
      type: 'CONDO',
      status: 'ACTIVE',
    },
  });

  const unit2_4 = await prisma.unit.create({
    data: {
      propertyId: prop2_4.id,
      name: 'Unit 3B',
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1100,
      marketRent: 1900,
      status: 'UNDER_RENOVATION',
    },
  });

  console.log('\n✅ Properties added successfully!');
  console.log('\nOrganization 1 (PropVestor Demo Org):');
  console.log(`  - ${prop1_2.name} (2 units: 1 occupied, 1 vacant)`);
  console.log(`  - ${prop1_3.name} (1 unit: occupied)`);
  console.log('\nOrganization 2 (Second Property Group):');
  console.log(`  - ${prop2_2.name} (2 units: both occupied)`);
  console.log(`  - ${prop2_3.name} (1 unit: vacant)`);
  console.log(`  - ${prop2_4.name} (1 unit: under renovation)`);
  console.log('\nTotal properties now:');
  const org1Count = await prisma.property.count({ where: { organizationId: org1.id } });
  const org2Count = await prisma.property.count({ where: { organizationId: org2.id } });
  console.log(`  - Org 1: ${org1Count} properties`);
  console.log(`  - Org 2: ${org2Count} properties`);
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

