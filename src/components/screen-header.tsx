import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { Text } from '@/components/ui/text';

type ScreenHeaderProps = {
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  title: string;
};

/** Shared title hierarchy for top-level tabs and modal form screens. */
export function ScreenHeader({ subtitle, style, title }: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  subtitle: {
    ...Typography.bodyMuted,
    marginTop: Spacing.sm,
  },
  title: Typography.screenTitle,
});
