import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  // Find the demo user
  const user = await prisma.user.findUnique({
    where: { email: 'demo@propvestor.dev' },
    include: { memberships: { include: { organization: true } } },
  });

  if (!user) {
    console.error('Demo user not found. Please run seed first.');
    process.exit(1);
  }

  console.log('Found user:', user.email);
  console.log('Current organizations:', user.memberships.map((m) => m.organization.name));

  // Create a second organization
  const org2 = await prisma.organization.create({
    data: {
      name: 'Second Property Group',
      slug: `second-property-group-${Date.now().toString(36)}`,
    },
  });

  console.log('Created organization:', org2.name);

  // Add user to the second organization as ADMIN
  const membership = await prisma.organizationMembership.create({
    data: {
      userId: user.id,
      organizationId: org2.id,
      role: 'ADMIN',
    },
  });

  console.log('Added user to organization with role:', membership.role);

  // Create some sample data for the second org
  const property2 = await prisma.property.create({
    data: {
      organizationId: org2.id,
      name: '456 Oak Avenue',
      addressLine1: '456 Oak Avenue',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75201',
      country: 'USA',
      type: 'MULTI_FAMILY',
      status: 'ACTIVE',
    },
  });

  const unit2 = await prisma.unit.create({
    data: {
      propertyId: property2.id,
      name: 'Unit 1A',
      bedrooms: 2,
      bathrooms: 1.5,
      squareFeet: 1200,
      marketRent: 1800,
      status: 'VACANT',
    },
  });

  console.log('Created sample property and unit for second organization');

  // Get updated user with all memberships
  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { memberships: { include: { organization: true } } },
  });

  console.log('\n✅ Setup complete!');
  console.log('\nUser now has access to:');
  updatedUser?.memberships.forEach((m) => {
    console.log(`  - ${m.organization.name} (${m.role})`);
  });
  console.log('\nYou can now log in and switch between organizations using the dropdown in the header.');
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

