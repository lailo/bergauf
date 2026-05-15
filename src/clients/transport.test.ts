import { describe, expect, test } from 'bun:test';
import { findStations, planConnections } from '@/clients/transport.ts';

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

describe('transport findStations', () => {
  test('text query — passes query param', async () => {
    const stub = stubFetch({
      stations: [
        { id: '8503000', name: 'Zürich HB', coordinate: { type: 'WGS84', x: 47.378, y: 8.54 } },
      ],
    });
    const out = await findStations({ query: 'Zürich HB', fetchImpl: stub.fetch });
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('Zürich HB');
    expect(stub.lastUrl()).toContain('query=Z%C3%BCrich');
  });

  test('reverse lookup uses x=lat y=lon', async () => {
    const stub = stubFetch({ stations: [] });
    await findStations({ lat: 47.226, lon: 8.819, fetchImpl: stub.fetch });
    expect(stub.lastUrl()).toContain('x=47.226');
    expect(stub.lastUrl()).toContain('y=8.819');
  });
});

describe('transport planConnections', () => {
  test('parses connections list', async () => {
    const stub = stubFetch({
      connections: [
        {
          from: { station: { name: 'Zürich HB' } },
          to: { station: { name: 'Rapperswil' } },
          duration: '00d00:38:00',
          transfers: 0,
          products: ['IR'],
          sections: [],
        },
      ],
    });
    const conns = await planConnections({
      from: 'Zürich HB',
      to: 'Rapperswil',
      fetchImpl: stub.fetch,
    });
    expect(conns).toHaveLength(1);
    expect(conns[0]!.transfers).toBe(0);
    expect(stub.lastUrl()).toContain('from=Z%C3%BCrich');
    expect(stub.lastUrl()).toContain('to=Rapperswil');
  });
});
