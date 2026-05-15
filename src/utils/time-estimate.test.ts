import { describe, expect, test } from 'bun:test';
import { estimateHikeTime, formatHikeTime } from '@/utils/time-estimate.ts';

describe('SAC/DAV time estimate', () => {
  test('flat 4km equals roughly 1 hour', () => {
    const { totalMinutes } = estimateHikeTime({ distanceKm: 4, ascentM: 0, descentM: 0 });
    expect(totalMinutes).toBe(60);
  });

  test('pure 400m climb equals roughly 1 hour', () => {
    const { totalMinutes } = estimateHikeTime({ distanceKm: 0, ascentM: 400, descentM: 0 });
    expect(totalMinutes).toBe(60);
  });

  test('pure 800m descent equals roughly 1 hour', () => {
    const { totalMinutes } = estimateHikeTime({ distanceKm: 0, ascentM: 0, descentM: 800 });
    expect(totalMinutes).toBe(60);
  });

  test('SAC combination rule: max + 0.5*min, rounded up to 15min', () => {
    // 8 km flat = 2h horizontal, 400 m up = 1h vertical → 2 + 0.5*1 = 2.5h = 150 min
    const { totalMinutes } = estimateHikeTime({ distanceKm: 8, ascentM: 400, descentM: 0 });
    expect(totalMinutes).toBe(150);
  });

  test('always rounds up to the nearest 15 minutes', () => {
    // 1.1h = 66 min should round up to 75.
    const { totalMinutes } = estimateHikeTime({ distanceKm: 4.4, ascentM: 0, descentM: 0 });
    expect(totalMinutes).toBe(75);
  });

  test('formatHikeTime renders friendly strings', () => {
    expect(formatHikeTime(0)).toBe('0min');
    expect(formatHikeTime(45)).toBe('45min');
    expect(formatHikeTime(60)).toBe('1h');
    expect(formatHikeTime(75)).toBe('1h15');
    expect(formatHikeTime(225)).toBe('3h45');
  });
});
