import { X } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';

export type AchievementBadge = {
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
  onPress,
}: {
  badge: AchievementBadge;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`w-[104px] rounded-3xl p-3 active:opacity-80 ${
        badge.unlocked ? 'bg-primary/10' : 'bg-gray-100'
      }`}
    >
      <BadgeIcon badge={badge} className="mb-3 h-14 w-14 rounded-2xl" iconSize={25} />
      <Text
        className={`font-ui text-[12px] font-bold leading-4 ${
          badge.unlocked ? 'text-ink' : 'text-muted'
        }`}
        numberOfLines={2}
      >
        {badge.title}
      </Text>
      <Text className="mt-1 text-[10px] font-semibold text-muted" numberOfLines={1}>
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
      className={`min-h-[138px] rounded-3xl border p-3 active:opacity-80 ${
        badge.unlocked ? 'border-primary/20 bg-primary/10' : 'border-gray-200 bg-gray-50'
      }`}
      style={{ width: itemWidth }}
    >
      <BadgeIcon badge={badge} className="mb-3 h-14 w-14 rounded-2xl" iconSize={24} />
      <Text
        className={`font-ui text-[12px] font-extrabold leading-4 ${
          badge.unlocked ? 'text-ink' : 'text-muted'
        }`}
        numberOfLines={2}
      >
        {badge.title}
      </Text>
      <Text className="mt-1 text-[10px] font-bold text-muted" numberOfLines={1}>
        {badge.unlocked ? 'Unlocked' : badge.progress}
      </Text>
      {hasProgress && (
        <View className="mt-auto pt-3">
          <View className="h-1.5 overflow-hidden rounded-full bg-primary/10">
            <View
              className="h-full rounded-full bg-primary"
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
    <View className="absolute inset-x-0 bottom-0 border-t border-gray-200 bg-white px-5 pb-8 pt-4">
      <View className="mb-4 flex-row items-start gap-4">
        <BadgeIcon badge={badge} className="h-16 w-16 rounded-3xl" iconSize={28} />
        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 font-heading text-[24px] font-extrabold leading-7 text-ink">
              {badge.title}
            </Text>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Close badge detail"
            >
              <X size={18} color="#756F7B" strokeWidth={2.6} />
            </Pressable>
          </View>
          <Text className="text-[13px] leading-5 text-muted">{badge.description}</Text>
        </View>
      </View>

      <View className="rounded-2xl bg-primary/5 p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-[11px] font-extrabold uppercase tracking-[2px] text-muted">
            Progress
          </Text>
          <Text className="text-[12px] font-extrabold text-primary">
            {badge.unlocked ? 'Unlocked' : badge.progress}
          </Text>
        </View>
        {progress ? (
          <View className="h-2 overflow-hidden rounded-full bg-primary/10">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        ) : (
          <Text className="text-[13px] font-semibold text-muted">
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

  return (
    <View
      className={`items-center justify-center ${badge.unlocked ? 'bg-primary' : 'bg-gray-200'} ${className}`}
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
