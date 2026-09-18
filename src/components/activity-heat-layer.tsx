import { useMemo } from 'react';
import { Polygon, type Region } from 'react-native-maps';

export type ActivityHeatPoint = {
  coordinate: { latitude: number; longitude: number };
  id: string;
  weight: number;
};

type ActivityHeatLayerProps = {
  points: ActivityHeatPoint[];
  region: Region;
};

type Coordinate = ActivityHeatPoint['coordinate'];

const METERS_PER_LATITUDE_DEGREE = 111_320;
const MIN_CELL_SCORE = 0.08;

/**
 * A small, regular grid makes the forecast legible at card-map scale. Each
 * cell samples nearby event forecasts rather than showing an imprecise pin
 * halo, so the map keeps its roads while still making busy areas obvious.
 */
export function ActivityHeatLayer({ points, region }: ActivityHeatLayerProps) {
  const cells = useMemo(() => getActivityCells(points, region), [points, region]);

  return (
    <>
      {cells.map((cell) => (
        <Polygon
          key={cell.id}
          coordinates={cell.coordinates}
          fillColor={getCellFillColor(cell.score)}
          strokeColor="rgba(255, 248, 240, 0.16)"
          strokeWidth={1}
        />
      ))}
    </>
  );
}

function getActivityCells(points: ActivityHeatPoint[], region: Region) {
  if (points.length === 0) return [];

  // A 360 m radius (720 m point-to-point) gives central-city events enough
  // local detail while still being legible in the compact home-screen map.
  const radiusMeters = Math.max(320, Math.min(420, region.latitudeDelta * 4_800));
  const latitudeStep = (radiusMeters * 1.5) / METERS_PER_LATITUDE_DEGREE;
  const longitudeStep =
    (Math.sqrt(3) * radiusMeters) /
    (METERS_PER_LATITUDE_DEGREE * Math.cos((region.latitude * Math.PI) / 180));
  const minLatitude = region.latitude - region.latitudeDelta / 2 - latitudeStep;
  const maxLatitude = region.latitude + region.latitudeDelta / 2 + latitudeStep;
  const minLongitude = region.longitude - region.longitudeDelta / 2 - longitudeStep;
  const maxLongitude = region.longitude + region.longitudeDelta / 2 + longitudeStep;
  const cells: { id: string; coordinates: Coordinate[]; score: number }[] = [];
  let row = 0;

  for (let latitude = minLatitude; latitude <= maxLatitude; latitude += latitudeStep) {
    const longitudeOffset = row % 2 === 0 ? 0 : longitudeStep / 2;
    let column = 0;

    for (
      let longitude = minLongitude + longitudeOffset;
      longitude <= maxLongitude + longitudeStep;
      longitude += longitudeStep
    ) {
      const center = { latitude, longitude };
      const score = getCellScore(center, points, radiusMeters);

      if (score >= MIN_CELL_SCORE) {
        cells.push({
          id: `${row}-${column}`,
          coordinates: getHexagonCoordinates(center, radiusMeters),
          score,
        });
      }
      column += 1;
    }
    row += 1;
  }

  return cells;
}

function getCellScore(center: Coordinate, points: ActivityHeatPoint[], radiusMeters: number) {
  const influenceRadius = radiusMeters * 1.65;
  const combinedScore = points.reduce((total, point) => {
    const distance = distanceInMeters(center, point.coordinate);
    if (distance >= influenceRadius) return total;

    // Smooth falloff prevents a hard boundary while sectors preserve the map.
    const proximity = Math.pow(1 - distance / influenceRadius, 1.35);
    return total + point.weight * proximity;
  }, 0);

  return Math.min(1, combinedScore);
}

function getHexagonCoordinates(center: Coordinate, radiusMeters: number) {
  const latitudeRadius = radiusMeters / METERS_PER_LATITUDE_DEGREE;
  const longitudeRadius =
    radiusMeters /
    (METERS_PER_LATITUDE_DEGREE * Math.cos((center.latitude * Math.PI) / 180));

  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    return {
      latitude: center.latitude + latitudeRadius * Math.sin(angle),
      longitude: center.longitude + longitudeRadius * Math.cos(angle),
    };
  });
}

function getCellFillColor(score: number) {
  // The lower range is deliberately visible: in a new city, a small group
  // choosing the same near-term event is meaningful activity.
  const intensity = Math.min(1, 0.22 + 0.78 * Math.pow(score, 0.62));
  const color = interpolateColor('#F7C5B8', '#A63446', intensity);
  const opacity = 0.12 + 0.33 * intensity;
  return `${color}${toHex(opacity * 255)}`;
}

function interpolateColor(from: string, to: string, progress: number) {
  const fromChannels = hexToChannels(from);
  const toChannels = hexToChannels(to);
  const channel = (index: number) =>
    Math.round(fromChannels[index] + (toChannels[index] - fromChannels[index]) * progress);

  return `#${toHex(channel(0))}${toHex(channel(1))}${toHex(channel(2))}`;
}

function hexToChannels(hex: string) {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

function toHex(value: number) {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
}

function distanceInMeters(first: Coordinate, second: Coordinate) {
  const latitudeRadians = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeRadians = ((second.longitude - first.longitude) * Math.PI) / 180;
  const firstLatitude = (first.latitude * Math.PI) / 180;
  const secondLatitude = (second.latitude * Math.PI) / 180;
  const a =
    Math.sin(latitudeRadians / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeRadians / 2) ** 2;

  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
