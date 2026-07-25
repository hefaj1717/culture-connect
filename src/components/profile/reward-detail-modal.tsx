import { LinearGradient } from 'expo-linear-gradient';
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

import type { RewardPartner } from '@/data/culture';
import { formatRewardTime, getRewardPickupCode } from '@/data/profile';

type RewardDetailModalProps = {
  detailsExpanded: boolean;
  gesture: GestureType;
  onClose: () => void;
  onRedeem: () => void;
  onToggleDetails: () => void;
  remainingMs: number;
  reward: RewardPartner | null;
  rewardIsActive: boolean;
  rewardIsUsed: boolean;
  rewardStateExists: boolean;
  swipeStyle: StyleProp<ViewStyle>;
};

export function RewardDetailModal({
  detailsExpanded,
  gesture,
  onClose,
  onRedeem,
  onToggleDetails,
  remainingMs,
  reward,
  rewardIsActive,
  rewardIsUsed,
  rewardStateExists,
  swipeStyle,
}: RewardDetailModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={!!reward}>
      {reward && (
        <GestureDetector gesture={gesture}>
          <Animated.View className="flex-1 bg-white" style={swipeStyle}>
            <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
              <View className="bg-white px-5 pb-3 pt-2">
                <Pressable
                  onPress={onClose}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close reward"
                >
                  <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                </Pressable>
              </View>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 28,
                  paddingTop: 10,
                }}
                showsVerticalScrollIndicator={false}
              >
                <View className="mb-5 overflow-hidden rounded-[28px] bg-ink">
                  <LinearGradient
                    colors={['rgba(124,58,237,0.9)', 'rgba(36,28,46,0.98)']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={{ paddingBottom: 24, paddingHorizontal: 24, paddingTop: 24 }}
                  >
                    <View className="mb-6 flex-row items-start justify-between gap-4">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="mb-2 text-[10px] font-bold uppercase leading-[15px] tracking-[1.6px] text-white opacity-65"
                          numberOfLines={1}
                        >
                          {reward.location}
                        </Text>
                        <Text
                          className="font-ui text-[17px] font-extrabold leading-6 text-white"
                          numberOfLines={2}
                        >
                          {reward.name}
                        </Text>
                      </View>
                      <View className="rounded-full bg-white/10 px-3 py-1.5">
                        <Text className="text-[10px] font-extrabold uppercase tracking-wide text-white opacity-90">
                          Partner
                        </Text>
                      </View>
                    </View>

                    <Text className="mb-2 text-[10px] font-bold uppercase leading-[15px] tracking-[2px] text-white opacity-65">
                      Reward
                    </Text>
                    <Text className="font-heading text-[31px] font-extrabold leading-[36px] text-white">
                      {reward.discount}
                    </Text>
                    <Text
                      className="mt-4 text-[14px] leading-6 text-white opacity-90"
                      numberOfLines={detailsExpanded ? undefined : 3}
                    >
                      {reward.description ??
                        'Unlock this reward with CultureQuest XP, then show the pickup screen to staff before ordering or paying.'}
                    </Text>

                    <View className="mt-5 border-t border-white/10 pt-4">
                      <Pressable
                        onPress={onToggleDetails}
                        className="flex-row items-center justify-between gap-3 active:opacity-80"
                      >
                        <View className="min-w-0 flex-1">
                          <Text className="text-[11px] font-extrabold uppercase tracking-[1.8px] text-white opacity-65">
                            Redemption details
                          </Text>
                          <Text className="mt-1 text-[13px] font-semibold leading-5 text-white opacity-90">
                            {reward.condition}
                          </Text>
                        </View>
                        <Text className="text-[12px] font-extrabold text-accent">
                          {detailsExpanded ? 'Hide' : 'Show'}
                        </Text>
                      </Pressable>

                      {detailsExpanded && (
                        <View className="mt-4 gap-2">
                          {[
                            `Visit ${reward.name}.`,
                            'Tap Redeem only when you are with staff.',
                            'Show the pickup card before the reward is applied.',
                          ].map((step, index) => (
                            <View className="flex-row items-start gap-3" key={step}>
                              <Text className="w-5 text-[12px] font-extrabold text-accent">
                                {index + 1}.
                              </Text>
                              <Text className="flex-1 text-[13px] leading-5 text-white opacity-80">
                                {step}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>

                <View className="mb-3 overflow-hidden rounded-[28px] bg-ink">
                  <LinearGradient
                    colors={['rgba(36,28,46,0.98)', 'rgba(124,58,237,0.86)']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={{ paddingBottom: 20, paddingHorizontal: 22, paddingTop: 24 }}
                  >
                    <View className="mb-4 flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text className="text-[10px] font-bold uppercase leading-[16px] tracking-[1.6px] text-white opacity-65">
                          Staff pickup
                        </Text>
                        <Text
                          className="mt-1 font-heading text-[24px] font-extrabold leading-[29px] text-white"
                          numberOfLines={2}
                        >
                          {rewardIsUsed
                            ? 'Coupon used'
                            : rewardIsActive
                              ? 'Show this screen'
                              : 'Ready to redeem'}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full px-3 py-1 ${
                          rewardIsUsed
                            ? 'bg-white/10'
                            : rewardIsActive
                              ? 'bg-primary/20'
                              : 'bg-white/10'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            rewardIsUsed
                              ? 'text-white opacity-75'
                              : rewardIsActive
                                ? 'text-white'
                                : 'text-white opacity-75'
                          }`}
                        >
                          {rewardIsUsed
                            ? 'Used'
                            : rewardIsActive
                              ? formatRewardTime(remainingMs)
                              : 'Not redeemed'}
                        </Text>
                      </View>
                    </View>

                    <View className="rounded-[22px] border border-dashed border-accent/80 bg-white/10 px-4 py-5">
                      <Text className="mb-2 text-center text-[10px] font-bold uppercase leading-[14px] tracking-[1.8px] text-white opacity-65">
                        CultureQuest reward
                      </Text>
                      <Text className="text-center font-heading text-[21px] font-extrabold leading-[27px] text-white">
                        {reward.discount}
                      </Text>
                      {rewardIsActive && (
                        <Text className="mt-4 text-center font-ui text-[32px] font-extrabold tracking-widest text-accent">
                          {getRewardPickupCode(reward)}
                        </Text>
                      )}
                      {!rewardStateExists && (
                        <Text className="mt-4 text-center text-[16px] font-extrabold text-white opacity-80">
                          Code hidden until redeem
                        </Text>
                      )}
                      {rewardIsUsed && (
                        <Text className="mt-4 text-center text-[16px] font-extrabold text-white opacity-80">
                          This coupon has already been used.
                        </Text>
                      )}
                      <Text className="mt-3 text-center text-[12px] leading-4 text-white opacity-75">
                        {rewardIsActive
                          ? `Valid for ${formatRewardTime(remainingMs)} at ${
                              reward.name
                            }. Staff confirms before applying the reward.`
                          : rewardIsUsed
                            ? 'The reward code is no longer visible after use.'
                            : 'Tap Redeem only when you are ready to show this screen to staff.'}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>

                <Pressable
                  onPress={onRedeem}
                  disabled={rewardStateExists}
                  className={`h-[52px] items-center justify-center rounded-xl active:opacity-85 ${
                    rewardStateExists ? 'bg-gray-200' : 'bg-primary'
                  }`}
                >
                  <Text
                    className={`text-[15px] font-semibold ${
                      rewardStateExists ? 'text-muted' : 'text-white'
                    }`}
                  >
                    {rewardIsUsed
                      ? 'Coupon already used'
                      : rewardIsActive
                        ? 'Coupon active'
                        : 'Redeem'}
                  </Text>
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      )}
    </Modal>
  );
}
