import { ArrowLeft } from 'lucide-react-native';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BadgeDetailSheet,
  BadgeGridItem,
  type AchievementBadge,
} from '@/components/profile/badges';

type BadgesModalProps = {
  badges: AchievementBadge[];
  gesture: GestureType;
  itemWidth: number;
  onClose: () => void;
  onSelectBadge: (badge: AchievementBadge | null) => void;
  selectedBadge: AchievementBadge | null;
  stableModalTopInset: number;
  swipeStyle: StyleProp<ViewStyle>;
  unlockedBadgeCount: number;
  visible: boolean;
};

export function BadgesModal({
  badges,
  gesture,
  itemWidth,
  onClose,
  onSelectBadge,
  selectedBadge,
  stableModalTopInset,
  swipeStyle,
  unlockedBadgeCount,
  visible,
}: BadgesModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 36,
                paddingTop: stableModalTopInset + 18,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View className="mb-5 flex-row items-center justify-between">
                <Pressable
                  onPress={onClose}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close badges"
                >
                  <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                </Pressable>
                <View className="rounded-full bg-primary/10 px-3 py-1.5">
                  <Text className="text-[12px] font-extrabold text-primary">
                    {unlockedBadgeCount} / {badges.length} completed
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {badges.map((badge) => (
                  <BadgeGridItem
                    badge={badge}
                    itemWidth={itemWidth}
                    key={badge.id}
                    onPress={() => onSelectBadge(badge)}
                  />
                ))}
              </View>
            </ScrollView>
            {selectedBadge && (
              <BadgeDetailSheet badge={selectedBadge} onClose={() => onSelectBadge(null)} />
            )}
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}
