import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { Station } from '@/clients/transport.ts';

afterEach(() => {
  mock.restore();
});

async function withStations(raw: Station[]) {
  mock.module('@/clients/transport.ts', () => ({
    findStations: async () => raw,
  }));
  const { nearestStationsHandler } = await import('@/tools/nearest-stations.ts');
  return nearestStationsHandler({ lat: 47.378, lon: 8.54, limit: 5 });
}

describe('nearestStationsHandler', () => {
  test('filters out address-like results (id: null) returned by /locations?type=station', async () => {
    const out = await withStations([
      {
        id: '8503000',
        name: 'Zürich HB',
        coordinate: { type: 'WGS84', x: 47.3781, y: 8.5403 },
        distance: 12,
      } as Station,
      {
        id: null,
        name: 'Untere Bahnhofstr. 16.1, Rapperswil',
        coordinate: { type: 'WGS84', x: 47.226, y: 8.819 },
        distance: 34_000,
      } as Station,
      {
        id: '8503001',
        name: 'Zürich Stadelhofen',
        coordinate: { type: 'WGS84', x: 47.366, y: 8.547 },
        distance: 1_400,
      } as Station,
    ]);
    expect(out.stations.map((s) => s.id)).toEqual(['8503000', '8503001']);
    expect(out.stations.every((s) => !s.name.includes('Bahnhofstr'))).toBe(true);
  });

  test('drops entries without a name', async () => {
    const out = await withStations([
      { id: '8503000', name: null, coordinate: null, distance: null } as Station,
      { id: '8503001', name: 'Bern', coordinate: null, distance: null } as Station,
    ]);
    expect(out.stations.map((s) => s.id)).toEqual(['8503001']);
  });

  test('respects limit after filtering', async () => {
    const raw: Station[] = Array.from({ length: 10 }, (_, i) => ({
      id: i % 2 === 0 ? `${i}` : null,
      name: `S${i}`,
      coordinate: null,
      distance: i,
    })) as Station[];
    const out = await withStations(raw);
    expect(out.stations).toHaveLength(5);
    expect(out.stations.map((s) => s.id)).toEqual(['0', '2', '4', '6', '8']);
  });
});
