import { ArrowLeft } from 'lucide-react-native';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BadgeDetailSheet,
  BadgeGridItem,
  type AchievementBadge,
} from '@/components/profile/badges';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';

type BadgesModalProps = {
  badges: AchievementBadge[];
  gesture: GestureType;
  onClose: () => void;
  onSelectBadge: (badge: AchievementBadge | null) => void;
  selectedBadge: AchievementBadge | null;
  stableModalTopInset: number;
  swipeStyle: AnimatedStyle<ViewStyle>;
  unlockedBadgeCount: number;
  visible: boolean;
};

export function BadgesModal({
  badges,
  gesture,
  onClose,
  onSelectBadge,
  selectedBadge,
  stableModalTopInset,
  swipeStyle,
  unlockedBadgeCount,
  visible,
}: BadgesModalProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding = 20;
  const columnGap = 12;
  const itemWidth = Math.max(84, (width - horizontalPadding * 2 - columnGap * 2) / 3);

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible={visible}>
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
                  className="h-10 w-10 items-center justify-center rounded-full bg-subtle active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close badges"
                >
                  <ArrowLeft size={21} color={Colors.light.textSecondary} strokeWidth={2.6} />
                </Pressable>
                <View className="rounded-full bg-primary/10 px-3 py-1.5">
                  <Text className="text-caption font-inter-bold text-primary">
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
