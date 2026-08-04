import { CheckCircle2, LockKeyhole } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { BrandImage } from '@/components/brand-image';
import { CardStyles } from '@/constants/theme';
import type { RewardPartner } from '@/data/culture';
import type { RedeemedRewardState } from '@/data/profile';
import { formatRewardAvailability, isRewardCurrentlyAvailable } from '@/lib/reward-availability';

type RewardPartnerRowProps = {
  onPress: () => void;
  redemption?: RedeemedRewardState;
  reward: RewardPartner;
  userXp: number;
  variantIndex: number;
};

export function RewardPartnerRow({
  onPress,
  redemption,
  reward,
  userXp,
  variantIndex,
}: RewardPartnerRowProps) {
  const isUsed = !!redemption?.used;
  const isActive = !!redemption && !isUsed;
  const isAvailableNow = isRewardCurrentlyAvailable(reward);
  const hasEnoughXp = userXp >= reward.xpCost;
  const isUnlocked = hasEnoughXp && isAvailableNow && !isUsed && !isActive;
  const isClosed = hasEnoughXp && !isAvailableNow && !isUsed && !isActive;
  const xpRemaining = Math.max(0, reward.xpCost - userXp);
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
      onPress={onPress}
      className={`rounded-[26px] border p-3 active:opacity-85 ${
        rowState === 'ready'
          ? 'border-accent/30 bg-accent/10'
          : rowState === 'active'
            ? 'border-primary/25 bg-primary/10'
            : 'border-gray-200 bg-white'
      }`}
      style={CardStyles.compact}
    >
      <View className="flex-row gap-3">
        <View className="h-[94px] w-[94px] overflow-hidden rounded-[22px] bg-gray-100">
          <BrandImage
            className="h-full w-full"
            source={getRewardImageSource(reward, variantIndex)}
            withTextGradient={false}
          />
        </View>

        <View className="min-w-0 flex-1 justify-between py-0.5">
          <View>
            <View className="mb-1 flex-row items-center justify-between gap-2">
              <Text className="min-w-0 flex-1 text-[11px] font-extrabold uppercase tracking-wide text-muted">
                {formatVenueName(reward.name)}
              </Text>
              <RewardStatusPill state={rowState} />
            </View>

            <Text
              className="font-ui text-[17px] font-extrabold leading-5 text-ink"
              numberOfLines={2}
            >
              {reward.discount}
            </Text>
            <Text className="mt-1 text-[12px] font-medium leading-4 text-muted" numberOfLines={1}>
              {formatLocation(reward.location)}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 text-[12px] font-semibold text-muted" numberOfLines={1}>
              {rowState === 'used'
                ? 'Coupon already used'
                : rowState === 'active'
                  ? 'Coupon active'
                  : rowState === 'ready'
                    ? 'Available now'
                    : rowState === 'closed'
                      ? formatRewardAvailability(reward)
                    : `${xpRemaining.toLocaleString()} XP left`}
            </Text>
            <View
              className={`rounded-full px-3 py-1.5 ${
                rowState === 'used'
                  ? 'bg-gray-100'
                  : rowState === 'ready'
                    ? 'bg-primary'
                    : 'bg-accent/15'
              }`}
            >
              <Text
                className={`text-[12px] font-extrabold ${
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
                      : `${reward.xpCost} XP`}
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
        isReady ? 'bg-accent/20' : isActive ? 'bg-primary/15' : 'bg-gray-100'
      }`}
    >
      {isReady || isActive ? (
        <CheckCircle2 size={12} color="#F4A261" strokeWidth={2.6} />
      ) : (
        <LockKeyhole size={12} color="#756F7B" strokeWidth={2.5} />
      )}
      <Text
        className={`text-[10px] font-extrabold ${isReady || isActive ? 'text-ink' : 'text-muted'}`}
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

function getRewardImageSource(reward: RewardPartner, variantIndex: number) {
  if (reward.organizerAvatarUrl) {
    return { uri: reward.organizerAvatarUrl };
  }
  if (reward.imageUrl) {
    return { uri: reward.imageUrl };
  }

  if (reward.category === 'cafe') {
    return require('@/assets/images/culture/venue-cafe.jpg');
  }
  if (reward.name.toLowerCase().includes('browar') || reward.name.toLowerCase().includes('brew')) {
    return require('@/assets/images/culture/venue-theater.jpg');
  }
  if (reward.category === 'bookstore' || reward.name.toLowerCase().includes('book')) {
    return require('@/assets/images/culture/venue-museum.jpg');
  }

  return variantIndex % 2 === 0
    ? require('@/assets/images/culture/venue-cafe.jpg')
    : require('@/assets/images/culture/venue-museum.jpg');
}
