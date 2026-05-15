// Open-Meteo forecast client.
//
// Free for non-commercial use, CC BY 4.0 attribution. No API key.
// We pull the MeteoSwiss ICON seamless model for best Swiss coverage.
// Docs: https://open-meteo.com/en/docs

import { z } from 'zod';
import { buildQuery, type FetchLike, fetchJson } from '@/utils/http.ts';

const BASE = 'https://api.open-meteo.com/v1/forecast';
const USER_AGENT = 'bergauf/0.1 (Switzerland hiking MCP server)';

const HourlyArray = z.array(z.number().nullable());
const HourlyTimeArray = z.array(z.string());

const ForecastResponse = z.object({
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  timezone: z.string().optional(),
  hourly: z
    .object({
      time: HourlyTimeArray,
      temperature_2m: HourlyArray.optional(),
      precipitation_probability: HourlyArray.optional(),
      precipitation: HourlyArray.optional(),
      wind_speed_10m: HourlyArray.optional(),
      weather_code: HourlyArray.optional(),
    })
    .optional(),
  daily: z
    .object({
      time: z.array(z.string()),
      weather_code: HourlyArray.optional(),
      temperature_2m_max: HourlyArray.optional(),
      temperature_2m_min: HourlyArray.optional(),
      precipitation_sum: HourlyArray.optional(),
    })
    .optional(),
});

export type Forecast = z.infer<typeof ForecastResponse>;

export interface ForecastOptions {
  lat: number;
  lon: number;
  forecastDays?: number; // 1..16
  fetchImpl?: FetchLike;
}

export async function getForecast({
  lat,
  lon,
  forecastDays = 7,
  fetchImpl,
}: ForecastOptions): Promise<Forecast> {
  const url = `${BASE}${buildQuery({
    latitude: lat,
    longitude: lon,
    hourly: 'temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'Europe/Zurich',
    forecast_days: forecastDays,
    models: 'icon_seamless',
  })}`;
  const data = await fetchJson(url, {
    headers: { 'User-Agent': USER_AGENT },
    fetchImpl,
  });
  return ForecastResponse.parse(data);
}
