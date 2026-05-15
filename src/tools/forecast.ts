import { z } from 'zod';
import { getForecast } from '@/clients/meteo.ts';
import { describeWeather } from '@/utils/weather-codes.ts';

export const forecastInput = {
  lat: z.number().describe('Latitude (WGS84) of the point of interest, e.g. trailhead.'),
  lon: z.number().describe('Longitude (WGS84) of the point of interest.'),
  days: z.number().int().min(1).max(10).default(3).describe('Forecast horizon in days.'),
};

const HourlyOut = z.object({
  time: z.string(),
  temperatureC: z.number().nullable(),
  precipitationMm: z.number().nullable(),
  precipitationProbability: z.number().nullable(),
  windKmh: z.number().nullable(),
  condition: z.string().nullable(),
});

const DailyOut = z.object({
  date: z.string(),
  condition: z.string().nullable(),
  tempMinC: z.number().nullable(),
  tempMaxC: z.number().nullable(),
  precipitationSumMm: z.number().nullable(),
});

export const forecastOutput = {
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  timezone: z.string().optional(),
  hourly: z.array(HourlyOut),
  daily: z.array(DailyOut),
  attribution: z.string(),
};

const labelOrNull = (v: number | null | undefined): string | null =>
  v == null ? null : describeWeather(v).label;

export async function forecastHandler({
  lat,
  lon,
  days,
}: {
  lat: number;
  lon: number;
  days: number;
}) {
  const f = await getForecast({ lat, lon, forecastDays: days });

  const hourly = (f.hourly?.time ?? []).map((t, i) => ({
    time: t,
    temperatureC: f.hourly?.temperature_2m?.[i] ?? null,
    precipitationMm: f.hourly?.precipitation?.[i] ?? null,
    precipitationProbability: f.hourly?.precipitation_probability?.[i] ?? null,
    windKmh: f.hourly?.wind_speed_10m?.[i] ?? null,
    condition: labelOrNull(f.hourly?.weather_code?.[i]),
  }));

  const daily = (f.daily?.time ?? []).map((d, i) => ({
    date: d,
    condition: labelOrNull(f.daily?.weather_code?.[i]),
    tempMinC: f.daily?.temperature_2m_min?.[i] ?? null,
    tempMaxC: f.daily?.temperature_2m_max?.[i] ?? null,
    precipitationSumMm: f.daily?.precipitation_sum?.[i] ?? null,
  }));

  return {
    latitude: f.latitude,
    longitude: f.longitude,
    elevation: f.elevation,
    timezone: f.timezone,
    hourly,
    daily,
    attribution: 'Weather data: Open-Meteo (CC BY 4.0), model: MeteoSwiss ICON seamless',
  };
}
