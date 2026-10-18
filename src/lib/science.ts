/**
 * Approximate solar geometry for a non-leap year, evaluated at solar noon.
 * Declination follows NOAA's fractional-year approximation:
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 *
 * Day length uses the Sun's centre at a level 0° geometric horizon. It excludes
 * refraction, solar-disc radius, terrain, weather and observer elevation; it is
 * not an observed sunrise/sunset time, radiation estimate or temperature model.
 */
export type SolarPosition = {
  /** Solar declination, in degrees; north is positive. */
  declination: number;
  /** Altitude at solar noon, in degrees; negative means below the horizon. */
  noonAltitude: number;
  /** Geometric daylight duration, in hours, bounded to [0, 24]. */
  dayLength: number;
};

const RADIANS = Math.PI / 180;
const SEASON_DAYS = [80, 172, 266, 355] as const;

function requireFiniteRange(value: number, min: number, max: number, name: string): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a finite number in [${min}, ${max}].`);
  }
}

/**
 * 0 = northern spring equinox, 1 = summer solstice,
 * 2 = autumn equinox, 3 = winter solstice.
 * Dates are representative non-leap-year day numbers, not annual ephemerides.
 */
export function dayForSeason(season: number): number {
  requireFiniteRange(season, 0, 3, 'season');
  if (!Number.isInteger(season)) {
    throw new RangeError('season must be an integer from 0 to 3.');
  }
  return SEASON_DAYS[season];
}

/** Latitude is degrees north in [-90, 90]; dayOfYear is in [1, 365]. */
export function solarAtLatitude(latitude: number, dayOfYear: number): SolarPosition {
  requireFiniteRange(latitude, -90, 90, 'latitude');
  requireFiniteRange(dayOfYear, 1, 365, 'dayOfYear');

  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
  const declinationRadians = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
  const declination = declinationRadians / RADIANS;
  const latitudeRadians = latitude * RADIANS;
  const altitudeOffset = Math.sin(latitudeRadians) * Math.sin(declinationRadians);
  const altitudeAmplitude = Math.cos(latitudeRadians) * Math.cos(declinationRadians);

  let dayLength: number;
  // Use daily extreme altitudes before division so the poles stay finite.
  if (altitudeOffset + altitudeAmplitude <= 0) {
    dayLength = 0;
  } else if (altitudeOffset - altitudeAmplitude >= 0) {
    dayLength = 24;
  } else {
    const cosineHourAngle = Math.max(-1, Math.min(1, -altitudeOffset / altitudeAmplitude));
    dayLength = (24 / Math.PI) * Math.acos(cosineHourAngle);
  }

  return {
    declination,
    noonAltitude: 90 - Math.abs(latitude - declination),
    dayLength,
  };
}
