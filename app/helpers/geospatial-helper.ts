import { IGeoInformation, SunState } from '../contracts/entities';

export function toRadians(num: number): number {
  return num * (Math.PI / 180);
}

export function toDegrees(num: number): number {
  return num * (180 / Math.PI);
}

export function isInDirection(dirs: number[], bearing: number): boolean {
  if (dirs === undefined) {
    return true;
  }
  if (dirs.length === 0) {
    return true;
  } else {
    for (const dir of dirs) {
      if (bearing >= dir && bearing <= dir + 45) {
        return true;
      }
    }
    return false;
  }
}

export function getBearing(start: number[], end: number[]): number {
  const startLat = toRadians(start[1]);
  const startLong = toRadians(start[0]);
  const endLat = toRadians(end[1]);
  const endLong = toRadians(end[0]);

  let dLong = endLong - startLong;
  const dPhi = Math.log(
    Math.tan(endLat / 2.0 + Math.PI / 4.0) /
      Math.tan(startLat / 2.0 + Math.PI / 4.0),
  );
  if (Math.abs(dLong) > Math.PI) {
    if (dLong > 0.0) {
      dLong = -(2.0 * Math.PI - dLong);
    } else {
      dLong = 2.0 * Math.PI + dLong;
    }
  }

  return (toDegrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
}

export function getDistance(start: number[], end: number[]) {
  const radlat1 = toRadians(start[1]);
  const radlat2 = toRadians(end[1]);
  const radlon1 = toRadians(start[0]);
  const radlon2 = toRadians(end[0]);
  const theta = start[0] - end[0];
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  dist = dist * 1.609344;
  return dist;
}

export function getSunState(elevation: number, azimuth: number): SunState {
  if (azimuth > 0) {
    if (elevation > 0.5) {
      return SunState.Daytime;
    } else if (elevation <= 0.5 && elevation >= -0.5) {
      return SunState.Sunset;
    } else if (elevation < -0.5 && elevation >= -6) {
      return SunState.CivilTwilight;
    } else if (elevation < -6 && elevation >= -12) {
      return SunState.NauticalTwilight;
    } else if (elevation < -12 && elevation >= -18) {
      return SunState.AstronomicalTwilight;
    } else {
      return SunState.Night;
    }
  } else {
    if (elevation > 0.5) {
      return SunState.Daytime;
    } else if (elevation <= 0.5 && elevation >= -0.5) {
      return SunState.Sunrise;
    } else if (elevation < -0.5 && elevation >= -6) {
      return SunState.CivilTwilight;
    } else if (elevation < -6 && elevation >= -12) {
      return SunState.NauticalTwilight;
    } else if (elevation < -12 && elevation >= -18) {
      return SunState.AstronomicalTwilight;
    } else {
      return SunState.Night;
    }
  }
}

export function getDistanceAndBearing(
  start: number[],
  end: number[],
): IGeoInformation {
  return {
    bearing: getBearing(start, end),
    distance: getDistance(start, end),
  };
}
