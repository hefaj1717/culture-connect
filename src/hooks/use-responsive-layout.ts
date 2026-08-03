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
      heroHeight: Math.min(
        isTablet ? 600 : isLargePhone ? 548 : 520,
        Math.max(isSmallPhone ? 440 : 500, height * (isSmallPhone ? 0.6 : 0.62)),
      ),
      horizontalPadding,
      isLargePhone,
      isSmallPhone,
      isTablet,
      profileNameSize: isSmallPhone ? 28 : isLargePhone ? 36 : 32,
      profileNameLineHeight: isSmallPhone ? 31 : isLargePhone ? 39 : 35,
      stateCardWidth: Math.min(isSmallPhone ? 236 : 260, Math.max(220, usableWidth * 0.74)),
      tabHeight: isSmallPhone ? 78 : 84,
      tabLabelSize: isSmallPhone ? 12 : 13,
      tabMinWidth: Math.max(58, Math.min(72, usableWidth / 4)),
      usableWidth,
    };
  }, [height, width]);
}
