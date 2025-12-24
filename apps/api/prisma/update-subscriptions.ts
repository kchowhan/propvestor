import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSubscriptions() {
  console.log('🔄 Updating subscriptions to match property counts...\n');

  // Get all orgs with their property counts
  const orgs = await prisma.organization.findMany({
    include: {
      _count: {
        select: { properties: true }
      },
      subscription: {
        include: { plan: true }
      }
    }
  });

  // Get subscription plans
  const freePlan = await prisma.subscriptionPlan.findFirst({ where: { slug: 'free' } });
  const basicPlan = await prisma.subscriptionPlan.findFirst({ where: { slug: 'basic' } });
  const proPlan = await prisma.subscriptionPlan.findFirst({ where: { slug: 'pro' } });
  const enterprisePlan = await prisma.subscriptionPlan.findFirst({ where: { slug: 'enterprise' } });

  if (!freePlan || !basicPlan || !proPlan || !enterprisePlan) {
    console.error('❌ Missing subscription plans!');
    return;
  }

  for (const org of orgs) {
    const propertyCount = org._count.properties;
    let targetPlan;

    // Assign plan based on property count
    if (propertyCount <= 1) {
      targetPlan = freePlan;
    } else if (propertyCount <= 10) {
      targetPlan = basicPlan;
    } else if (propertyCount <= 50) {
      targetPlan = proPlan;
    } else {
      targetPlan = enterprisePlan;
    }

    // Update subscription if it exists and plan is different
    if (org.subscription && org.subscription.planId !== targetPlan.id) {
      await prisma.subscription.update({
        where: { id: org.subscription.id },
        data: { planId: targetPlan.id }
      });
      console.log(`✓ Updated ${org.name}: ${propertyCount} properties → ${targetPlan.name} plan`);
    } else if (!org.subscription) {
      // Create subscription if doesn't exist
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      await prisma.subscription.create({
        data: {
          organizationId: org.id,
          planId: targetPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: endDate,
        }
      });
      console.log(`✓ Created subscription for ${org.name}: ${propertyCount} properties → ${targetPlan.name} plan`);
    } else {
      console.log(`✓ ${org.name} already on correct plan (${org.subscription.plan.name})`);
    }
  }

  console.log('\n✅ Subscription update complete!');
}

updateSubscriptions()
  .catch((err) => {
    console.error('❌ Update failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

