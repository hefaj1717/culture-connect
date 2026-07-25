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

import { Colors } from '@/constants/theme';
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
  const statusLabel = rewardIsUsed
    ? 'Used'
    : rewardIsActive
      ? formatRewardTime(remainingMs)
      : 'Not redeemed';
  const pickupTitle = rewardIsUsed
    ? 'Coupon used'
    : rewardIsActive
      ? 'Show this screen'
      : 'Ready to redeem';
  const redeemButtonLabel = rewardIsUsed
    ? 'Coupon already used'
    : rewardIsActive
      ? 'Coupon active'
      : 'Redeem';

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
                  paddingBottom: 34,
                  paddingTop: 12,
                  gap: 16,
                }}
                showsVerticalScrollIndicator={false}
              >
                <View className="overflow-hidden rounded-[30px] bg-ink">
                  <LinearGradient
                    colors={['rgba(124,58,237,0.96)', 'rgba(36,28,46,0.99)']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={{ paddingBottom: 26, paddingHorizontal: 24, paddingTop: 28 }}
                  >
                    <View className="mb-7 flex-row items-start justify-between gap-4">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="mb-2 text-[10px] font-bold uppercase leading-[15px] tracking-[1.6px]"
                          style={{ color: 'rgba(255,255,255,0.7)' }}
                          numberOfLines={1}
                        >
                          {reward.location}
                        </Text>
                        <Text
                          className="font-ui text-[17px] font-extrabold leading-6"
                          style={{ color: '#FFFFFF' }}
                          numberOfLines={2}
                        >
                          {reward.name}
                        </Text>
                      </View>
                      <View className="rounded-full bg-white/10 px-3 py-1.5">
                        <Text
                          className="text-[10px] font-extrabold uppercase tracking-wide"
                          style={{ color: 'rgba(255,255,255,0.9)' }}
                        >
                          Partner
                        </Text>
                      </View>
                    </View>

                    <Text
                      className="mb-2 text-[10px] font-bold uppercase leading-[15px] tracking-[2px]"
                      style={{ color: 'rgba(255,255,255,0.68)' }}
                    >
                      Reward
                    </Text>
                    <Text
                      className="font-heading text-[31px] font-extrabold leading-[37px]"
                      style={{ color: '#FFFFFF' }}
                    >
                      {reward.discount}
                    </Text>
                    <Text
                      className="mt-4 text-[14px] leading-6"
                      style={{ color: 'rgba(255,255,255,0.88)' }}
                      numberOfLines={detailsExpanded ? undefined : 3}
                    >
                      {reward.description ??
                        'Unlock this reward with CultureQuest XP, then show the pickup screen to staff before ordering or paying.'}
                    </Text>

                    <View className="mt-6 rounded-2xl bg-white/10 p-4">
                      <Pressable
                        onPress={onToggleDetails}
                        className="flex-row items-center justify-between gap-3 active:opacity-80"
                      >
                        <View className="min-w-0 flex-1">
                          <Text
                            className="text-[11px] font-extrabold uppercase tracking-[1.8px]"
                            style={{ color: 'rgba(255,255,255,0.68)' }}
                          >
                            Redemption details
                          </Text>
                          <Text
                            className="mt-1 text-[13px] font-semibold leading-5"
                            style={{ color: '#FFFFFF' }}
                          >
                            {reward.condition}
                          </Text>
                        </View>
                        <Text
                          className="text-[12px] font-extrabold"
                          style={{ color: Colors.light.accent }}
                        >
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
                              <Text
                                className="w-5 text-[12px] font-extrabold"
                                style={{ color: Colors.light.accent }}
                              >
                                {index + 1}.
                              </Text>
                              <Text
                                className="flex-1 text-[13px] leading-5"
                                style={{ color: 'rgba(255,255,255,0.82)' }}
                              >
                                {step}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>

                <View className="overflow-hidden rounded-[30px] bg-ink">
                  <LinearGradient
                    colors={['rgba(36,28,46,0.99)', 'rgba(92,44,180,0.96)']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={{ paddingBottom: 24, paddingHorizontal: 22, paddingTop: 26 }}
                  >
                    <View className="mb-5 flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-[10px] font-bold uppercase leading-[16px] tracking-[1.6px]"
                          style={{ color: 'rgba(255,255,255,0.68)' }}
                        >
                          Staff pickup
                        </Text>
                        <Text
                          className="mt-1 font-heading text-[25px] font-extrabold leading-[31px]"
                          style={{ color: '#FFFFFF' }}
                          numberOfLines={2}
                        >
                          {pickupTitle}
                        </Text>
                      </View>
                      <View
                        className="rounded-full px-3 py-1.5"
                        style={{
                          backgroundColor: rewardIsActive
                            ? 'rgba(244,162,97,0.22)'
                            : 'rgba(255,255,255,0.12)',
                        }}
                      >
                        <Text
                          className="text-[11px] font-bold"
                          style={{
                            color: rewardIsActive ? Colors.light.accent : 'rgba(255,255,255,0.78)',
                          }}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="rounded-[24px] border border-dashed px-5 py-6"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderColor: Colors.light.accent,
                      }}
                    >
                      <Text
                        className="mb-3 text-center text-[10px] font-bold uppercase leading-[14px] tracking-[1.8px]"
                        style={{ color: 'rgba(255,255,255,0.68)' }}
                      >
                        CultureQuest reward
                      </Text>
                      <Text
                        className="text-center font-heading text-[22px] font-extrabold leading-[29px]"
                        style={{ color: '#FFFFFF' }}
                      >
                        {reward.discount}
                      </Text>
                      {rewardIsActive && (
                        <Text
                          className="mt-5 text-center font-ui text-[34px] font-extrabold tracking-widest"
                          selectable
                          style={{ color: Colors.light.accent }}
                        >
                          {getRewardPickupCode(reward)}
                        </Text>
                      )}
                      {!rewardStateExists && (
                        <Text
                          className="mt-5 text-center text-[16px] font-extrabold"
                          style={{ color: 'rgba(255,255,255,0.84)' }}
                        >
                          Code hidden until redeem
                        </Text>
                      )}
                      {rewardIsUsed && (
                        <Text
                          className="mt-5 text-center text-[16px] font-extrabold"
                          style={{ color: 'rgba(255,255,255,0.84)' }}
                        >
                          This coupon has already been used.
                        </Text>
                      )}
                      <Text
                        className="mt-4 text-center text-[12px] leading-5"
                        style={{ color: 'rgba(255,255,255,0.76)' }}
                      >
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
                  className="h-[54px] items-center justify-center rounded-2xl active:opacity-85"
                  style={{
                    backgroundColor: rewardStateExists ? '#E5E0EA' : Colors.light.primary,
                  }}
                >
                  <Text
                    className="text-[15px] font-semibold"
                    style={{ color: rewardStateExists ? Colors.light.textSecondary : '#FFFFFF' }}
                  >
                    {redeemButtonLabel}
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
