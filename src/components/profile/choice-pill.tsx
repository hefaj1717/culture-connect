import type { ComponentType } from 'react';
import { Pressable, Text } from 'react-native';

import { Colors } from '@/constants/theme';

export type ChoiceIcon = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

type ChoicePillProps = {
  active: boolean;
  icon?: ChoiceIcon;
  label: string;
  onPress: () => void;
};

export function ChoicePill({ active, icon: Icon, label, onPress }: ChoicePillProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`flex-row items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 ${
        active ? 'border-primary bg-primary/10' : 'border-gray-200 bg-gray-100'
      }`}
    >
      {Icon && (
        <Icon size={14} color={active ? Colors.light.primary : '#6B818C'} strokeWidth={2.4} />
      )}
      <Text className={`text-[12px] font-semibold ${active ? 'text-primary' : 'text-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
