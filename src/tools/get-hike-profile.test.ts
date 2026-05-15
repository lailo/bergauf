import { describe, expect, test } from 'bun:test';
import { pickAlt } from '@/tools/get-hike-profile.ts';

describe('pickAlt', () => {
  test('prefers COMB over DTM2/DTM25', () => {
    expect(pickAlt({ COMB: 1000, DTM2: 999, DTM25: 998 })).toBe(1000);
  });

  test('falls back to DTM2 when COMB is missing', () => {
    expect(pickAlt({ DTM2: 999, DTM25: 998 })).toBe(999);
  });

  test('falls back to DTM25 when COMB and DTM2 are missing', () => {
    expect(pickAlt({ DTM25: 998 })).toBe(998);
  });

  test('falls back to first value for an unknown model', () => {
    expect(pickAlt({ DTM_X: 1234 })).toBe(1234);
  });

  test('returns 0 instead of NaN-propagating when no model is present', () => {
    expect(pickAlt({})).toBe(0);
  });
});
