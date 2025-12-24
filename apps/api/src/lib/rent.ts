import { Lease, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export const buildRentDueDate = (lease: Lease, month: number, year: number) => {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(lease.rentDueDay, lastDay);
  return new Date(year, month - 1, day);
};

export const createRentChargeForLease = async (
  lease: Lease,
  month: number,
  year: number,
): Promise<Prisma.ChargeGetPayload<Record<string, never>> | null> => {
  const dueDate = buildRentDueDate(lease, month, year);
  const existing = await prisma.charge.findFirst({
    where: {
      leaseId: lease.id,
      type: 'RENT',
      dueDate: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  });

  if (existing) {
    return null;
  }

  // Get unit to get propertyId if unitId exists
  let propertyId: string | null = null;
  if (lease.unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: lease.unitId },
      select: { propertyId: true },
    });
    propertyId = unit?.propertyId || null;
  }

  return prisma.charge.create({
    data: {
      organizationId: lease.organizationId,
      leaseId: lease.id,
      unitId: lease.unitId,
      propertyId,
      type: 'RENT',
      description: `Rent charge for ${month}/${year}`,
      amount: lease.rentAmount,
      dueDate,
    },
  });
};
