import { describe, expect, test } from 'bun:test';
import { elevationProfile, identify, pointElevation, searchLocations } from '@/clients/geoadmin.ts';

// Helper: stub fetch that returns one canned JSON response and records the URL it was called with.
function stubFetch(body: unknown, status = 200) {
  let lastUrl = '';
  const fn = async (url: string | URL | Request) => {
    lastUrl = String(url);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { fetch: fn, lastUrl: () => lastUrl };
}

describe('geoadmin searchLocations', () => {
  test('parses results and includes searchText in URL', async () => {
    const stub = stubFetch({
      results: [
        {
          id: 1,
          weight: 50,
          attrs: {
            label: '<b>Rapperswil</b>',
            detail: 'rapperswil 8640 sg',
            lat: 47.226,
            lon: 8.819,
          },
        },
      ],
    });
    const out = await searchLocations('Rapperswil', { fetchImpl: stub.fetch });
    expect(out).toHaveLength(1);
    expect(out[0]!.attrs.label).toContain('Rapperswil');
    expect(stub.lastUrl()).toContain('searchText=Rapperswil');
    expect(stub.lastUrl()).toContain('type=locations');
  });
});

describe('geoadmin identify', () => {
  test('passes Wanderland layer and geometry params', async () => {
    const stub = stubFetch({
      results: [
        {
          layerBodId: 'ch.astra.wanderland',
          featureId: 'r-7',
          attributes: { name: 'Trans Swiss Trail', category: 'national', length_km: 488 },
          geometry: { type: 'LineString', coordinates: [] },
        },
      ],
    });
    const out = await identify({
      layer: 'ch.astra.wanderland',
      geometry: '2600000,1200000',
      geometryType: 'esriGeometryPoint',
      fetchImpl: stub.fetch,
    });
    expect(out).toHaveLength(1);
    expect(out[0]!.layerBodId).toBe('ch.astra.wanderland');
    expect(stub.lastUrl()).toContain('layers=all%3Ach.astra.wanderland');
    expect(stub.lastUrl()).toContain('geometryFormat=geojson');
  });
});

describe('geoadmin elevationProfile', () => {
  test('parses dist/alts entries', async () => {
    const stub = stubFetch([
      { dist: 0, alts: { COMB: 450.5, DTM2: 450.4 }, easting: 2600000, northing: 1200000 },
      { dist: 100, alts: { COMB: 460.2 }, easting: 2600100, northing: 1200000 },
    ]);
    const out = await elevationProfile('{"type":"LineString","coordinates":[]}', {
      fetchImpl: stub.fetch,
    });
    expect(out).toHaveLength(2);
    expect(out[1]!.dist).toBe(100);
    expect(out[1]!.alts.COMB).toBe(460.2);
  });
});

describe('geoadmin pointElevation', () => {
  test('parses string height into number', async () => {
    const stub = stubFetch({ height: '482.3', easting: '2600000', northing: '1200000' });
    const h = await pointElevation(2_600_000, 1_200_000, { fetchImpl: stub.fetch });
    expect(h).toBeCloseTo(482.3);
  });
});
