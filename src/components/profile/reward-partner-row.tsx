import { Pressable, Text, View } from 'react-native';

import { BrandImage } from '@/components/brand-image';
import type { RewardPartner } from '@/data/culture';

type RewardPartnerRowProps = {
  onPress: () => void;
  reward: RewardPartner;
  variantIndex: number;
};

export function RewardPartnerRow({ onPress, reward, variantIndex }: RewardPartnerRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-[26px] border border-gray-200 bg-white p-3 active:bg-primary/5"
    >
      <View className="flex-row gap-3">
        <View className="h-[86px] w-[92px] overflow-hidden rounded-[20px] bg-gray-100">
          <BrandImage
            className="h-full w-full"
            source={getRewardImageSource(reward, variantIndex)}
            withTextGradient={false}
          />
        </View>

        <View className="min-w-0 flex-1 py-0.5">
          <View className="mb-1 flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <Text
                className="font-ui text-[16px] font-extrabold leading-5 text-ink"
                numberOfLines={1}
              >
                {formatVenueName(reward.name)}
              </Text>
              <Text className="mt-0.5 text-[11px] leading-4 text-muted" numberOfLines={1}>
                {reward.location}
              </Text>
            </View>

            <View className="rounded-full bg-primary/10 px-2.5 py-1">
              <Text className="font-ui text-[11px] font-extrabold text-primary">
                {reward.xpCost} XP
              </Text>
            </View>
          </View>

          <Text className="mt-1 text-[13px] font-semibold leading-5 text-ink" numberOfLines={2}>
            {reward.discount}
          </Text>

          <View className="mt-2 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 text-[11px] font-semibold text-muted" numberOfLines={1}>
              {reward.condition}
            </Text>
            <Text className="text-[12px] font-extrabold text-primary">View</Text>
          </View>
        </View>
      </View>
    </Pressable>
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
