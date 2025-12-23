import { describe, it, expect } from '@jest/globals';
import { WORK_ORDER_CATEGORIES, getCategoryLabel } from '../../constants/workOrderCategories';

describe('Work Order Categories', () => {
  describe('WORK_ORDER_CATEGORIES', () => {
    it('should contain all expected categories', () => {
      expect(WORK_ORDER_CATEGORIES).toContain('PLUMBING');
      expect(WORK_ORDER_CATEGORIES).toContain('ELECTRICAL');
      expect(WORK_ORDER_CATEGORIES).toContain('HVAC');
      expect(WORK_ORDER_CATEGORIES).toContain('GENERAL');
    });
  });

  describe('getCategoryLabel', () => {
    it('should format category labels correctly', () => {
      expect(getCategoryLabel('PLUMBING')).toBe('Plumbing');
      expect(getCategoryLabel('ELECTRICAL')).toBe('Electrical');
      expect(getCategoryLabel('GENERAL')).toBe('General');
    });

    it('should keep HVAC as uppercase', () => {
      expect(getCategoryLabel('HVAC')).toBe('HVAC');
    });

    it('should handle multi-word categories', () => {
      expect(getCategoryLabel('WORK_ORDER')).toBe('Work Order');
    });
  });
});

