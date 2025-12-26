import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runCopilot } from '../../lib/copilot.js';
import { prisma } from '../../lib/prisma.js';
import { createTestOrganization, cleanupTestData } from '../setup.js';

describe('Copilot', () => {
  let testOrg: any;

  beforeEach(async () => {
    await cleanupTestData();
    testOrg = await createTestOrganization();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('runCopilot', () => {
    it('should return help response for help requests', async () => {
      const result = await runCopilot(testOrg.id, 'help');
      
      expect(result.intent).toBe('help');
      expect(result.reply).toContain('Here are a few things I can help with');
      expect(result.data).toBeDefined();
      expect(result.data?.capabilities).toBeDefined();
      expect(Array.isArray(result.data?.capabilities)).toBe(true);
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should return help response for "what can you do"', async () => {
      const result = await runCopilot(testOrg.id, 'what can you do');
      
      expect(result.intent).toBe('help');
    });

    it('should return unknown response for unrecognized requests', async () => {
      const result = await runCopilot(testOrg.id, 'random gibberish text');
      
      expect(result.intent).toBe('unknown');
      expect(result.reply).toContain("I'm not sure yet");
      expect(result.suggestions).toBeDefined();
    });

    it('should handle KPI requests', async () => {
      // Mock database responses
      vi.spyOn(prisma.property, 'count').mockResolvedValue(5);
      vi.spyOn(prisma.unit, 'count')
        .mockResolvedValueOnce(20) // total units
        .mockResolvedValueOnce(15); // occupied units
      vi.spyOn(prisma.charge, 'aggregate').mockResolvedValue({
        _sum: { amount: 50000 },
        _avg: null,
        _min: null,
        _max: null,
        _count: null,
      });
      vi.spyOn(prisma.payment, 'aggregate').mockResolvedValue({
        _sum: { amount: 45000 },
        _avg: null,
        _min: null,
        _max: null,
        _count: null,
      });
      vi.spyOn(prisma.workOrder, 'count').mockResolvedValue(3);

      const result = await runCopilot(testOrg.id, 'show me kpi summary');
      
      expect(result.intent).toBe('kpis');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle work orders requests', async () => {
      vi.spyOn(prisma.workOrder, 'count').mockResolvedValue(5);
      vi.spyOn(prisma.workOrder, 'findMany').mockResolvedValue([]);

      const result = await runCopilot(testOrg.id, 'show me work orders');
      
      expect(result.intent).toBe('open_work_orders');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle delinquent charges requests', async () => {
      vi.spyOn(prisma.charge, 'count').mockResolvedValue(3);
      vi.spyOn(prisma.charge, 'findMany').mockResolvedValue([]);

      const result = await runCopilot(testOrg.id, 'show delinquent charges');
      
      expect(result.intent).toBe('delinquent_charges');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle leases expiring requests', async () => {
      vi.spyOn(prisma.lease, 'findMany').mockResolvedValue([]);

      const result = await runCopilot(testOrg.id, 'show expiring leases');
      
      expect(result.intent).toBe('leases_expiring');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle tenant status requests', async () => {
      vi.spyOn(prisma.tenant, 'count').mockResolvedValue(10);
      vi.spyOn(prisma.tenant, 'findMany').mockResolvedValue([]);

      const result = await runCopilot(testOrg.id, 'show tenant status');
      
      expect(result.intent).toBe('tenant_summary');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle properties requests', async () => {
      vi.spyOn(prisma.property, 'findMany').mockResolvedValue([]);

      const result = await runCopilot(testOrg.id, 'list properties');
      
      expect(result.intent).toBe('properties_list');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle vendors requests', async () => {
      vi.spyOn(prisma.vendor, 'findMany').mockResolvedValue([]);

      const result = await runCopilot(testOrg.id, 'list active vendors');
      
      expect(result.intent).toBe('vendor_list');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle recent payments requests', async () => {
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([]);

      const result = await runCopilot(testOrg.id, 'show recent payments');
      
      expect(result.intent).toBe('recent_payments');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle occupancy requests', async () => {
      vi.spyOn(prisma.unit, 'count')
        .mockResolvedValueOnce(20) // total units
        .mockResolvedValueOnce(5)  // vacant units
        .mockResolvedValueOnce(15); // occupied units

      const result = await runCopilot(testOrg.id, 'show occupancy');
      
      expect(result.intent).toBe('occupancy');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle HOA fees overdue requests', async () => {
      vi.spyOn(prisma.hOAFee, 'findMany').mockResolvedValue([]);

      const result = await runCopilot(testOrg.id, 'show HOA fees');
      
      expect(result.intent).toBe('hoa_fees_overview');
      expect(result.reply).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });
});

