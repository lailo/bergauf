// Swisstopo approximation formulas, accurate to ~1m across Switzerland.
// Reference: https://www.swisstopo.admin.ch/en/transformation-calculation-services
//
// LV95 is the EPSG:2056 projected grid used by all geo.admin.ch APIs.
// Easting around 2'600'000, Northing around 1'200'000.

export interface Lv95 {
  easting: number; // E, meters
  northing: number; // N, meters
}

export interface Wgs84 {
  lat: number; // degrees, north positive
  lng: number; // degrees, east positive
}

export function lv95ToWgs84({ easting, northing }: Lv95): Wgs84 {
  const yp = (easting - 2_600_000) / 1_000_000;
  const xp = (northing - 1_200_000) / 1_000_000;

  // Result is in units of [10000 sexagesimal seconds]; multiply by 100/36 to get degrees.
  const lng10000s =
    2.6779094 + 4.728982 * yp + 0.791484 * yp * xp + 0.1306 * yp * xp * xp - 0.0436 * yp * yp * yp;

  const lat10000s =
    16.9023892 +
    3.238272 * xp -
    0.270978 * yp * yp -
    0.002528 * xp * xp -
    0.0447 * yp * yp * xp -
    0.014 * xp * xp * xp;

  return {
    lng: (lng10000s * 100) / 36,
    lat: (lat10000s * 100) / 36,
  };
}

export function wgs84ToLv95({ lat, lng }: Wgs84): Lv95 {
  // Normalized auxiliary coordinates: (arcseconds offset from Bern) / 10000.
  const phip = (lat * 3600 - 169_028.66) / 10_000;
  const lamp = (lng * 3600 - 26_782.5) / 10_000;

  const easting =
    2_600_072.37 +
    211_455.93 * lamp -
    10_938.51 * lamp * phip -
    0.36 * lamp * phip * phip -
    44.54 * lamp * lamp * lamp;

  const northing =
    1_200_147.07 +
    308_807.95 * phip +
    3_745.25 * lamp * lamp +
    76.63 * phip * phip -
    194.56 * lamp * lamp * phip +
    119.79 * phip * phip * phip;

  return { easting, northing };
}

// Format a WGS84 LineString to a GeoJSON string in LV95 coordinates,
// as expected by geo.admin.ch endpoints (geometry param).
export function lineStringWgs84ToLv95Geojson(points: Wgs84[]): string {
  const coords = points.map((p) => {
    const { easting, northing } = wgs84ToLv95(p);
    return [easting, northing];
  });
  return JSON.stringify({ type: 'LineString', coordinates: coords });
}
