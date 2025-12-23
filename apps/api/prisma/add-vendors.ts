import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const vendors = [
  // Plumbing
  { name: 'ABC Plumbing Services', email: 'contact@abcplumbing.com', phone: '(555) 123-4567', category: 'PLUMBING' },
  { name: 'Quick Fix Plumbing', email: 'info@quickfixplumbing.com', phone: '(555) 234-5678', category: 'PLUMBING' },
  
  // Electrical
  { name: 'Bright Electric Co', email: 'service@brightelectric.com', phone: '(555) 345-6789', category: 'ELECTRICAL' },
  { name: 'Power Solutions Inc', email: 'contact@powersolutions.com', phone: '(555) 456-7890', category: 'ELECTRICAL' },
  
  // HVAC
  { name: 'Cool Air Systems', email: 'info@coolairsystems.com', phone: '(555) 567-8901', category: 'HVAC' },
  { name: 'Comfort Zone HVAC', email: 'service@comfortzone.com', phone: '(555) 678-9012', category: 'HVAC' },
  
  // Appliance
  { name: 'Appliance Repair Pro', email: 'repair@appliancepro.com', phone: '(555) 789-0123', category: 'APPLIANCE' },
  { name: 'Fast Appliance Service', email: 'service@fastappliance.com', phone: '(555) 890-1234', category: 'APPLIANCE' },
  
  // Landscaping
  { name: 'Green Thumb Landscaping', email: 'info@greenthumb.com', phone: '(555) 901-2345', category: 'LANDSCAPING' },
  { name: 'Perfect Lawn Care', email: 'contact@perfectlawn.com', phone: '(555) 012-3456', category: 'LANDSCAPING' },
  
  // Painting
  { name: 'Pro Painters LLC', email: 'quote@propainters.com', phone: '(555) 123-7890', category: 'PAINTING' },
  { name: 'Color Masters Painting', email: 'info@colormasters.com', phone: '(555) 234-8901', category: 'PAINTING' },
  
  // Carpentry
  { name: 'Master Craftsmen', email: 'service@mastercraftsmen.com', phone: '(555) 345-9012', category: 'CARPENTRY' },
  { name: 'Precision Carpentry', email: 'contact@precisioncarpentry.com', phone: '(555) 456-0123', category: 'CARPENTRY' },
  
  // Roofing
  { name: 'Top Roof Solutions', email: 'info@toproof.com', phone: '(555) 567-1234', category: 'ROOFING' },
  { name: 'Reliable Roofing Co', email: 'service@reliableroofing.com', phone: '(555) 678-2345', category: 'ROOFING' },
  
  // Flooring
  { name: 'Floor Experts', email: 'contact@floorexperts.com', phone: '(555) 789-3456', category: 'FLOORING' },
  { name: 'Premium Floors Inc', email: 'info@premiumfloors.com', phone: '(555) 890-4567', category: 'FLOORING' },
  
  // General
  { name: 'Handyman Services', email: 'service@handymanservices.com', phone: '(555) 901-5678', category: 'GENERAL' },
  { name: 'All Around Maintenance', email: 'contact@allaround.com', phone: '(555) 012-6789', category: 'GENERAL' },
];

const run = async () => {
  console.log('Adding vendors to all organizations...\n');

  // Get all organizations
  const organizations = await prisma.organization.findMany();

  if (organizations.length === 0) {
    console.error('No organizations found. Please run seed first.');
    process.exit(1);
  }

  let totalCreated = 0;

  for (const org of organizations) {
    console.log(`Adding vendors to: ${org.name}`);
    
    for (const vendorData of vendors) {
      // Check if vendor already exists for this organization
      const existing = await prisma.vendor.findFirst({
        where: {
          organizationId: org.id,
          name: vendorData.name,
        },
      });

      if (!existing) {
        await prisma.vendor.create({
          data: {
            organizationId: org.id,
            ...vendorData,
          },
        });
        totalCreated++;
        console.log(`  ✓ Created: ${vendorData.name} (${vendorData.category})`);
      } else {
        console.log(`  - Skipped: ${vendorData.name} (already exists)`);
      }
    }
    console.log('');
  }

  console.log(`\n✅ Complete! Created ${totalCreated} vendors across ${organizations.length} organization(s).`);
};

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

