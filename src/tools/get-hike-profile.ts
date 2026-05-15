import { z } from 'zod';
import { elevationProfile } from '@/clients/geoadmin.ts';
import { lineStringWgs84ToLv95Geojson } from '@/utils/lv95.ts';
import { estimateHikeTime, formatHikeTime } from '@/utils/time-estimate.ts';

export const getHikeProfileInput = {
  lineString: z
    .object({
      type: z.literal('LineString'),
      coordinates: z
        .array(z.tuple([z.number(), z.number()]))
        .min(2)
        .describe('Array of [longitude, latitude] pairs in WGS84.'),
    })
    .describe('GeoJSON LineString in WGS84. Use the geometry from get_named_route.'),
  nbPoints: z.number().int().min(20).max(500).default(200).describe('Profile sample count.'),
};

const ProfileSample = z.object({
  distM: z.number(),
  elevationM: z.number(),
});

export const getHikeProfileOutput = {
  distanceKm: z.number(),
  ascentM: z.number(),
  descentM: z.number(),
  minElevationM: z.number(),
  maxElevationM: z.number(),
  startElevationM: z.number(),
  endElevationM: z.number(),
  estimatedTimeMinutes: z.number(),
  estimatedTimeFormatted: z.string(),
  samples: z.array(ProfileSample),
};

// Prefer the combined elevation model, then DTM2 (2m grid), then DTM25.
// Falls back to 0 when no value is present (upstream returned an empty bag) so
// downstream ascent/descent arithmetic stays numeric instead of NaN-propagating.
export function pickAlt(alts: Record<string, number>): number {
  return alts.COMB ?? alts.DTM2 ?? alts.DTM25 ?? Object.values(alts)[0] ?? 0;
}

export async function getHikeProfileHandler({
  lineString,
  nbPoints,
}: {
  lineString: { type: 'LineString'; coordinates: [number, number][] };
  nbPoints: number;
}) {
  const geomLv95 = lineStringWgs84ToLv95Geojson(
    lineString.coordinates.map(([lng, lat]) => ({ lat, lng })),
  );
  const points = await elevationProfile(geomLv95, { nbPoints });
  if (points.length === 0) {
    throw new Error('No elevation profile returned for this line.');
  }

  let ascent = 0;
  let descent = 0;
  let minAlt = Number.POSITIVE_INFINITY;
  let maxAlt = Number.NEGATIVE_INFINITY;
  let prev = pickAlt(points[0]!.alts);
  for (let i = 0; i < points.length; i++) {
    const alt = pickAlt(points[i]!.alts);
    if (alt < minAlt) minAlt = alt;
    if (alt > maxAlt) maxAlt = alt;
    if (i > 0) {
      const d = alt - prev;
      if (d > 0) ascent += d;
      else descent += -d;
    }
    prev = alt;
  }

  const distanceM = points[points.length - 1]!.dist;
  const distanceKm = distanceM / 1000;
  const startAlt = pickAlt(points[0]!.alts);
  const endAlt = pickAlt(points[points.length - 1]!.alts);
  const { totalMinutes } = estimateHikeTime({
    distanceKm,
    ascentM: ascent,
    descentM: descent,
  });

  return {
    distanceKm: round(distanceKm, 2),
    ascentM: Math.round(ascent),
    descentM: Math.round(descent),
    minElevationM: Math.round(minAlt),
    maxElevationM: Math.round(maxAlt),
    startElevationM: Math.round(startAlt),
    endElevationM: Math.round(endAlt),
    estimatedTimeMinutes: totalMinutes,
    estimatedTimeFormatted: formatHikeTime(totalMinutes),
    samples: points.map((p) => ({
      distM: Math.round(p.dist),
      elevationM: Math.round(pickAlt(p.alts)),
    })),
  };
}

function round(n: number, decimals: number): number {
  const m = 10 ** decimals;
  return Math.round(n * m) / m;
}
