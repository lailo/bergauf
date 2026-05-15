// Thin client over api3.geo.admin.ch.
//
// Fair use: 20 req/min on 24/7 average. No auth. LV95 (EPSG:2056) for geometries.
// Docs: https://api3.geo.admin.ch/services/sdiservices.html

import { z } from 'zod';
import { buildQuery, type FetchLike, fetchJson } from '@/utils/http.ts';

const BASE = 'https://api3.geo.admin.ch/rest/services';
const USER_AGENT = 'bergauf/0.1 (Switzerland hiking MCP server)';

// ----- Search -----

const SearchLocationAttrs = z
  .object({
    label: z.string(),
    detail: z.string().optional(),
    origin: z.string().optional(),
    // y is easting, x is northing in swisstopo's terminology (yes, surprising).
    y: z.number().optional(),
    x: z.number().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    geom_st_box2d: z.string().optional(),
    rank: z.number().optional(),
  })
  .passthrough();

const SearchResponse = z.object({
  results: z.array(
    z.object({
      id: z.union([z.number(), z.string()]).optional(),
      weight: z.number().optional(),
      attrs: SearchLocationAttrs,
    }),
  ),
});

export type SearchResult = z.infer<typeof SearchResponse>['results'][number];

export async function searchLocations(
  searchText: string,
  opts: { limit?: number; fetchImpl?: FetchLike } = {},
): Promise<SearchResult[]> {
  const url = `${BASE}/api/SearchServer${buildQuery({
    type: 'locations',
    searchText,
    sr: 2056,
    limit: opts.limit ?? 10,
  })}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT },
    fetchImpl: opts.fetchImpl,
  });
  return SearchResponse.parse(data).results;
}

// ----- Identify (Wanderland layer queries) -----

// Lenient: attribute schemas vary by layer and are not fully documented.
const IdentifyFeature = z
  .object({
    layerBodId: z.string(),
    layerName: z.string().optional(),
    featureId: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    attributes: z.record(z.unknown()).optional(),
    properties: z.record(z.unknown()).optional(),
    // GeoJSON geometry — kept as unknown; the consumer decides how to use it.
    geometry: z.unknown().optional(),
    bbox: z.array(z.number()).optional(),
  })
  .passthrough();

const IdentifyResponse = z.object({
  results: z.array(IdentifyFeature),
});

export type IdentifyFeature = z.infer<typeof IdentifyFeature>;

export interface IdentifyOptions {
  layer: string; // e.g. 'ch.astra.wanderland'
  geometry: string; // depends on geometryType: 'x,y' for point, 'xmin,ymin,xmax,ymax' for envelope
  geometryType:
    | 'esriGeometryPoint'
    | 'esriGeometryEnvelope'
    | 'esriGeometryPolyline'
    | 'esriGeometryPolygon';
  tolerance?: number; // pixels; default 5
  // The identify endpoint formally wants a map extent + image display so it can
  // turn `tolerance` (pixels) into a real-world buffer. We default to a whole-CH
  // extent at 1000x1000 which gives a generous buffer; callers can override.
  mapExtent?: string; // 'xmin,ymin,xmax,ymax' in LV95
  imageDisplay?: string; // 'width,height,dpi' e.g. '1000,1000,96'
  returnGeometry?: boolean;
  geometryFormat?: 'esrijson' | 'geojson';
  limit?: number;
  fetchImpl?: FetchLike;
}

// LV95 envelope covering Switzerland + a bit of buffer.
export const CH_ENVELOPE_LV95 = '2480000,1070000,2840000,1300000';

export async function identify(opts: IdentifyOptions): Promise<IdentifyFeature[]> {
  const url = `${BASE}/api/MapServer/identify${buildQuery({
    layers: `all:${opts.layer}`,
    geometry: opts.geometry,
    geometryType: opts.geometryType,
    sr: 2056,
    tolerance: opts.tolerance ?? 5,
    mapExtent: opts.mapExtent ?? CH_ENVELOPE_LV95,
    imageDisplay: opts.imageDisplay ?? '1000,1000,96',
    returnGeometry: opts.returnGeometry ?? true,
    geometryFormat: opts.geometryFormat ?? 'geojson',
    limit: opts.limit ?? 50,
    lang: 'en',
  })}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT },
    fetchImpl: opts.fetchImpl,
  });
  return IdentifyResponse.parse(data).results;
}

// ----- Feature by id -----

const FeatureResponse = z.object({
  feature: IdentifyFeature,
});

export async function getFeature(
  layer: string,
  featureId: string | number,
  opts: { fetchImpl?: FetchLike } = {},
): Promise<IdentifyFeature> {
  const url = `${BASE}/api/MapServer/${encodeURIComponent(layer)}/${encodeURIComponent(
    String(featureId),
  )}${buildQuery({
    sr: 2056,
    geometryFormat: 'geojson',
    returnGeometry: true,
    lang: 'en',
  })}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT },
    fetchImpl: opts.fetchImpl,
  });
  return FeatureResponse.parse(data).feature;
}

// ----- Elevation profile -----

const ProfilePoint = z
  .object({
    dist: z.number(),
    alts: z.record(z.number()),
    easting: z.number(),
    northing: z.number(),
  })
  .passthrough();

const ProfileResponse = z.array(ProfilePoint);

export type ProfilePoint = z.infer<typeof ProfilePoint>;

export async function elevationProfile(
  geomLineStringLv95: string, // JSON string of GeoJSON LineString in LV95 coords
  opts: { nbPoints?: number; fetchImpl?: FetchLike } = {},
): Promise<ProfilePoint[]> {
  const url = `${BASE}/profile.json${buildQuery({
    geom: geomLineStringLv95,
    sr: 2056,
    nb_points: opts.nbPoints ?? 200,
  })}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT },
    fetchImpl: opts.fetchImpl,
  });
  return ProfileResponse.parse(data);
}

// ----- Point elevation -----

const HeightResponse = z.object({
  height: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  easting: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .optional(),
  northing: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .optional(),
});

export async function pointElevation(
  easting: number,
  northing: number,
  opts: { fetchImpl?: FetchLike } = {},
): Promise<number> {
  const url = `${BASE}/height${buildQuery({ easting, northing })}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT },
    fetchImpl: opts.fetchImpl,
  });
  return HeightResponse.parse(data).height;
}
