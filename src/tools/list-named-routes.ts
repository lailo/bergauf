import { z } from 'zod';
import { CH_ENVELOPE_LV95, identify } from '@/clients/geoadmin.ts';
import { wgs84ToLv95 } from '@/utils/lv95.ts';

export const listNamedRoutesInput = {
  bbox: z
    .object({
      minLat: z.number(),
      minLon: z.number(),
      maxLat: z.number(),
      maxLon: z.number(),
    })
    .optional()
    .describe(
      'Optional WGS84 bounding box to filter routes. If omitted, queries the whole of Switzerland.',
    ),
  limit: z.number().int().min(1).max(200).default(50).describe('Max routes to return.'),
};

const RouteSummary = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  routeNumber: z.union([z.string(), z.number()]).optional(),
  category: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
});

export const listNamedRoutesOutput = {
  routes: z.array(RouteSummary),
  note: z.string().optional(),
};

// SwitzerlandMobility route number conventions (chmobil_route_number):
//   1-9   = national routes
//   10-99 = regional routes
//   100+  = local routes
function categoryFromRouteNumber(n: number | undefined): string | undefined {
  if (n === undefined) return undefined;
  if (n >= 1 && n <= 9) return 'national';
  if (n >= 10 && n <= 99) return 'regional';
  if (n >= 100) return 'local';
  return undefined;
}

function deriveName(attrs: Record<string, unknown> | undefined): string | undefined {
  if (!attrs) return undefined;
  const candidates = ['chmobil_title', 'label', 'name'];
  for (const k of candidates) {
    const v = attrs[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function deriveRouteNumber(attrs: Record<string, unknown> | undefined): number | undefined {
  if (!attrs) return undefined;
  const v = attrs.chmobil_route_number;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  return undefined;
}

export async function listNamedRoutesHandler({
  bbox,
  limit,
}: {
  bbox?: { minLat: number; minLon: number; maxLat: number; maxLon: number };
  limit: number;
}): Promise<{ routes: z.infer<typeof RouteSummary>[]; note?: string }> {
  let geometry = CH_ENVELOPE_LV95;
  if (bbox) {
    const sw = wgs84ToLv95({ lat: bbox.minLat, lng: bbox.minLon });
    const ne = wgs84ToLv95({ lat: bbox.maxLat, lng: bbox.maxLon });
    geometry = `${Math.min(sw.easting, ne.easting)},${Math.min(sw.northing, ne.northing)},${Math.max(sw.easting, ne.easting)},${Math.max(sw.northing, ne.northing)}`;
  }

  const features = await identify({
    layer: 'ch.astra.wanderland',
    geometry,
    geometryType: 'esriGeometryEnvelope',
    tolerance: 0,
    returnGeometry: false,
    limit,
  });

  const routes = features.map((f) => {
    const a = f.attributes ?? f.properties;
    const routeNumber = deriveRouteNumber(a);
    return {
      id: f.featureId ?? f.id,
      name: deriveName(a),
      routeNumber,
      category: categoryFromRouteNumber(routeNumber),
      attributes: a,
    };
  });

  return {
    routes,
    note:
      features.length === limit
        ? `Returned the first ${limit} routes; narrow the bbox to see more.`
        : undefined,
  };
}
