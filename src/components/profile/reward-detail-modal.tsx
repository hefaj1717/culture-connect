import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import type { RewardPartner } from '@/data/culture';
import { formatRewardTime } from '@/data/profile';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import { formatRewardAvailability } from '@/lib/reward-availability';

type RewardDetailModalProps = {
  detailsExpanded: boolean;
  gesture: GestureType;
  onClose: () => void;
  onRedeem: () => void;
  onToggleDetails: () => void;
  pickupCode: string | null;
  remainingMs: number;
  reward: RewardPartner | null;
  rewardCanRedeem: boolean;
  rewardIsAvailableNow: boolean;
  rewardRedeemError: string | null;
  rewardRedeeming: boolean;
  rewardIsActive: boolean;
  rewardIsUsed: boolean;
  rewardStateExists: boolean;
  rewardXpNeeded: number;
  swipeStyle: AnimatedStyle<ViewStyle>;
  userXp: number;
};

export function RewardDetailModal({
  detailsExpanded,
  gesture,
  onClose,
  onRedeem,
  onToggleDetails,
  pickupCode,
  remainingMs,
  reward,
  rewardCanRedeem,
  rewardIsAvailableNow,
  rewardRedeemError,
  rewardRedeeming,
  rewardIsActive,
  rewardIsUsed,
  rewardStateExists,
  rewardXpNeeded,
  swipeStyle,
  userXp,
}: RewardDetailModalProps) {
  const stableTopInset = useStableTopInset();
  const statusLabel = rewardIsUsed
    ? 'Used'
    : rewardIsActive
      ? formatRewardTime(remainingMs)
      : rewardCanRedeem
        ? 'Ready'
        : reward && userXp >= reward.xpCost && !rewardIsAvailableNow
          ? 'Closed'
        : 'Locked';
  const pickupTitle = rewardIsUsed
    ? 'Coupon used'
    : rewardIsActive
      ? 'Show this screen'
      : rewardCanRedeem
        ? 'Ready to redeem'
        : 'Keep earning XP';
  const redeemButtonLabel = rewardIsUsed
    ? 'Coupon already used'
    : rewardIsActive
      ? 'Coupon active'
      : rewardRedeeming
        ? 'Redeeming...'
        : rewardCanRedeem
          ? 'Redeem'
          : reward && userXp >= reward.xpCost && !rewardIsAvailableNow
            ? 'Not available now'
          : `Need ${rewardXpNeeded.toLocaleString()} more XP`;
  const venueName = formatVenueName(reward?.name);
  const redeemDisabled = rewardStateExists || rewardRedeeming || !rewardCanRedeem;

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible={!!reward}>
      {reward && (
        <GestureDetector gesture={gesture}>
          <Animated.View className="flex-1 bg-white" style={swipeStyle}>
            <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
              <View className="bg-white px-5 pb-3" style={{ paddingTop: stableTopInset + 8 }}>
                <Pressable
                  onPress={onClose}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close reward"
                >
                  <ArrowLeft size={21} color="#6B818C" strokeWidth={2.6} />
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
                <View
                  className="rounded-[30px] border border-gray-200 bg-canvas p-6"
                  style={{ boxShadow: '0 12px 24px rgba(36, 28, 46, 0.08)' }}
                >
                  <View className="mb-7 flex-row items-start justify-between gap-4">
                    <View className="min-w-0 flex-1">
                      <Text
                        className="font-ui text-[22px] font-extrabold leading-7 text-ink"
                        numberOfLines={2}
                      >
                        {venueName}
                      </Text>
                      <Text
                        className="mt-1 text-[12px] font-semibold leading-[17px] text-muted"
                        numberOfLines={2}
                      >
                        {reward.location}
                      </Text>
                    </View>
                    <View className="rounded-full bg-primary/10 px-3 py-1.5">
                      <Text className="text-[10px] font-extrabold uppercase tracking-wide text-primary">
                        Partner
                      </Text>
                    </View>
                  </View>

                  <View className="mb-5 h-[1px] bg-gray-200" />
                  <Text className="font-heading text-[31px] font-extrabold leading-[36px] text-ink">
                    {reward.discount}
                  </Text>
                  <Text
                    className="mt-4 text-[14px] leading-[22px] text-muted"
                    numberOfLines={detailsExpanded ? undefined : 3}
                  >
                    {reward.description ??
                      'Unlock this reward with CultureQuest XP, then show the pickup screen to staff before ordering or paying.'}
                  </Text>

                  <View className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
                    <Pressable
                      onPress={onToggleDetails}
                      className="flex-row items-center justify-between gap-3 active:opacity-80"
                    >
                      <View className="min-w-0 flex-1">
                        <Text className="text-[14px] font-extrabold leading-5 text-ink">
                          {rewardCanRedeem || rewardStateExists
                            ? `${reward.condition} · ${formatRewardAvailability(reward)}`
                            : `${userXp.toLocaleString()} / ${reward.xpCost.toLocaleString()} XP`}
                        </Text>
                      </View>
                      <Text className="text-[12px] font-extrabold text-accentDeep">
                        {detailsExpanded ? 'Hide' : 'Show'}
                      </Text>
                    </Pressable>

                    {detailsExpanded && (
                      <View className="mt-4 gap-2">
                        {[
                          `Visit ${venueName}.`,
                          'Tap Redeem only when you are with staff.',
                          'Show the pickup card before the reward is applied.',
                        ].map((step, index) => (
                          <View className="flex-row items-start gap-3" key={step}>
                            <Text className="w-5 text-[12px] font-extrabold text-accentDeep">
                              {index + 1}.
                            </Text>
                            <Text className="flex-1 text-[13px] leading-5 text-muted">{step}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
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
                          className="mt-1 font-heading text-[23px] font-extrabold leading-[29px]"
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
                            color:
                              rewardIsActive || rewardCanRedeem
                                ? Colors.light.accent
                                : 'rgba(255,255,255,0.78)',
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
                        className="text-center font-heading text-[20px] font-extrabold leading-[27px]"
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
                          {pickupCode}
                        </Text>
                      )}
                      {!rewardStateExists && rewardCanRedeem && (
                        <Text
                          className="mt-5 text-center text-[16px] font-extrabold"
                          style={{ color: 'rgba(255,255,255,0.84)' }}
                        >
                          Code hidden until redeem
                        </Text>
                      )}
                      {!rewardStateExists && !rewardCanRedeem && (
                        <Text
                          className="mt-5 text-center text-[16px] font-extrabold"
                          style={{ color: 'rgba(255,255,255,0.84)' }}
                        >
                          You need {rewardXpNeeded.toLocaleString()} more XP
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
                          ? `Valid for ${formatRewardTime(
                              remainingMs,
                            )} at ${venueName}. Staff confirms before applying the reward.`
                          : rewardIsUsed
                            ? 'The reward code is no longer visible after use.'
                            : rewardCanRedeem
                              ? 'Tap Redeem only when you are ready to show this screen to staff.'
                              : userXp >= reward.xpCost && !rewardIsAvailableNow
                                ? `This reward can be redeemed ${formatRewardAvailability(reward)}.`
                              : 'Attend events and complete quests to unlock this reward.'}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>

                {rewardRedeemError && (
                  <View className="rounded-2xl border border-accent/25 bg-accent/10 p-4">
                    <Text className="text-[13px] font-semibold leading-5 text-ink">
                      {rewardRedeemError}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={onRedeem}
                  disabled={redeemDisabled}
                  className="h-[54px] items-center justify-center rounded-2xl active:opacity-85"
                  style={{
                    backgroundColor: redeemDisabled ? '#E5E0EA' : Colors.light.primary,
                  }}
                >
                  <Text
                    className="text-[15px] font-semibold"
                    style={{ color: redeemDisabled ? Colors.light.textSecondary : '#FFFFFF' }}
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

function formatVenueName(value?: string | null) {
  if (!value) return 'Partner venue';

  return value
    .replace(/\bcafe\b/gi, 'café')
    .replace(/\bSTUKcafé\b/g, 'STUK café')
    .replace(/\bHeca\s*café\b/gi, 'Heca Café')
    .replace(/\s+/g, ' ')
    .trim();
}
