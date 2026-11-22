import { CheckCircle2, LockKeyhole } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { BrandImage } from '@/components/brand-image';
import { CardStyles, Colors } from '@/constants/theme';
import type { RewardPartner } from '@/data/culture';
import type { RedeemedRewardState } from '@/data/profile';
import { formatRewardAvailability, isRewardCurrentlyAvailable } from '@/lib/reward-availability';
import { Text } from '@/components/ui/text';

type RewardPartnerRowProps = {
  onPress: () => void;
  redemption?: RedeemedRewardState;
  reward: RewardPartner;
  userQc: number;
};

export function RewardPartnerRow({
  onPress,
  redemption,
  reward,
  userQc,
}: RewardPartnerRowProps) {
  const isUsed = !!redemption?.used;
  const isActive = !!redemption && !isUsed;
  const isAvailableNow = isRewardCurrentlyAvailable(reward);
  const hasEnoughQc = userQc >= reward.qcCost;
  const isUnlocked = hasEnoughQc && isAvailableNow && !isUsed && !isActive;
  const isClosed = hasEnoughQc && !isAvailableNow && !isUsed && !isActive;
  const rowState = isUsed
    ? 'used'
    : isActive
      ? 'active'
      : isUnlocked
        ? 'ready'
        : isClosed
          ? 'closed'
          : 'locked';

  return (
    <Pressable
      accessibilityLabel={`Open reward ${reward.discount}`}
      onPress={onPress}
      testID={`reward.card.${reward.id}`}
      className={`rounded-2xl border p-3 active:opacity-85 ${
        rowState === 'ready'
          ? 'border-accent/30 bg-accent/10'
          : rowState === 'active'
            ? 'border-primary/25 bg-primary/10'
            : 'border-line bg-surface'
      }`}
      style={CardStyles.compact}
    >
      <View className="flex-row gap-3">
        <View className="h-[94px] w-[94px] overflow-hidden rounded-2xl bg-subtle">
          <BrandImage
            className="h-full w-full"
            source={getRewardImageSource(reward)}
            withTextGradient={false}
          />
        </View>

        <View className="min-w-0 flex-1 justify-between py-0.5">
          <View>
            <View className="mb-1 flex-row items-center justify-between gap-2">
              <Text className="min-w-0 flex-1 text-caption font-inter-bold text-muted">
                {formatVenueName(reward.name)}
              </Text>
              <RewardStatusPill state={rowState} />
            </View>

            <Text
              className="text-headline font-inter-bold leading-5 text-ink"
              numberOfLines={2}
            >
              {reward.discount}
            </Text>
            <Text className="mt-1 text-caption font-inter-medium leading-4 text-muted" numberOfLines={1}>
              {formatLocation(reward.location)}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 text-caption font-inter-semibold text-muted" numberOfLines={1}>
              {rowState === 'used'
                ? 'Coupon already used'
                : rowState === 'active'
                  ? 'Coupon active'
                  : rowState === 'ready'
                    ? 'Available now'
                    : rowState === 'closed'
                      ? formatRewardAvailability(reward)
                    : `${Math.max(0, reward.qcCost - userQc).toLocaleString()} QC left`}
            </Text>
            <View
              className={`rounded-full px-3 py-1.5 ${
                rowState === 'used'
                  ? 'bg-subtle'
                  : rowState === 'ready'
                    ? 'bg-accent'
                    : 'bg-accent/15'
              }`}
            >
              <Text
                className={`text-caption font-inter-bold ${
                  rowState === 'used'
                    ? 'text-muted'
                    : rowState === 'ready'
                      ? 'text-white'
                      : 'text-accentDeep'
                }`}
              >
                {rowState === 'used'
                  ? 'Used'
                  : rowState === 'active'
                    ? 'Open'
                    : rowState === 'ready'
                      ? 'Redeem'
                      : rowState === 'closed'
                        ? 'Closed'
                      : `${reward.qcCost} QC`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

type RewardRowState = 'active' | 'closed' | 'locked' | 'ready' | 'used';

function RewardStatusPill({ state }: { state: RewardRowState }) {
  const isReady = state === 'ready';
  const isActive = state === 'active';
  const label =
    state === 'used'
      ? 'USED'
      : state === 'active'
        ? 'ACTIVE'
        : state === 'ready'
          ? 'READY'
          : state === 'closed'
            ? 'CLOSED'
          : 'LOCKED';

  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${
        isReady ? 'bg-accent/20' : isActive ? 'bg-primary/15' : 'bg-subtle'
      }`}
    >
      {isReady || isActive ? (
        <CheckCircle2 size={12} color={Colors.light.accent} strokeWidth={2.6} />
      ) : (
        <LockKeyhole size={12} color={Colors.light.textSecondary} strokeWidth={2.5} />
      )}
      <Text
        className={`text-caption font-inter-bold ${isReady || isActive ? 'text-ink' : 'text-muted'}`}
      >
        {label}
      </Text>
    </View>
  );
}

function formatVenueName(value: string) {
  return value
    .replace(/\bSTUKcafe\b/g, 'STUK café')
    .replace(/\bSTUKcafé\b/g, 'STUK café')
    .replace(/\bHeca\s*Cafe\b/gi, 'Heca Café')
    .replace(/\bcafe\b/gi, 'café')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatLocation(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function getRewardImageSource(reward: RewardPartner) {
  if (reward.organizerAvatarUrl) {
    return { uri: reward.organizerAvatarUrl };
  }
  if (reward.imageUrl) {
    return { uri: reward.imageUrl };
  }

  return require('@/assets/images/culture/default-coffee.jpg');
}
