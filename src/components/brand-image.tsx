import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle, View } from 'react-native';

import { Colors } from '@/constants/theme';

type BrandImageProps = {
  children?: ReactNode;
  className?: string;
  contentFit?: ImageProps['contentFit'];
  source: ImageProps['source'];
  style?: StyleProp<ViewStyle>;
  withTextGradient?: boolean;
};

export function BrandImage({
  children,
  className,
  contentFit = 'cover',
  source,
  style,
  withTextGradient = false,
}: BrandImageProps) {
  return (
    <View className={`overflow-hidden bg-ink ${className ?? ''}`} style={style}>
      <Image source={source} contentFit={contentFit} style={StyleSheet.absoluteFillObject} />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: Colors.light.primary, opacity: 0.1 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: Colors.light.ink, opacity: 0.08 },
        ]}
      />
      {withTextGradient && (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(36, 28, 46, 0.05)', 'rgba(36, 28, 46, 0.34)', 'rgba(36, 28, 46, 0.88)']}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {children}
    </View>
  );
}
