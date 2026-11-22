import { X } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { Colors, GamificationColors } from '@/constants/theme';
import { Text } from '@/components/ui/text';

export type BadgeCategory = keyof typeof GamificationColors.badges;

export type AchievementBadge = {
  category: BadgeCategory;
  color: string;
  description: string;
  icon: ComponentType<{
    color?: string;
    fill?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  id: string;
  progress: string;
  title: string;
  unlocked: boolean;
};

export function PassportBadge({
  badge,
  itemWidth = 104,
  onPress,
}: {
  badge: AchievementBadge;
  itemWidth?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl border p-3 active:opacity-80 ${
        badge.unlocked ? 'border-white bg-white' : 'border-line bg-subtle'
      }`}
      style={[
        { width: itemWidth },
        badge.unlocked ? { boxShadow: '0 10px 20px rgba(36, 28, 46, 0.10)' } : undefined,
      ]}
    >
      <BadgeIcon badge={badge} className="mb-3 h-14 w-14 rounded-2xl" iconSize={25} />
      <Text
        className={`text-caption font-inter-semibold leading-4 ${
          badge.unlocked ? 'text-ink' : 'text-muted'
        }`}
        numberOfLines={2}
      >
        {badge.title}
      </Text>
      <Text className="mt-1 text-caption font-inter-semibold text-muted" numberOfLines={1}>
        {badge.unlocked ? 'Unlocked' : badge.progress}
      </Text>
    </Pressable>
  );
}

export function BadgeGridItem({
  badge,
  itemWidth,
  onPress,
}: {
  badge: AchievementBadge;
  itemWidth: number;
  onPress: () => void;
}) {
  const progress = getBadgeProgress(badge.progress);
  const hasProgress = !badge.unlocked && progress !== null;
  const progressPercent = progress
    ? Math.min(100, Math.max(0, (progress.current / progress.total) * 100))
    : 0;

  return (
    <Pressable
      onPress={onPress}
      className={`min-h-[138px] rounded-2xl border p-3 active:opacity-80 ${
        badge.unlocked ? 'border-white bg-white' : 'border-line bg-subtle'
      }`}
      style={[
        { width: itemWidth },
        badge.unlocked ? { boxShadow: '0 10px 20px rgba(36, 28, 46, 0.10)' } : undefined,
      ]}
    >
      <BadgeIcon badge={badge} className="mb-3 h-14 w-14 rounded-2xl" iconSize={24} />
      <Text
        className={`text-caption font-inter-bold leading-4 ${
          badge.unlocked ? 'text-ink' : 'text-muted'
        }`}
        numberOfLines={2}
      >
        {badge.title}
      </Text>
      <Text className="mt-1 text-caption font-inter-semibold text-muted" numberOfLines={1}>
        {badge.unlocked ? 'Unlocked' : badge.progress}
      </Text>
      {hasProgress && (
        <View className="mt-auto pt-3">
          <View className="h-2 overflow-hidden rounded-full bg-progressTrack">
            <View
              className="h-full rounded-full bg-success"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function BadgeDetailSheet({
  badge,
  onClose,
}: {
  badge: AchievementBadge;
  onClose: () => void;
}) {
  const progress = getBadgeProgress(badge.progress);
  const progressPercent = progress
    ? Math.min(100, Math.max(0, (progress.current / progress.total) * 100))
    : 0;

  return (
    <View className="absolute inset-x-0 bottom-0 border-t border-line bg-canvas px-5 pb-8 pt-4">
      <View className="mb-4 flex-row items-start gap-4">
        <BadgeIcon badge={badge} className="h-16 w-16 rounded-2xl" iconSize={28} />
        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 font-heading text-title2 leading-7 text-ink">
              {badge.title}
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-subtle active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Close badge detail"
            >
              <X size={18} color={Colors.light.textSecondary} strokeWidth={2.6} />
            </Pressable>
          </View>
          <Text className="text-footnote leading-5 text-muted">{badge.description}</Text>
        </View>
      </View>

      <View className="rounded-2xl bg-accent/10 p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-caption font-inter-bold text-muted">Progress</Text>
          <Text className="text-caption font-inter-bold text-accentDeep">
            {badge.unlocked ? 'Unlocked' : badge.progress}
          </Text>
        </View>
        {progress ? (
          <View className="h-3 overflow-hidden rounded-full bg-progressTrack">
            <View
              className="h-full rounded-full bg-success"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        ) : (
          <Text className="text-footnote font-inter-semibold text-muted">
            Keep exploring to unlock this badge.
          </Text>
        )}
      </View>
    </View>
  );
}

function BadgeIcon({
  badge,
  className,
  iconSize,
}: {
  badge: AchievementBadge;
  className: string;
  iconSize: number;
}) {
  const Icon = badge.icon;
  const categoryColor = badge.color ?? GamificationColors.badges[badge.category];

  return (
    <View
      className={`relative items-center justify-center ${badge.unlocked ? '' : 'bg-subtle'} ${className}`}
      style={badge.unlocked ? { backgroundColor: categoryColor } : undefined}
    >
      <Icon
        size={iconSize}
        color={badge.unlocked ? 'white' : '#9CA3AF'}
        strokeWidth={2.4}
        fill={badge.unlocked ? 'rgba(255,255,255,0.16)' : 'transparent'}
      />
    </View>
  );
}

function getBadgeProgress(progress: string) {
  const match = progress.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;

  return {
    current: Number(match[1]),
    total: Number(match[2]),
  };
}
