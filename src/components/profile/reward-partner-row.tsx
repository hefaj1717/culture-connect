import { CheckCircle2, LockKeyhole } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { BrandImage } from '@/components/brand-image';
import type { RewardPartner } from '@/data/culture';

type RewardPartnerRowProps = {
  onPress: () => void;
  reward: RewardPartner;
  userXp: number;
  variantIndex: number;
};

export function RewardPartnerRow({ onPress, reward, userXp, variantIndex }: RewardPartnerRowProps) {
  const isUnlocked = userXp >= reward.xpCost;
  const xpRemaining = Math.max(0, reward.xpCost - userXp);

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-[26px] border p-3 active:opacity-85 ${
        isUnlocked ? 'border-accent/30 bg-accent/10' : 'border-gray-200 bg-white'
      }`}
      style={{ boxShadow: '0 8px 18px rgba(36, 28, 46, 0.06)' }}
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
              <RewardStatusPill isUnlocked={isUnlocked} />
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
              {isUnlocked ? 'Available now' : `${xpRemaining.toLocaleString()} XP left`}
            </Text>
            <View
              className={`rounded-full px-3 py-1.5 ${isUnlocked ? 'bg-primary' : 'bg-accent/15'}`}
            >
              <Text
                className={`text-[12px] font-extrabold ${
                  isUnlocked ? 'text-white' : 'text-accentDeep'
                }`}
              >
                {isUnlocked ? 'Redeem' : `${reward.xpCost} XP`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function RewardStatusPill({ isUnlocked }: { isUnlocked: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${
        isUnlocked ? 'bg-accent/20' : 'bg-gray-100'
      }`}
    >
      {isUnlocked ? (
        <CheckCircle2 size={12} color="#F4A261" strokeWidth={2.6} />
      ) : (
        <LockKeyhole size={12} color="#756F7B" strokeWidth={2.5} />
      )}
      <Text className={`text-[10px] font-extrabold ${isUnlocked ? 'text-ink' : 'text-muted'}`}>
        {isUnlocked ? 'READY' : 'LOCKED'}
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
