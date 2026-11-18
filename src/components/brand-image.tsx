import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle, View } from 'react-native';


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
      <Image source={source} contentFit={contentFit} style={StyleSheet.absoluteFill} />
      {withTextGradient && (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(30, 30, 36, 0)', 'rgba(30, 30, 36, 0.25)', 'rgba(30, 30, 36, 0.82)']}
          locations={[0.35, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}
