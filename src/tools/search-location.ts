import { z } from 'zod';
import { searchLocations } from '@/clients/geoadmin.ts';
import { lv95ToWgs84 } from '@/utils/lv95.ts';

export const searchLocationInput = {
  query: z
    .string()
    .min(1)
    .describe(
      'Free-text place name in Switzerland, e.g. "Rapperswil", "Säntis", "Bern Bundesplatz".',
    ),
  limit: z.number().int().min(1).max(20).default(8).describe('Max results to return.'),
};

const ResultSchema = z.object({
  label: z.string(),
  detail: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
  origin: z.string().optional(),
});

export const searchLocationOutput = {
  results: z.array(ResultSchema),
};

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').trim();

// The SearchServer returns coordinates either as lat/lon (WGS84) or as y/x (LV95
// where y is easting and x is northing). Prefer lat/lon if present, else convert.
// The LV95 branch only holds because the client passes sr=2056 (see geoadmin.ts
// searchLocations); changing that without updating here will silently break.
export function attrsToWgs84(a: {
  lat?: number;
  lon?: number;
  x?: number;
  y?: number;
}): { lat: number; lon: number } | undefined {
  if (typeof a.lat === 'number' && typeof a.lon === 'number') {
    return { lat: a.lat, lon: a.lon };
  }
  if (typeof a.y === 'number' && typeof a.x === 'number') {
    const wgs = lv95ToWgs84({ easting: a.y, northing: a.x });
    return { lat: wgs.lat, lon: wgs.lng };
  }
  return undefined;
}

export async function searchLocationHandler({
  query,
  limit,
}: {
  query: string;
  limit: number;
}): Promise<{ results: z.infer<typeof ResultSchema>[] }> {
  const raw = await searchLocations(query, { limit });
  const results: z.infer<typeof ResultSchema>[] = [];
  for (const r of raw) {
    const a = r.attrs;
    const wgs = attrsToWgs84(a);
    if (!wgs) continue;
    results.push({
      label: stripHtml(a.label),
      detail: a.detail,
      lat: wgs.lat,
      lon: wgs.lon,
      origin: a.origin,
    });
  }
  return { results };
}
