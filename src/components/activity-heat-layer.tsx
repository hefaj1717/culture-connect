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
        <Fragment key={point.id}>
          <Circle
            center={point.coordinate}
            fillColor={`rgba(166, 52, 70, ${roundOpacity(point.weight * 0.035)})`}
            radius={480}
            strokeWidth={0}
          />
          <Circle
            center={point.coordinate}
            fillColor={`rgba(216, 86, 87, ${roundOpacity(point.weight * 0.055)})`}
            radius={300}
            strokeWidth={0}
          />
          <Circle
            center={point.coordinate}
            fillColor={`rgba(235, 126, 110, ${roundOpacity(point.weight * 0.09)})`}
            radius={155}
            strokeWidth={0}
          />
        </Fragment>
      ))}
    </>
  );
}

function roundOpacity(value: number) {
  return Math.max(0, Math.min(0.18, Number(value.toFixed(3))));
}
