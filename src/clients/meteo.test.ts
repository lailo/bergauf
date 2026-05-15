import { describe, expect, test } from 'bun:test';
import { getForecast } from '@/clients/meteo.ts';

function stubFetch(body: unknown) {
  let lastUrl = '';
  let lastHeaders: Headers | undefined;
  const fn = async (url: string | URL | Request, init?: RequestInit) => {
    lastUrl = String(url);
    lastHeaders = new Headers(init?.headers);
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { fetch: fn, lastUrl: () => lastUrl, lastHeaders: () => lastHeaders };
}

describe('meteo getForecast', () => {
  test('parses hourly + daily arrays and includes ICON model', async () => {
    const stub = stubFetch({
      latitude: 47.378,
      longitude: 8.54,
      elevation: 410,
      timezone: 'Europe/Zurich',
      hourly: {
        time: ['2026-05-15T06:00', '2026-05-15T07:00'],
        temperature_2m: [8.5, 9.2],
        precipitation_probability: [10, 20],
        precipitation: [0, 0.1],
        wind_speed_10m: [5.4, 6.1],
        weather_code: [2, 3],
      },
      daily: {
        time: ['2026-05-15'],
        weather_code: [2],
        temperature_2m_max: [15.2],
        temperature_2m_min: [7.1],
        precipitation_sum: [0.3],
      },
    });
    const f = await getForecast({ lat: 47.378, lon: 8.54, fetchImpl: stub.fetch });
    expect(f.hourly?.temperature_2m?.[0]).toBe(8.5);
    expect(f.daily?.temperature_2m_max?.[0]).toBe(15.2);
    expect(stub.lastUrl()).toContain('models=icon_seamless');
    expect(stub.lastUrl()).toContain('timezone=Europe%2FZurich');
    expect(stub.lastHeaders()?.get('User-Agent')).toMatch(/^bergauf\//);
  });
});
