import { z } from 'zod';
import { getFeature } from '@/clients/geoadmin.ts';
import { lv95ToWgs84 } from '@/utils/lv95.ts';

export const getNamedRouteInput = {
  routeId: z
    .union([z.string(), z.number()])
    .describe('SwitzerlandMobility route feature id, as returned by list_named_routes.'),
  includeGeometryWgs84: z
    .boolean()
    .default(true)
    .describe('Convert and include the route geometry in WGS84 GeoJSON (else returns LV95).'),
};

const Wgs84LineString = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([z.number(), z.number()])),
});

const Wgs84MultiLineString = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export const getNamedRouteOutput = {
  id: z.union([z.string(), z.number()]),
  attributes: z.record(z.unknown()).optional(),
  geometry: z.union([Wgs84LineString, Wgs84MultiLineString, z.unknown()]),
};

// Drop consecutive points that are identical (the Wanderland layer stitches
// segments end-to-end and repeats the shared endpoint, which roughly doubles
// the payload size for no information gain).
export function dedupConsecutive(line: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of line) {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out;
}

// Convert a GeoJSON geometry whose coordinates are in LV95 to WGS84 (lng, lat).
export function convertGeometryToWgs84(geom: unknown): unknown {
  if (!geom || typeof geom !== 'object') return geom;
  const g = geom as { type?: string; coordinates?: unknown };
  const cvtPoint = (p: unknown): [number, number] | unknown => {
    if (Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number') {
      const { lat, lng } = lv95ToWgs84({ easting: p[0], northing: p[1] });
      return [lng, lat];
    }
    return p;
  };
  const asXy = (pt: unknown): [number, number] => {
    const c = cvtPoint(pt);
    if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
      return [c[0], c[1]];
    }
    return [Number.NaN, Number.NaN];
  };
  switch (g.type) {
    case 'LineString':
      return {
        type: 'LineString',
        coordinates: dedupConsecutive((g.coordinates as unknown[]).map(asXy)),
      };
    case 'MultiLineString':
      return {
        type: 'MultiLineString',
        coordinates: (g.coordinates as unknown[][]).map((line) => dedupConsecutive(line.map(asXy))),
      };
    case 'Point':
      return { type: 'Point', coordinates: cvtPoint(g.coordinates) };
    case 'Polygon':
      return {
        type: 'Polygon',
        coordinates: (g.coordinates as unknown[][]).map((ring) => ring.map(cvtPoint)),
      };
    default:
      return geom;
  }
}

export async function getNamedRouteHandler({
  routeId,
  includeGeometryWgs84,
}: {
  routeId: string | number;
  includeGeometryWgs84: boolean;
}): Promise<{ id: string | number; attributes?: Record<string, unknown>; geometry: unknown }> {
  const feat = await getFeature('ch.astra.wanderland', String(routeId));
  return {
    id: feat.featureId ?? feat.id ?? routeId,
    attributes: feat.attributes ?? feat.properties,
    geometry: includeGeometryWgs84 ? convertGeometryToWgs84(feat.geometry) : feat.geometry,
  };
}
