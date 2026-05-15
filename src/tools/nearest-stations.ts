import { z } from 'zod';
import { findStations } from '@/clients/transport.ts';

export const nearestStationsInput = {
  lat: z.number().describe('Latitude (WGS84).'),
  lon: z.number().describe('Longitude (WGS84).'),
  limit: z.number().int().min(1).max(20).default(5),
};

const StationOut = z.object({
  id: z.string().optional(),
  name: z.string(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  distanceM: z.number().optional(),
});

export const nearestStationsOutput = {
  stations: z.array(StationOut),
};

export async function nearestStationsHandler({
  lat,
  lon,
  limit,
}: {
  lat: number;
  lon: number;
  limit: number;
}) {
  const raw = await findStations({ lat, lon, type: 'station' });
  // The /locations?type=station endpoint sometimes returns address rows with
  // id: null mixed in with real stations — filter those out.
  const stations = raw
    .filter((s) => s.name && s.id)
    .slice(0, limit)
    .map((s) => ({
      id: s.id!,
      name: s.name!,
      lat: s.coordinate?.x ?? undefined,
      lon: s.coordinate?.y ?? undefined,
      distanceM: s.distance ?? undefined,
    }));
  return { stations };
}
