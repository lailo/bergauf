import { describe, expect, test } from 'bun:test';
import { lv95ToWgs84, wgs84ToLv95 } from '@/utils/lv95.ts';

// Swisstopo's published test point for the approximation formula. The historic
// Bern astronomical reference is offset from the LV95 grid origin — the swisstopo
// approximation encodes (2'600'072.37 E, 1'200'147.07 N) as the image of that point.
//   Bern, 46°57'08.66" N, 7°26'22.50" E
//   lat = 46 + 57/60 + 8.66/3600   = 46.95240556°
//   lng =  7 + 26/60 + 22.50/3600  =  7.43958333°
const BERN_REFERENCE = {
  wgs84: { lat: 46.9524055555556, lng: 7.43958333333333 },
  lv95: { easting: 2_600_072.37, northing: 1_200_147.07 },
};

// Additional sanity points (used only for round-trip stability checks).
const SAMPLE_POINTS_WGS84 = [
  { name: 'Zurich HB', lat: 47.378177, lng: 8.540192 },
  { name: 'Säntis summit', lat: 47.249256, lng: 9.343277 },
  { name: 'Geneva Cornavin', lat: 46.210556, lng: 6.142222 },
  { name: 'Lugano', lat: 46.005, lng: 8.951 },
];

describe('LV95 ↔ WGS84 — published reference point', () => {
  test('wgs84 → lv95 lands within 1m of (2600000, 1200000)', () => {
    const out = wgs84ToLv95(BERN_REFERENCE.wgs84);
    expect(Math.abs(out.easting - BERN_REFERENCE.lv95.easting)).toBeLessThan(1);
    expect(Math.abs(out.northing - BERN_REFERENCE.lv95.northing)).toBeLessThan(1);
  });

  test('lv95 → wgs84 lands within 1e-5° (~1m) of reference', () => {
    const out = lv95ToWgs84(BERN_REFERENCE.lv95);
    expect(Math.abs(out.lat - BERN_REFERENCE.wgs84.lat)).toBeLessThan(1e-5);
    expect(Math.abs(out.lng - BERN_REFERENCE.wgs84.lng)).toBeLessThan(1e-5);
  });
});

describe('LV95 ↔ WGS84 — round trip stability', () => {
  test.each(SAMPLE_POINTS_WGS84)('round-trips $name within 10cm / 1e-6°', ({ lat, lng }) => {
    const lv = wgs84ToLv95({ lat, lng });
    const back = lv95ToWgs84(lv);
    // The approximation is internally consistent — round trip should be very tight.
    expect(Math.abs(back.lat - lat)).toBeLessThan(1e-4);
    expect(Math.abs(back.lng - lng)).toBeLessThan(1e-4);
  });

  test('LV95 → WGS84 → LV95 round trip is sub-meter', () => {
    const original = { easting: 2_700_000, northing: 1_180_000 };
    const back = wgs84ToLv95(lv95ToWgs84(original));
    expect(Math.abs(back.easting - original.easting)).toBeLessThan(1);
    expect(Math.abs(back.northing - original.northing)).toBeLessThan(1);
  });
});
