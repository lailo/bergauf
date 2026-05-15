import { describe, expect, test } from 'bun:test';
import { convertGeometryToWgs84, dedupConsecutive } from '@/tools/get-named-route.ts';
import { lv95ToWgs84, wgs84ToLv95 } from '@/utils/lv95.ts';

describe('dedupConsecutive', () => {
  test('drops adjacent identical points but keeps the rest', () => {
    expect(
      dedupConsecutive([
        [1, 1],
        [1, 1],
        [2, 2],
        [2, 2],
        [2, 2],
        [3, 3],
      ]),
    ).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  test('preserves non-adjacent duplicates (legitimate loop closures)', () => {
    // A → B → C → A (closed loop): the final A is not adjacent to the first A
    // and must be preserved.
    expect(
      dedupConsecutive([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ]),
    ).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ]);
  });

  test('preserves near-duplicates with tiny floating-point differences', () => {
    expect(
      dedupConsecutive([
        [1.0, 1.0],
        [1.0, 1.0000001],
      ]),
    ).toHaveLength(2);
  });

  test('preserves order', () => {
    const input: [number, number][] = [
      [3, 3],
      [1, 1],
      [2, 2],
    ];
    expect(dedupConsecutive(input)).toEqual(input);
  });

  test('handles empty and single-point inputs', () => {
    expect(dedupConsecutive([])).toEqual([]);
    expect(dedupConsecutive([[5, 5]])).toEqual([[5, 5]]);
  });
});

describe('convertGeometryToWgs84', () => {
  // The Bern reference point — same anchor used in lv95.test.ts.
  const bernWgs84 = { lat: 46.95108, lng: 7.43863 };
  const bernLv95 = wgs84ToLv95(bernWgs84);

  test('converts a LineString from LV95 to WGS84 [lng, lat] pairs', () => {
    const out = convertGeometryToWgs84({
      type: 'LineString',
      coordinates: [
        [bernLv95.easting, bernLv95.northing],
        [bernLv95.easting + 1000, bernLv95.northing + 1000],
      ],
    }) as { type: string; coordinates: [number, number][] };

    expect(out.type).toBe('LineString');
    expect(out.coordinates).toHaveLength(2);
    // Round-trip the first point back through wgs84ToLv95 to confirm orientation.
    const [lng, lat] = out.coordinates[0]!;
    expect(lat).toBeCloseTo(bernWgs84.lat, 4);
    expect(lng).toBeCloseTo(bernWgs84.lng, 4);
  });

  test('deduplicates consecutive identical points in the converted LineString', () => {
    const p: [number, number] = [bernLv95.easting, bernLv95.northing];
    const out = convertGeometryToWgs84({
      type: 'LineString',
      coordinates: [p, p, p, [p[0] + 1000, p[1] + 1000]],
    }) as { coordinates: unknown[] };
    expect(out.coordinates).toHaveLength(2);
  });

  test('converts a MultiLineString segment-by-segment with per-segment dedup', () => {
    const p: [number, number] = [bernLv95.easting, bernLv95.northing];
    const out = convertGeometryToWgs84({
      type: 'MultiLineString',
      coordinates: [
        [p, p, [p[0] + 1000, p[1]]],
        [
          [p[0] + 1000, p[1]],
          [p[0] + 1000, p[1]],
          [p[0] + 2000, p[1]],
        ],
      ],
    }) as { type: string; coordinates: unknown[][] };

    expect(out.type).toBe('MultiLineString');
    expect(out.coordinates).toHaveLength(2);
    expect(out.coordinates[0]).toHaveLength(2);
    expect(out.coordinates[1]).toHaveLength(2);
  });

  test('passes through Point unchanged in type but converted in coordinates', () => {
    const out = convertGeometryToWgs84({
      type: 'Point',
      coordinates: [bernLv95.easting, bernLv95.northing],
    }) as { type: string; coordinates: [number, number] };

    expect(out.type).toBe('Point');
    const wgs = lv95ToWgs84({ easting: bernLv95.easting, northing: bernLv95.northing });
    expect(out.coordinates[0]).toBeCloseTo(wgs.lng, 4);
    expect(out.coordinates[1]).toBeCloseTo(wgs.lat, 4);
  });

  test('returns non-object geometry unchanged', () => {
    expect(convertGeometryToWgs84(null)).toBeNull();
    expect(convertGeometryToWgs84(undefined)).toBeUndefined();
    expect(convertGeometryToWgs84('not-a-geometry')).toBe('not-a-geometry');
  });

  test('passes unknown geometry types through unchanged', () => {
    const geom = { type: 'GeometryCollection', geometries: [] };
    expect(convertGeometryToWgs84(geom)).toEqual(geom);
  });
});
