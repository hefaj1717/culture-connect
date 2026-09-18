import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { CardStyles, Colors, Radius, Spacing } from '@/constants/theme';

type AppSurfaceProps = ViewProps & {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'inline' | 'tinted';
};

/** Shared non-interactive surface for cards and asynchronous states. */
export function AppSurface({
  children,
  compact = false,
  style,
  tone = 'default',
  ...props
}: AppSurfaceProps) {
  return (
    <View
      style={[
        styles.base,
        compact ? styles.compact : styles.regular,
        tone === 'inline' ? styles.inline : tone === 'tinted' ? styles.tinted : styles.default,
        tone === 'inline' ? undefined : CardStyles.soft,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderCurve: 'continuous',
  },
  compact: {
    padding: Spacing.md,
  },
  default: {
    backgroundColor: Colors.light.surface,
    borderColor: `${Colors.light.primary}1A`,
    borderRadius: Radius.feature,
    borderWidth: 1,
  },
  inline: {
    backgroundColor: Colors.light.background,
    borderRadius: Radius.card,
  },
  regular: {
    padding: Spacing.xl,
  },
  tinted: {
    backgroundColor: Colors.light.backgroundElement,
    borderColor: `${Colors.light.primary}1A`,
    borderRadius: Radius.feature,
    borderWidth: 1,
  },
});
