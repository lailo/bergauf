// WMO weather codes used by Open-Meteo, mapped to short English labels.
// Reference: https://open-meteo.com/en/docs (Weather variable documentation).

export interface WeatherCondition {
  code: number;
  label: string; // short, human-friendly English
  severity: 'clear' | 'mild' | 'wet' | 'severe';
}

const TABLE: Record<number, WeatherCondition> = {
  0: { code: 0, label: 'clear', severity: 'clear' },
  1: { code: 1, label: 'mainly clear', severity: 'clear' },
  2: { code: 2, label: 'partly cloudy', severity: 'mild' },
  3: { code: 3, label: 'overcast', severity: 'mild' },
  45: { code: 45, label: 'fog', severity: 'mild' },
  48: { code: 48, label: 'freezing fog', severity: 'mild' },
  51: { code: 51, label: 'light drizzle', severity: 'wet' },
  53: { code: 53, label: 'drizzle', severity: 'wet' },
  55: { code: 55, label: 'dense drizzle', severity: 'wet' },
  56: { code: 56, label: 'freezing drizzle', severity: 'wet' },
  57: { code: 57, label: 'dense freezing drizzle', severity: 'wet' },
  61: { code: 61, label: 'light rain', severity: 'wet' },
  63: { code: 63, label: 'rain', severity: 'wet' },
  65: { code: 65, label: 'heavy rain', severity: 'severe' },
  66: { code: 66, label: 'freezing rain', severity: 'severe' },
  67: { code: 67, label: 'heavy freezing rain', severity: 'severe' },
  71: { code: 71, label: 'light snow', severity: 'wet' },
  73: { code: 73, label: 'snow', severity: 'wet' },
  75: { code: 75, label: 'heavy snow', severity: 'severe' },
  77: { code: 77, label: 'snow grains', severity: 'wet' },
  80: { code: 80, label: 'light rain showers', severity: 'wet' },
  81: { code: 81, label: 'rain showers', severity: 'wet' },
  82: { code: 82, label: 'violent rain showers', severity: 'severe' },
  85: { code: 85, label: 'snow showers', severity: 'wet' },
  86: { code: 86, label: 'heavy snow showers', severity: 'severe' },
  95: { code: 95, label: 'thunderstorm', severity: 'severe' },
  96: { code: 96, label: 'thunderstorm with light hail', severity: 'severe' },
  99: { code: 99, label: 'thunderstorm with hail', severity: 'severe' },
};

export function describeWeather(code: number): WeatherCondition {
  return TABLE[code] ?? { code, label: `unknown (WMO ${code})`, severity: 'mild' };
}
