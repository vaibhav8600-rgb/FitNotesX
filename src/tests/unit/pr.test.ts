import { describe, it, expect } from 'vitest';
import { epley1RM, isWeightRepsPR } from '@/utils/pr';

describe('PR utils', () => {
  it('calculates Epley 1RM', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 5)).toBe(117);
  });

  it('detects PR when higher', () => {
    expect(isWeightRepsPR(120, 100, 5)).toBe(false);
    expect(isWeightRepsPR(110, 100, 5)).toBe(true);
  });
});
