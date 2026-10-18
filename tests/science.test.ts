import { describe, expect, it } from 'vitest';
import { dayForSeason, solarAtLatitude } from '../src/lib/science';

describe('solarAtLatitude', () => {
  it.each([1, 80, 172, 266, 355, 365])('gives 12 geometric daylight hours at the equator on day %s', (day) => {
    expect(solarAtLatitude(0, day).dayLength).toBeCloseTo(12, 10);
  });

  it('places solstice declinations near the tropics with the correct signs', () => {
    expect(solarAtLatitude(0, dayForSeason(1)).declination).toBeGreaterThan(23.3);
    expect(solarAtLatitude(0, dayForSeason(1)).declination).toBeLessThan(23.6);
    expect(solarAtLatitude(0, dayForSeason(3)).declination).toBeGreaterThan(-23.6);
    expect(solarAtLatitude(0, dayForSeason(3)).declination).toBeLessThan(-23.3);
  });

  it('gives northern 30° latitude a higher noon Sun and a longer day in summer', () => {
    const summer = solarAtLatitude(30, dayForSeason(1));
    const winter = solarAtLatitude(30, dayForSeason(3));
    expect(summer.noonAltitude).toBeGreaterThan(83);
    expect(summer.noonAltitude).toBeLessThan(84);
    expect(winter.noonAltitude).toBeGreaterThan(36);
    expect(winter.noonAltitude).toBeLessThan(37);
    expect(summer.dayLength).toBeGreaterThan(13.8);
    expect(summer.dayLength).toBeLessThan(14.1);
    expect(winter.dayLength).toBeGreaterThan(9.9);
    expect(winter.dayLength).toBeLessThan(10.2);
  });

  it('reverses the daylight seasons across the equator', () => {
    const north = solarAtLatitude(45, dayForSeason(1));
    const south = solarAtLatitude(-45, dayForSeason(1));
    expect(north.dayLength).toBeGreaterThan(12);
    expect(south.dayLength).toBeLessThan(12);
    expect(north.dayLength + south.dayLength).toBeCloseTo(24, 10);
  });

  it.each([80, 89.999, 90])('handles northern polar day and night at %s° without NaN', (latitude) => {
    const summer = solarAtLatitude(latitude, dayForSeason(1));
    const winter = solarAtLatitude(latitude, dayForSeason(3));
    expect(summer.dayLength).toBe(24);
    expect(winter.dayLength).toBe(0);
    expect(winter.noonAltitude).toBeLessThan(0);
    expect(Object.values(summer).every(Number.isFinite)).toBe(true);
    expect(Object.values(winter).every(Number.isFinite)).toBe(true);
  });

  it('handles southern polar day and night', () => {
    expect(solarAtLatitude(-90, dayForSeason(1)).dayLength).toBe(0);
    expect(solarAtLatitude(-90, dayForSeason(3)).dayLength).toBe(24);
  });

  it('stays finite and bounded throughout a year including both poles', () => {
    for (const latitude of [-90, -80, -30, 0, 30, 80, 90]) {
      for (let day = 1; day <= 365; day += 1) {
        const result = solarAtLatitude(latitude, day);
        expect(Object.values(result).every(Number.isFinite)).toBe(true);
        expect(result.dayLength).toBeGreaterThanOrEqual(0);
        expect(result.dayLength).toBeLessThanOrEqual(24);
        expect(result.noonAltitude).toBeGreaterThanOrEqual(-90);
        expect(result.noonAltitude).toBeLessThanOrEqual(90);
      }
    }
  });

  it.each([NaN, Infinity, -Infinity, -90.001, 90.001])('rejects invalid latitude %s', (latitude) => {
    expect(() => solarAtLatitude(latitude, 172)).toThrow(RangeError);
  });

  it.each([NaN, Infinity, -Infinity, 0, -1, 366])('rejects invalid day %s', (day) => {
    expect(() => solarAtLatitude(30, day)).toThrow(RangeError);
  });
});

describe('dayForSeason', () => {
  it('maps four northern seasons to representative non-leap-year days', () => {
    expect([0, 1, 2, 3].map(dayForSeason)).toEqual([80, 172, 266, 355]);
  });

  it.each([NaN, Infinity, -Infinity, -1, 4, 0.5])('rejects invalid season %s', (season) => {
    expect(() => dayForSeason(season)).toThrow(RangeError);
  });
});
