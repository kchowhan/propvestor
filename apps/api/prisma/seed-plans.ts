import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  console.log('🌱 Seeding subscription plans...');

  // Check if plans already exist
  const existingPlans = await prisma.subscriptionPlan.findMany();
  if (existingPlans.length > 0) {
    console.log('⚠️  Subscription plans already exist. Skipping seed.');
    return;
  }

  const plans = [
    {
      name: 'Free',
      slug: 'free',
      price: 0,
      billingInterval: 'monthly',
      features: {
        properties: true,
        tenants: true,
        leases: true,
        workOrders: true,
        reports: false,
        api: false,
        advancedReports: false,
      },
      limits: {
        properties: 1,
        tenants: 5,
        users: 2,
        storage: 100, // 100 MB
        apiCalls: 100, // per hour
      },
      isActive: true,
      displayOrder: 0,
    },
    {
      name: 'Basic',
      slug: 'basic',
      price: 49,
      billingInterval: 'monthly',
      features: {
        properties: true,
        tenants: true,
        leases: true,
        workOrders: true,
        reports: true,
        api: false,
        advancedReports: false,
      },
      limits: {
        properties: 10,
        tenants: 50,
        users: 5,
        storage: 1000, // 1 GB
        apiCalls: 1000, // per hour
      },
      isActive: true,
      displayOrder: 1,
    },
    {
      name: 'Pro',
      slug: 'pro',
      price: 149,
      billingInterval: 'monthly',
      features: {
        properties: true,
        tenants: true,
        leases: true,
        workOrders: true,
        reports: true,
        api: true,
        advancedReports: true,
      },
      limits: {
        properties: 50,
        tenants: 250,
        users: 15,
        storage: 10000, // 10 GB
        apiCalls: 10000, // per hour
      },
      isActive: true,
      displayOrder: 2,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      price: 499,
      billingInterval: 'monthly',
      features: {
        properties: true,
        tenants: true,
        leases: true,
        workOrders: true,
        reports: true,
        api: true,
        advancedReports: true,
        sso: true,
        whiteLabel: true,
        dedicatedSupport: true,
      },
      limits: {
        properties: 999999, // Unlimited
        tenants: 999999,
        users: 999999,
        storage: 999999, // Unlimited
        apiCalls: 999999, // Unlimited
      },
      isActive: true,
      displayOrder: 3,
    },
  ];

  for (const planData of plans) {
    const plan = await prisma.subscriptionPlan.create({
      data: planData,
    });
    console.log(`  ✓ Created plan: ${plan.name} ($${plan.price}/${plan.billingInterval})`);
  }

  console.log('\n✅ Subscription plans seeded successfully!');
  console.log('\n📝 Note: You need to create Stripe Products and Prices for paid plans:');
  console.log('   1. Go to Stripe Dashboard → Products');
  console.log('   2. Create products for Basic, Pro, and Enterprise');
  console.log('   3. Create prices (monthly and annual)');
  console.log('   4. Update plans in database with stripePriceId');
};

run()
  .catch((err) => {
    console.error('Error seeding subscription plans:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

