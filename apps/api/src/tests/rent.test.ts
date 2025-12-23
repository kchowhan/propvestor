import { describe, it, expect } from 'vitest';
import { buildRentDueDate } from '../lib/rent.js';

const makeLease = (rentDueDay: number) =>
  ({
    rentDueDay,
  } as any);

describe('buildRentDueDate', () => {
  it('should clamp to last day of month', () => {
    const lease = makeLease(31);
    const dueDate = buildRentDueDate(lease, 2, 2024);
    expect(dueDate.getFullYear()).toBe(2024);
    expect(dueDate.getMonth()).toBe(1);
    expect(dueDate.getDate()).toBe(29);
  });

  it('should use rentDueDay when valid', () => {
    const lease = makeLease(10);
    const dueDate = buildRentDueDate(lease, 9, 2025);
    expect(dueDate.getFullYear()).toBe(2025);
    expect(dueDate.getMonth()).toBe(8);
    expect(dueDate.getDate()).toBe(10);
  });
});
