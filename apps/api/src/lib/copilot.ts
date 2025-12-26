import { prisma } from './prisma.js';

export type CopilotResult = {
  intent: string;
  reply: string;
  data?: unknown;
  suggestions: string[];
};

type IntentMatch = {
  id: string;
  description: string;
  match: (text: string) => boolean;
  handle: (orgId: string, text: string) => Promise<Omit<CopilotResult, 'intent' | 'suggestions'>>;
};

const DEFAULT_SUGGESTIONS = [
  'Show me a KPI summary for this month',
  'List open work orders',
  'Show delinquent charges',
  'Show tenant status summary',
  'List leases expiring in the next 30 days',
  'Show HOA fees overdue',
  'List active vendors',
  'Show reconciliation status',
  'Show recent payments',
  'List properties',
];

const formatMoney = (amount: number) => {
  if (Number.isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const parseDayWindow = (text: string, fallbackDays: number) => {
  const match = text.match(/(\d{1,3})\s*day/i);
  if (!match) {
    return fallbackDays;
  }
  const days = Number(match[1]);
  if (!Number.isFinite(days) || days < 1 || days > 180) {
    return fallbackDays;
  }
  return days;
};

const intents: IntentMatch[] = [
  {
    id: 'kpis',
    description: 'Monthly KPI summary (occupancy, rent due/collected, open work orders).',
    match: (text) => /kpi|summary|dashboard|overview|metrics/.test(text),
    handle: async (orgId) => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const [properties, units, occupiedUnits, charges, payments, openWorkOrders] = await Promise.all([
        prisma.property.count({ where: { organizationId: orgId, archivedAt: null } }),
        prisma.unit.count({ where: { property: { organizationId: orgId }, archivedAt: null } }),
        prisma.unit.count({
          where: { property: { organizationId: orgId }, status: 'OCCUPIED', archivedAt: null },
        }),
        prisma.charge.aggregate({
          where: { organizationId: orgId, type: 'RENT', dueDate: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { organizationId: orgId, receivedDate: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        prisma.workOrder.count({
          where: { organizationId: orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
      ]);

      const rentDue = Number(charges._sum.amount ?? 0);
      const rentCollected = Number(payments._sum.amount ?? 0);
      const occupancyRate = units === 0 ? 0 : Number((occupiedUnits / units).toFixed(2));

      return {
        reply: `KPI summary: ${properties} properties, ${units} units (${occupiedUnits} occupied, ${occupancyRate * 100}% occupancy), rent due ${formatMoney(
          rentDue
        )}, collected ${formatMoney(rentCollected)}, open work orders ${openWorkOrders}.`,
        data: {
          totalProperties: properties,
          totalUnits: units,
          occupiedUnits,
          occupancyRate,
          rentDueThisMonth: rentDue,
          rentCollectedThisMonth: rentCollected,
          openWorkOrders,
        },
      };
    },
  },
  {
    id: 'open_work_orders',
    description: 'Open and in-progress work orders.',
    match: (text) => /work orders?|maintenance|repairs?/.test(text),
    handle: async (orgId) => {
      const [total, workOrders] = await Promise.all([
        prisma.workOrder.count({
          where: { organizationId: orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
        prisma.workOrder.findMany({
          where: { organizationId: orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          orderBy: [{ priority: 'desc' }, { openedAt: 'desc' }],
          take: 20,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            category: true,
            openedAt: true,
            property: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
            assignedVendor: { select: { id: true, name: true } },
          },
        }),
      ]);

      const replySuffix = total > workOrders.length ? ` Showing ${workOrders.length} of ${total}.` : '';
      return {
        reply: `There are ${total} open work orders.${replySuffix}`,
        data: { total, workOrders },
      };
    },
  },
  {
    id: 'delinquent_charges',
    description: 'Overdue charges (pending or partially paid).',
    match: (text) => /delinquen|overdue|past due|late payments?/.test(text),
    handle: async (orgId) => {
      const now = new Date();
      const [total, charges] = await Promise.all([
        prisma.charge.count({
          where: {
            organizationId: orgId,
            status: { in: ['PENDING', 'PARTIALLY_PAID'] },
            dueDate: { lt: now },
          },
        }),
        prisma.charge.findMany({
          where: {
            organizationId: orgId,
            status: { in: ['PENDING', 'PARTIALLY_PAID'] },
            dueDate: { lt: now },
          },
          orderBy: { dueDate: 'asc' },
          take: 20,
          include: { payments: true, property: true, unit: true, lease: true },
        }),
      ]);

      const overdue = charges.map((charge) => {
        const paid = charge.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        return {
          id: charge.id,
          description: charge.description,
          status: charge.status,
          dueDate: charge.dueDate,
          amount: Number(charge.amount),
          paid,
          outstanding: Number(charge.amount) - paid,
          property: charge.property,
          unit: charge.unit,
          leaseId: charge.leaseId,
        };
      });

      const replySuffix = total > overdue.length ? ` Showing ${overdue.length} of ${total}.` : '';
      return {
        reply: `There are ${total} overdue charges.${replySuffix}`,
        data: { total, overdue },
      };
    },
  },
  {
    id: 'leases_expiring',
    description: 'Active leases expiring soon.',
    match: (text) => /expiring leases?|lease expir|renewals?/.test(text),
    handle: async (orgId, text) => {
      const days = parseDayWindow(text, 30);
      const now = new Date();
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const leases = await prisma.lease.findMany({
        where: {
          organizationId: orgId,
          status: 'ACTIVE',
          endDate: { gte: now, lte: end },
        },
        orderBy: { endDate: 'asc' },
        take: 20,
        include: {
          unit: { include: { property: true } },
          tenants: { include: { tenant: true } },
        },
      });

      return {
        reply: `Found ${leases.length} active leases expiring in the next ${days} days.`,
        data: {
          days,
          leases: leases.map((lease) => ({
            id: lease.id,
            endDate: lease.endDate,
            rentAmount: Number(lease.rentAmount),
            unit: lease.unit,
            tenants: lease.tenants.map((lt) => lt.tenant),
          })),
        },
      };
    },
  },
  {
    id: 'occupancy',
    description: 'Unit vacancy and occupancy counts.',
    match: (text) => /vacanc|vacant units?|occupancy/.test(text),
    handle: async (orgId) => {
      const [totalUnits, vacantUnits, occupiedUnits] = await Promise.all([
        prisma.unit.count({ where: { property: { organizationId: orgId }, archivedAt: null } }),
        prisma.unit.count({
          where: { property: { organizationId: orgId }, status: 'VACANT', archivedAt: null },
        }),
        prisma.unit.count({
          where: { property: { organizationId: orgId }, status: 'OCCUPIED', archivedAt: null },
        }),
      ]);

      const occupancyRate = totalUnits === 0 ? 0 : Number((occupiedUnits / totalUnits).toFixed(2));

      return {
        reply: `Occupancy: ${occupiedUnits} occupied, ${vacantUnits} vacant, ${totalUnits} total (${occupancyRate * 100}% occupancy).`,
        data: { totalUnits, vacantUnits, occupiedUnits, occupancyRate },
      };
    },
  },
  {
    id: 'properties_list',
    description: 'List properties.',
    match: (text) => /list properties|all properties|properties list/.test(text),
    handle: async (orgId) => {
      const [total, properties] = await Promise.all([
        prisma.property.count({ where: { organizationId: orgId, archivedAt: null } }),
        prisma.property.findMany({
          where: { organizationId: orgId, archivedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            type: true,
            status: true,
          },
        }),
      ]);

      const replySuffix = total > properties.length ? ` Showing ${properties.length} of ${total}.` : '';
      return {
        reply: `Found ${total} properties.${replySuffix}`,
        data: { total, properties },
      };
    },
  },
  {
    id: 'recent_payments',
    description: 'Most recent payments.',
    match: (text) => /recent payments?|latest payments?|last payments?/.test(text),
    handle: async (orgId) => {
      const payments = await prisma.payment.findMany({
        where: { organizationId: orgId },
        orderBy: { receivedDate: 'desc' },
        take: 10,
        include: {
          lease: { include: { unit: { include: { property: true } } } },
          charge: true,
        },
      });

      return {
        reply: `Here are the 10 most recent payments.`,
        data: {
          payments: payments.map((payment) => ({
            id: payment.id,
            amount: Number(payment.amount),
            receivedDate: payment.receivedDate,
            method: payment.method,
            reference: payment.reference,
            chargeId: payment.chargeId,
            leaseId: payment.leaseId,
            property: payment.lease?.unit.property,
            unit: payment.lease?.unit,
          })),
        },
      };
    },
  },
  {
    id: 'tenant_summary',
    description: 'Tenant status summary across the portfolio.',
    match: (text) => /tenants?|applicants?|screening/.test(text),
    handle: async (orgId) => {
      const [total, statusCounts, recentTenants] = await Promise.all([
        prisma.tenant.count({ where: { organizationId: orgId, archivedAt: null } }),
        prisma.tenant.groupBy({
          by: ['status'],
          where: { organizationId: orgId, archivedAt: null },
          _count: { _all: true },
        }),
        prisma.tenant.findMany({
          where: { organizationId: orgId, archivedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            email: true,
            createdAt: true,
            property: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
          },
        }),
      ]);

      const breakdown = statusCounts.map((row) => ({
        status: row.status,
        count: row._count._all,
      }));

      return {
        reply: `Tenant summary: ${total} total. Status breakdown: ${breakdown
          .map((row) => `${row.status} ${row.count}`)
          .join(', ')}.`,
        data: { total, breakdown, recentTenants },
      };
    },
  },
  {
    id: 'vendor_list',
    description: 'Active vendors with categories and contact info.',
    match: (text) => /vendors?|contractors?|service providers?/.test(text),
    handle: async (orgId) => {
      const [total, vendors] = await Promise.all([
        prisma.vendor.count({ where: { organizationId: orgId } }),
        prisma.vendor.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            name: true,
            category: true,
            phone: true,
            email: true,
            website: true,
          },
        }),
      ]);

      const replySuffix = total > vendors.length ? ` Showing ${vendors.length} of ${total}.` : '';
      return {
        reply: `Found ${total} vendors.${replySuffix}`,
        data: { total, vendors },
      };
    },
  },
  {
    id: 'hoa_fees_overview',
    description: 'HOA fee status summary and overdue fees.',
    match: (text) => /hoa fees?|homeowner fees?|dues|assessments?/.test(text),
    handle: async (orgId) => {
      const where = {
        association: { organizationId: orgId },
      } as const;

      const [total, statusCounts, overdueFees] = await Promise.all([
        prisma.hOAFee.count({ where }),
        prisma.hOAFee.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        prisma.hOAFee.findMany({
          where: {
            association: { organizationId: orgId },
            status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
          orderBy: { dueDate: 'asc' },
          take: 20,
          include: {
            homeowner: { select: { id: true, firstName: true, lastName: true, email: true } },
            association: { select: { id: true, name: true } },
          },
        }),
      ]);

      const breakdown = statusCounts.map((row) => ({
        status: row.status,
        count: row._count._all,
      }));

      return {
        reply: `HOA fees: ${total} total. Status breakdown: ${breakdown
          .map((row) => `${row.status} ${row.count}`)
          .join(', ')}.`,
        data: {
          total,
          breakdown,
          overdueFees: overdueFees.map((fee) => ({
            id: fee.id,
            description: fee.description,
            status: fee.status,
            amount: Number(fee.amount),
            dueDate: fee.dueDate,
            homeowner: fee.homeowner,
            association: fee.association,
          })),
        },
      };
    },
  },
  {
    id: 'reconciliation_status',
    description: 'Recent reconciliations and status summary.',
    match: (text) => /reconciliation|bank match|bank transactions?/.test(text),
    handle: async (orgId) => {
      const [total, statusCounts, recent] = await Promise.all([
        prisma.reconciliation.count({ where: { organizationId: orgId } }),
        prisma.reconciliation.groupBy({
          by: ['status'],
          where: { organizationId: orgId },
          _count: { _all: true },
        }),
        prisma.reconciliation.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            expectedTotal: true,
            actualTotal: true,
            difference: true,
            createdAt: true,
          },
        }),
      ]);

      const breakdown = statusCounts.map((row) => ({
        status: row.status,
        count: row._count._all,
      }));

      return {
        reply: `Reconciliation status: ${total} total. Breakdown: ${breakdown
          .map((row) => `${row.status} ${row.count}`)
          .join(', ')}.`,
        data: {
          total,
          breakdown,
          recent: recent.map((item) => ({
            ...item,
            expectedTotal: Number(item.expectedTotal ?? 0),
            actualTotal: Number(item.actualTotal ?? 0),
            difference: Number(item.difference ?? 0),
          })),
        },
      };
    },
  },
];

const isHelpRequest = (text: string) => /help|what can you do|capabilities|commands/.test(text);

export const runCopilot = async (orgId: string, message: string): Promise<CopilotResult> => {
  const text = message.toLowerCase().trim();

  if (isHelpRequest(text)) {
    return {
      intent: 'help',
      reply: 'Here are a few things I can help with right now.',
      data: {
        capabilities: intents.map((intent) => ({
          id: intent.id,
          description: intent.description,
        })),
      },
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  const intent = intents.find((candidate) => candidate.match(text));
  if (!intent) {
    return {
      intent: 'unknown',
      reply: "I'm not sure yet. Try one of these requests.",
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }

  const result = await intent.handle(orgId, text);
  return {
    intent: intent.id,
    reply: result.reply,
    data: result.data,
    suggestions: DEFAULT_SUGGESTIONS,
  };
};

