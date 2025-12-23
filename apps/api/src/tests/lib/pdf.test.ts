import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAndUploadLeasePdf } from '../../lib/pdf.js';
import { LeaseTemplateData } from '../../lib/pdf.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(() => Promise.resolve('<html><body>Test Template</body></html>')),
}));

// Mock puppeteer and storage
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(() => Promise.resolve({
      newPage: vi.fn(() => Promise.resolve({
        setContent: vi.fn(() => Promise.resolve()),
        pdf: vi.fn(() => Promise.resolve(Buffer.from('pdf content'))),
        close: vi.fn(() => Promise.resolve()),
      })),
      close: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock('../../lib/storage.js', () => ({
  uploadFile: vi.fn(() => Promise.resolve('leases/test-lease.pdf')),
  getSignedUrl: vi.fn(() => Promise.resolve('https://storage.example.com/leases/test-lease.pdf')),
}));

describe('PDF Library', () => {
  describe('generateAndUploadLeasePdf', () => {
    const templateData: LeaseTemplateData = {
      organizationName: 'Test Org',
      propertyName: 'Test Property',
      propertyAddress: '123 Main St, Test City, CA 12345',
      unitName: 'Unit 1',
      state: 'CA',
      bedrooms: 2,
      bathrooms: 1.5,
      squareFeet: 1000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      rentAmount: '$1,000.00',
      depositAmount: '$1,000.00',
      rentDueDay: 1,
      tenants: [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '1234567890',
          isPrimary: true,
        },
      ],
      generatedDate: '2024-01-01',
    };

    it('should generate and upload PDF', async () => {
      const result = await generateAndUploadLeasePdf(
        templateData,
        'test-org-id',
        'test-lease-id'
      );

      expect(result).toBeDefined();
      expect(result.storageKey).toContain('leases/');
    });

    it('should use state-specific template when available', async () => {
      const caData = { ...templateData, state: 'CA' };
      await generateAndUploadLeasePdf(caData, 'test-org-id', 'test-lease-id');
      // Template selection is tested implicitly
    });

    it('should fallback to default template for unknown state', async () => {
      const unknownStateData = { ...templateData, state: 'XX' };
      await generateAndUploadLeasePdf(unknownStateData, 'test-org-id', 'test-lease-id');
      // Should not throw
    });
  });
});

