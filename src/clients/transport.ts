// Swiss public transport — transport.opendata.ch.
//
// Coordinate system: WGS84 (lat/lon). No auth, soft rate limit (429s if hammered).
// Docs: https://transport.opendata.ch/docs.html

import { z } from 'zod';
import { buildQuery, type FetchLike, fetchJson } from '@/utils/http.ts';

const BASE = 'https://transport.opendata.ch/v1';
const USER_AGENT = 'bergauf/0.1 (Switzerland hiking MCP server)';

// ----- Locations / stations -----

const Coordinate = z
  .object({
    type: z.string().optional(),
    x: z.number().nullable().optional(),
    y: z.number().nullable().optional(),
  })
  .nullable()
  .optional();

const Station = z
  .object({
    id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    score: z.number().nullable().optional(),
    coordinate: Coordinate,
    distance: z.number().nullable().optional(),
  })
  .passthrough();

const StationsResponse = z.object({
  stations: z.array(Station),
});

export type Station = z.infer<typeof Station>;

export interface FindStationsOptions {
  query?: string;
  // Reverse lookup: x = latitude, y = longitude (yes, that's the API).
  lat?: number;
  lon?: number;
  type?: 'all' | 'station' | 'poi' | 'address';
  fetchImpl?: FetchLike;
}

export async function findStations(opts: FindStationsOptions): Promise<Station[]> {
  const params: Record<string, string | number | undefined> = { type: opts.type ?? 'station' };
  if (opts.query) params.query = opts.query;
  if (opts.lat !== undefined) params.x = opts.lat;
  if (opts.lon !== undefined) params.y = opts.lon;
  const url = `${BASE}/locations${buildQuery(params)}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT },
    fetchImpl: opts.fetchImpl,
  });
  return StationsResponse.parse(data).stations;
}

// ----- Connections -----

const Stop = z
  .object({
    station: Station,
    arrival: z.string().nullable().optional(),
    departure: z.string().nullable().optional(),
    platform: z.string().nullable().optional(),
    delay: z.number().nullable().optional(),
  })
  .passthrough();

const Journey = z
  .object({
    name: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
    operator: z.string().nullable().optional(),
    to: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const Section = z
  .object({
    departure: Stop,
    arrival: Stop,
    journey: Journey,
    walk: z.object({ duration: z.number().nullable().optional() }).nullable().optional(),
  })
  .passthrough();

const Connection = z
  .object({
    from: Stop,
    to: Stop,
    duration: z.string().nullable().optional(),
    transfers: z.number().nullable().optional(),
    products: z.array(z.string()).optional(),
    sections: z.array(Section).optional(),
  })
  .passthrough();

const ConnectionsResponse = z.object({
  connections: z.array(Connection),
});

export type Connection = z.infer<typeof Connection>;

export interface PlanConnectionOptions {
  from: string;
  to: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  isArrivalTime?: boolean;
  limit?: number;
  fetchImpl?: FetchLike;
}

export async function planConnections(opts: PlanConnectionOptions): Promise<Connection[]> {
  const url = `${BASE}/connections${buildQuery({
    from: opts.from,
    to: opts.to,
    date: opts.date,
    time: opts.time,
    isArrivalTime: opts.isArrivalTime ? 1 : 0,
    limit: opts.limit ?? 4,
  })}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT },
    fetchImpl: opts.fetchImpl,
  });
  return ConnectionsResponse.parse(data).connections;
}
