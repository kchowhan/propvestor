import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Starting database cleanup...\n');

  // Delete in order of dependencies (children first, then parents)
  console.log('Deleting Phase 2 (Investment Management) data...');
  try { 
    const count = await prisma.distribution.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} distributions`);
  } catch (e: any) {
    console.log(`  - Distributions: ${e.message}`);
  }
  
  try { 
    const count = await prisma.capitalContribution.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} capital contributions`);
  } catch (e: any) {
    console.log(`  - Capital contributions: ${e.message}`);
  }
  
  try { 
    const count = await prisma.valuationSnapshot.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} valuation snapshots`);
  } catch (e: any) {
    console.log(`  - Valuation snapshots: ${e.message}`);
  }
  
  try { 
    const count = await prisma.ownership.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} ownership records`);
  } catch (e: any) {
    console.log(`  - Ownership: ${e.message}`);
  }
  
  try { 
    const count = await prisma.investor.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} investors`);
  } catch (e: any) {
    console.log(`  - Investors: ${e.message}`);
  }
  
  try { 
    const count = await prisma.investmentEntity.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} investment entities`);
  } catch (e: any) {
    console.log(`  - Investment entities: ${e.message}`);
  }

  console.log('\nDeleting reconciliation data...');
  try { 
    const count = await prisma.reconciliationMatch.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} reconciliation matches`);
  } catch (e: any) {
    console.log(`  - Reconciliation matches: ${e.message}`);
  }
  
  try { 
    const count = await prisma.reconciliation.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} reconciliations`);
  } catch (e: any) {
    console.log(`  - Reconciliations: ${e.message}`);
  }
  
  try { 
    const count = await prisma.bankTransaction.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} bank transactions`);
  } catch (e: any) {
    console.log(`  - Bank transactions: ${e.message}`);
  }

  console.log('\nDeleting payment methods and screening...');
  try { 
    const count = await prisma.tenantPaymentMethod.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} payment methods`);
  } catch (e: any) {
    console.log(`  - Payment methods: ${e.message}`);
  }
  
  try { 
    const count = await prisma.screeningRequest.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} screening requests`);
  } catch (e: any) {
    console.log(`  - Screening requests: ${e.message}`);
  }

  console.log('\nDeleting documents...');
  try { 
    const count = await prisma.document.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} documents`);
  } catch (e: any) {
    console.log(`  - Documents: ${e.message}`);
  }

  console.log('\nDeleting payments...');
  try { 
    const count = await prisma.payment.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} payments`);
  } catch (e: any) {
    console.log(`  - Payments: ${e.message}`);
  }

  console.log('\nDeleting charges...');
  try { 
    const count = await prisma.charge.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} charges`);
  } catch (e: any) {
    console.log(`  - Charges: ${e.message}`);
  }

  console.log('\nDeleting leases...');
  try { 
    const count = await prisma.leaseTenant.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} lease-tenant relationships`);
  } catch (e: any) {
    console.log(`  - Lease tenants: ${e.message}`);
  }
  
  try { 
    const count = await prisma.lease.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} leases`);
  } catch (e: any) {
    console.log(`  - Leases: ${e.message}`);
  }

  console.log('\nDeleting work orders...');
  try { 
    const count = await prisma.workOrder.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} work orders`);
  } catch (e: any) {
    console.log(`  - Work orders: ${e.message}`);
  }

  console.log('\nDeleting vendors...');
  try { 
    const count = await prisma.vendor.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} vendors`);
  } catch (e: any) {
    console.log(`  - Vendors: ${e.message}`);
  }

  console.log('\nDeleting tenants...');
  try { 
    const count = await prisma.tenant.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} tenants`);
  } catch (e: any) {
    console.log(`  - Tenants: ${e.message}`);
  }

  console.log('\nDeleting units...');
  try { 
    const count = await prisma.unit.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} units`);
  } catch (e: any) {
    console.log(`  - Units: ${e.message}`);
  }

  console.log('\nDeleting properties...');
  try { 
    const count = await prisma.property.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} properties`);
  } catch (e: any) {
    console.log(`  - Properties: ${e.message}`);
  }

  console.log('\nDeleting organization memberships...');
  try { 
    const count = await prisma.organizationMembership.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} memberships`);
  } catch (e: any) {
    console.log(`  - Memberships: ${e.message}`);
  }

  console.log('\nDeleting users...');
  try { 
    const count = await prisma.user.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} users`);
  } catch (e: any) {
    console.log(`  - Users: ${e.message}`);
  }

  console.log('\nDeleting subscriptions and invoices...');
  try { 
    const count = await prisma.invoice.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} invoices`);
  } catch (e: any) {
    console.log(`  - Invoices: ${e.message}`);
  }
  
  try { 
    const count = await prisma.subscription.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} subscriptions`);
  } catch (e: any) {
    console.log(`  - Subscriptions: ${e.message}`);
  }

  console.log('\nDeleting organizations...');
  try { 
    const count = await prisma.organization.deleteMany();
    if (count.count > 0) console.log(`  ✓ Deleted ${count.count} organizations`);
  } catch (e: any) {
    console.log(`  - Organizations: ${e.message}`);
  }

  console.log('\nCleaning up duplicate subscription plans...');
  try {
    // Keep only the main 4 plans (free, basic, pro, enterprise)
    const mainPlanSlugs = ['free', 'basic', 'pro', 'enterprise'];
    
    // Get the main plans (the first occurrence of each slug)
    const mainPlans = await prisma.subscriptionPlan.findMany({
      where: { slug: { in: mainPlanSlugs } },
      orderBy: { createdAt: 'asc' },
      distinct: ['slug']
    });
    
    const mainPlanIds = mainPlans.map(p => p.id);
    
    // Delete all test/duplicate plans
    const deleted = await prisma.subscriptionPlan.deleteMany({
      where: { id: { notIn: mainPlanIds } }
    });
    
    if (deleted.count > 0) {
      console.log(`  ✓ Deleted ${deleted.count} duplicate/test plans`);
    }
    
    const remaining = await prisma.subscriptionPlan.count();
    console.log(`  ✓ ${remaining} subscription plans remaining (${mainPlanSlugs.join(', ')})`);
  } catch (e: any) {
    console.log(`  - Subscription plans cleanup: ${e.message}`);
  }

  console.log('\n✅ Database cleanup complete!');
}

cleanup()
  .catch((err) => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

