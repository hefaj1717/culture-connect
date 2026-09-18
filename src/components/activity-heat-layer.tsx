import { Fragment } from 'react';
import { Platform } from 'react-native';
import { Circle, Heatmap } from 'react-native-maps';

export type ActivityHeatPoint = {
  coordinate: { latitude: number; longitude: number };
  id: string;
  weight: number;
};

const HEAT_GRADIENT = {
  colorMapSize: 256,
  colors: ['#00FFF8F0', '#24F8B9A8', '#4AEF8576', '#78D85657', '#A3A63446'],
  startPoints: [0, 0.22, 0.48, 0.72, 1],
};

/**
 * Forecast activity overlay. Android gets the native Google heatmap; the iOS
 * fallback layers translucent circles so Apple Maps keeps the same restrained glow.
 */
export function ActivityHeatLayer({ points }: { points: ActivityHeatPoint[] }) {
  if (points.length === 0) return null;

  if (Platform.OS === 'android') {
    return (
      <Heatmap
        gradient={HEAT_GRADIENT}
        opacity={0.42}
        points={points.map(({ coordinate, weight }) => ({ ...coordinate, weight }))}
        radius={44}
      />
    );
  }

  return (
    <>
      {points.map((point) => (
        <ActivityHeatGlow key={point.id} point={point} />
      ))}
    </>
  );
}

function ActivityHeatGlow({ point }: { point: ActivityHeatPoint }) {
  const visualWeight = Math.min(1, 0.15 + 0.85 * Math.pow(point.weight, 0.6));

  return (
    <Fragment>
      <Circle
        center={point.coordinate}
        fillColor={`rgba(166, 52, 70, ${roundOpacity(visualWeight * 0.07)})`}
        radius={480}
        strokeColor="transparent"
        strokeWidth={0}
      />
      <Circle
        center={point.coordinate}
        fillColor={`rgba(216, 86, 87, ${roundOpacity(visualWeight * 0.1)})`}
        radius={300}
        strokeColor="transparent"
        strokeWidth={0}
      />
      <Circle
        center={point.coordinate}
        fillColor={`rgba(235, 126, 110, ${roundOpacity(visualWeight * 0.16)})`}
        radius={155}
        strokeColor="transparent"
        strokeWidth={0}
      />
    </Fragment>
  );
}

function roundOpacity(value: number) {
  return Math.max(0, Math.min(0.2, Number(value.toFixed(3))));
}
