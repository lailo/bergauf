// SAC/DAV walking time approximation.
//
//   horiz = distance_km / 4.0          (4 km/h on flat)
//   asc   = ascent_m / 400.0           (400 m/h up)
//   desc  = descent_m / 800.0          (800 m/h down)
//   vert  = asc + desc
//   total = max(horiz, vert) + 0.5 * min(horiz, vert)
//
// Rounded up to the nearest 15 minutes.

export interface HikeTimeInput {
  distanceKm: number;
  ascentM: number;
  descentM: number;
}

export interface HikeTimeEstimate {
  totalMinutes: number;
  horizontalHours: number;
  verticalHours: number;
}

export function estimateHikeTime({
  distanceKm,
  ascentM,
  descentM,
}: HikeTimeInput): HikeTimeEstimate {
  const horiz = distanceKm / 4.0;
  const vert = Math.max(ascentM, 0) / 400.0 + Math.max(descentM, 0) / 800.0;
  const totalHours = Math.max(horiz, vert) + 0.5 * Math.min(horiz, vert);
  const totalMinutesRaw = totalHours * 60;
  const totalMinutes = Math.ceil(totalMinutesRaw / 15) * 15;
  return { totalMinutes, horizontalHours: horiz, verticalHours: vert };
}

export function formatHikeTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}
