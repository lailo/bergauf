import { describe, expect, test } from 'bun:test';
import { attrsToWgs84 } from '@/tools/search-location.ts';
import { wgs84ToLv95 } from '@/utils/lv95.ts';

describe('attrsToWgs84', () => {
  test('returns lat/lon directly when both are present (no conversion)', () => {
    const out = attrsToWgs84({ lat: 47.378, lon: 8.54 });
    expect(out).toEqual({ lat: 47.378, lon: 8.54 });
  });

  test('falls back to LV95 conversion when only y/x are present (sr=2056 contract)', () => {
    // The published Bern reference point — same anchor as lv95.test.ts.
    const bern = { lat: 46.95108, lng: 7.43863 };
    const lv95 = wgs84ToLv95(bern);

    const out = attrsToWgs84({ y: lv95.easting, x: lv95.northing });
    expect(out).toBeDefined();
    expect(out!.lat).toBeCloseTo(bern.lat, 4);
    expect(out!.lon).toBeCloseTo(bern.lng, 4);
  });

  test('prefers lat/lon over y/x when both are present', () => {
    // If both are present, the helper must NOT call the LV95 conversion —
    // a y/x flip would produce coordinates well outside Switzerland.
    const out = attrsToWgs84({ lat: 47, lon: 8, y: 2_600_000, x: 1_200_000 });
    expect(out).toEqual({ lat: 47, lon: 8 });
  });

  test('returns undefined when neither pair is fully present', () => {
    expect(attrsToWgs84({})).toBeUndefined();
    expect(attrsToWgs84({ lat: 47 })).toBeUndefined(); // lon missing
    expect(attrsToWgs84({ y: 2_600_000 })).toBeUndefined(); // x missing
  });

  test('treats non-number values as missing', () => {
    // Defensive: the upstream schema is `.passthrough()` and could carry
    // string-ified numbers; the helper only accepts real numbers.
    expect(attrsToWgs84({ lat: '47.378' as unknown as number, lon: 8.54 })).toBeUndefined();
  });
});
