import { Beer, BookOpen, Coffee, Gift } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { BrandImage } from '@/components/brand-image';
import { Colors } from '@/constants/theme';
import type { RewardPartner } from '@/data/culture';

type RewardPartnerRowProps = {
  onPress: () => void;
  reward: RewardPartner;
  variantIndex: number;
};

export function RewardPartnerRow({ onPress, reward, variantIndex }: RewardPartnerRowProps) {
  const RewardIcon = getRewardIcon(reward);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-3xl border border-gray-200 bg-white p-3 active:bg-gray-50"
    >
      <View className="h-[76px] w-[76px] overflow-hidden rounded-2xl">
        <BrandImage
          className="h-full w-full"
          source={getRewardImageSource(reward, variantIndex)}
          withTextGradient
        >
          <View className="absolute bottom-2 left-2 h-8 w-8 items-center justify-center rounded-full bg-white/90">
            <RewardIcon size={16} color={Colors.light.primary} strokeWidth={2.5} />
          </View>
        </BrandImage>
      </View>

      <View className="min-w-0 flex-1">
        <View className="mb-1 flex-row items-start justify-between gap-2">
          <Text className="min-w-0 flex-1 font-ui text-[15px] font-bold text-ink" numberOfLines={1}>
            {reward.name}
          </Text>
          <Text className="font-stat text-[13px] font-extrabold text-primary">
            {reward.xpCost} XP
          </Text>
        </View>
        <Text className="mb-1 text-[12px] text-muted" numberOfLines={1}>
          {reward.location}
        </Text>
        <Text className="text-[13px] leading-5 text-ink" numberOfLines={2}>
          {reward.discount}
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-[11px] font-medium text-muted" numberOfLines={1}>
            {reward.condition}
          </Text>
          <Text className="text-[12px] font-semibold text-primary">View</Text>
        </View>
      </View>
    </Pressable>
  );
}

function getRewardIcon(reward: RewardPartner) {
  if (reward.category === 'bookstore' || reward.name.toLowerCase().includes('book')) {
    return BookOpen;
  }
  if (reward.name.toLowerCase().includes('browar') || reward.name.toLowerCase().includes('brew')) {
    return Beer;
  }
  if (reward.category === 'cafe') {
    return Coffee;
  }

  return Gift;
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
