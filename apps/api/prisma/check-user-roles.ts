import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  console.log('Checking user roles across all organizations...\n');

  const organizations = await prisma.organization.findMany({
    include: {
      memberships: {
        include: {
          user: {
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

  for (const org of organizations) {
    console.log(`\n📋 ${org.name} (${org.slug})`);
    console.log('─'.repeat(50));
    
    const adminMemberships = org.memberships.filter(
      (m) => m.role === 'ADMIN' || m.role === 'OWNER'
    );

    if (adminMemberships.length === 0) {
      console.log('  No ADMIN or OWNER users found.');
    } else {
      adminMemberships.forEach((m) => {
        console.log(`  ${m.role.padEnd(8)} - ${m.user.name} (${m.user.email})`);
      });
    }

    console.log('\n  All members:');
    org.memberships.forEach((m) => {
      console.log(`    ${m.role.padEnd(8)} - ${m.user.name} (${m.user.email})`);
    });
  }

  console.log('\n\n✅ Summary:');
  const allAdminMemberships = await prisma.organizationMembership.findMany({
    where: {
      role: { in: ['ADMIN', 'OWNER'] },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`Total ADMIN/OWNER memberships: ${allAdminMemberships.length}`);
  allAdminMemberships.forEach((m) => {
    console.log(`  - ${m.user.name} (${m.user.email}) is ${m.role} in ${m.organization.name}`);
  });
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

