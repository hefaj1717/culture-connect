import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { height, width } = useWindowDimensions();

  return useMemo(() => {
    const shortestSide = Math.min(width, height);
    const isSmallPhone = shortestSide < 375;
    const isLargePhone = shortestSide >= 430;
    const isTablet = shortestSide >= 768;
    const horizontalPadding = isSmallPhone ? 16 : 20;
    const contentWidth = Math.min(width, 800);
    const usableWidth = Math.max(0, contentWidth - horizontalPadding * 2);

    return {
      cardWidth: Math.min(isSmallPhone ? 204 : 220, Math.max(188, usableWidth * 0.64)),
      contentWidth,
      eventImageHeight: isSmallPhone ? 102 : isLargePhone ? 122 : 112,
      // Tall enough for the photo to set the mood, short enough that the first section peeks in.
      heroHeight: Math.min(
        isTablet ? 520 : isLargePhone ? 460 : 440,
        Math.max(isSmallPhone ? 380 : 400, height * 0.5),
      ),
      horizontalPadding,
      isLargePhone,
      isSmallPhone,
      isTablet,
      profileNameSize: isSmallPhone ? 28 : isLargePhone ? 36 : 32,
      profileNameLineHeight: isSmallPhone ? 31 : isLargePhone ? 39 : 35,
      stateCardWidth: Math.min(isSmallPhone ? 236 : 260, Math.max(220, usableWidth * 0.74)),
      tabHeight: isSmallPhone ? 78 : 84,
      tabLabelSize: isSmallPhone ? 11 : 12,
      tabMinWidth: Math.max(58, Math.min(72, usableWidth / 4)),
      usableWidth,
    };
  }, [height, width]);
}
