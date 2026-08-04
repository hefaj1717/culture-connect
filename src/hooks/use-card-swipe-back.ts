import { useCallback, useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type UseCardSwipeBackOptions = {
  enabled?: boolean;
  onSwipeBack: () => void;
  resetKey?: string | number | boolean | null;
  visible: boolean;
};

export function useCardSwipeBack({
  enabled = true,
  onSwipeBack,
  resetKey,
  visible,
}: UseCardSwipeBackOptions) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = 0;
    }
  }, [resetKey, translateX, visible]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX([-999, 18])
        .failOffsetY([-35, 35])
        .onUpdate((event) => {
          translateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldClose = translateX.value > width * 0.28 || event.velocityX > 700;

          if (shouldClose) {
            translateX.value = withTiming(width, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(onSwipeBack)();
              }
            });
            return;
          }

          translateX.value = withTiming(0, { duration: 180 });
        }),
    [enabled, onSwipeBack, translateX, width],
  );

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const closeWithAnimation = useCallback(() => {
    translateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onSwipeBack)();
      }
    });
  }, [onSwipeBack, translateX, width]);

  return { closeWithAnimation, gesture, swipeStyle };
}
