import { describe, expect, test } from 'bun:test';
import { describeWeather } from '@/utils/weather-codes.ts';

describe('describeWeather', () => {
  test('clear sky', () => {
    const c = describeWeather(0);
    expect(c.code).toBe(0);
    expect(c.label).toBe('clear');
    expect(c.severity).toBe('clear');
  });

  test('partly cloudy is mild', () => {
    expect(describeWeather(2).severity).toBe('mild');
  });

  test('rain spectrum severity scales with intensity', () => {
    expect(describeWeather(61).severity).toBe('wet'); // light rain
    expect(describeWeather(63).severity).toBe('wet'); // rain
    expect(describeWeather(65).severity).toBe('severe'); // heavy rain
  });

  test('thunderstorm variants are severe', () => {
    expect(describeWeather(95).severity).toBe('severe');
    expect(describeWeather(96).severity).toBe('severe');
    expect(describeWeather(99).severity).toBe('severe');
  });

  test('snow grades from wet to severe', () => {
    expect(describeWeather(71).severity).toBe('wet'); // light snow
    expect(describeWeather(73).severity).toBe('wet'); // snow
    expect(describeWeather(75).severity).toBe('severe'); // heavy snow
  });

  test('all known WMO codes return a non-empty label', () => {
    const known = [
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85,
      86, 95, 96, 99,
    ];
    for (const code of known) {
      const c = describeWeather(code);
      expect(c.code).toBe(code);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.label).not.toContain('unknown');
    }
  });

  test('unknown code falls back without throwing', () => {
    const c = describeWeather(404);
    expect(c.code).toBe(404);
    expect(c.label).toContain('unknown');
    expect(c.label).toContain('404');
    expect(c.severity).toBe('mild');
  });
});
