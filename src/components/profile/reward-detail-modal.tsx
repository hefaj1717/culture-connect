import { ArrowLeft, LockKeyhole } from 'lucide-react-native';
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
  onOpenOrganizer: (reward: RewardPartner) => void;
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
  rewardQcNeeded: number;
  swipeStyle: AnimatedStyle<ViewStyle>;
  userQc: number;
};

export function RewardDetailModal({
  detailsExpanded,
  gesture,
  onClose,
  onOpenOrganizer,
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
  rewardQcNeeded,
  swipeStyle,
  userQc,
}: RewardDetailModalProps) {
  const stableTopInset = useStableTopInset();
  const statusLabel = rewardIsUsed
    ? 'Used'
    : rewardIsActive
      ? formatRewardTime(remainingMs)
      : rewardCanRedeem
        ? 'Ready'
        : reward && userQc >= reward.qcCost && !rewardIsAvailableNow
          ? 'Closed'
        : 'Locked';
  const pickupTitle = rewardIsUsed
    ? 'Coupon used'
    : rewardIsActive
      ? 'Show this screen'
      : rewardCanRedeem
        ? 'Ready to redeem'
      : 'Keep earning CultureQuest Credits';
  const redeemButtonLabel = rewardIsUsed
    ? 'Coupon already used'
    : rewardIsActive
      ? 'Coupon active'
      : rewardRedeeming
        ? 'Redeeming...'
        : rewardCanRedeem
          ? 'Redeem'
          : reward && userQc >= reward.qcCost && !rewardIsAvailableNow
            ? 'Not available now'
          : `Need ${rewardQcNeeded.toLocaleString()} more CultureQuest Credits`;
  const venueName = formatVenueName(reward?.name);
  const redeemDisabled = rewardStateExists || rewardRedeeming || !rewardCanRedeem;

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible={!!reward}>
      {reward && (
        <GestureDetector gesture={gesture}>
          <Animated.View className="flex-1 bg-canvas" style={swipeStyle}>
            <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
              <View className="bg-canvas px-5 pb-3" style={{ paddingTop: stableTopInset + 8 }}>
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
                      <Pressable
                        accessibilityLabel={`Open ${reward.organizerName ?? 'organizer'} profile`}
                        accessibilityRole="button"
                        className={`mt-3 flex-row items-center gap-2 ${
                          reward.organizerId ? 'active:opacity-70' : ''
                        }`}
                        disabled={!reward.organizerId}
                        onPress={() => onOpenOrganizer(reward)}
                      >
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                          <Text className="text-[9px] font-extrabold text-primary">
                            {getOrganizerInitials(reward.organizerName)}
                          </Text>
                        </View>
                        <Text className="text-[11px] font-semibold text-muted" numberOfLines={1}>
                          Offered by{' '}
                          <Text className="font-extrabold text-ink">
                            {reward.organizerName ?? 'Verified CultureQuest partner'}
                          </Text>
                        </Text>
                      </Pressable>
                    </View>
                    <View className="rounded-full border border-primary/40 px-3 py-1.5">
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
                      'Redeem this reward with CultureQuest Credits, then show the pickup screen to staff before ordering or paying.'}
                  </Text>

                  <View className="mt-6 rounded-2xl border border-primary/15 bg-surface p-4">
                    <Pressable
                      onPress={onToggleDetails}
                      className="flex-row items-center justify-between gap-3 active:opacity-80"
                    >
                      <View className="min-w-0 flex-1">
                        <Text className="text-[20px] font-extrabold leading-6 text-accent">
                          {reward.qcCost.toLocaleString()} QC
                        </Text>
                        <Text className="mt-1 text-[12px] font-semibold leading-4 text-muted">
                          {rewardCanRedeem || rewardStateExists
                            ? formatRewardAvailability(reward)
                            : `${userQc.toLocaleString()} / ${reward.qcCost.toLocaleString()} QC`}
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

                <View className="rounded-[30px] border border-primary/25 bg-surface p-[22px]">
                  <View className="mb-5 flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-[10px] font-bold uppercase leading-[16px] tracking-[1.6px] text-muted">
                        Staff pickup
                      </Text>
                      <Text
                        className="mt-1 font-heading text-[23px] font-extrabold leading-[29px] text-ink"
                        numberOfLines={2}
                      >
                        {pickupTitle}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-3 py-1.5"
                      style={{
                        backgroundColor: rewardIsUsed ? Colors.light.accent : Colors.light.backgroundSelected,
                      }}
                    >
                      <Text
                        className="text-[11px] font-bold"
                        style={{ color: rewardIsUsed ? Colors.light.onPrimary : Colors.light.primary }}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  <View
                    className="items-center rounded-[24px] border px-5 py-6"
                    style={{
                      backgroundColor: Colors.light.background,
                      borderColor: Colors.light.primary,
                      borderStyle: 'dashed',
                    }}
                  >
                    {rewardIsUsed && (
                      <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <LockKeyhole size={19} color={Colors.light.ink} strokeWidth={2.4} />
                      </View>
                    )}
                    <Text className="mb-3 text-center text-[10px] font-bold uppercase leading-[14px] tracking-[1.8px] text-muted">
                      CultureQuest reward
                    </Text>
                    <Text className="text-center font-heading text-[20px] font-extrabold leading-[27px] text-ink">
                      {reward.discount}
                    </Text>
                    {rewardIsActive && (
                      <Text
                        className="mt-5 text-center font-ui text-[34px] font-extrabold tracking-widest text-accent"
                        selectable
                      >
                        {pickupCode}
                      </Text>
                    )}
                    {!rewardStateExists && rewardCanRedeem && (
                      <Text className="mt-5 text-center text-[16px] font-extrabold text-ink">
                        Code hidden until redeem
                      </Text>
                    )}
                    {!rewardStateExists && !rewardCanRedeem && (
                      <Text className="mt-5 text-center text-[16px] font-extrabold text-ink">
                        {`You need ${rewardQcNeeded.toLocaleString()} more CultureQuest Credits`}
                      </Text>
                    )}
                    {rewardIsUsed && (
                      <Text className="mt-5 text-center text-[16px] font-extrabold text-accent">
                        This coupon has already been used.
                      </Text>
                    )}
                    <Text className="mt-4 text-center text-[12px] leading-5 text-muted">
                      {rewardIsActive
                        ? `Valid for ${formatRewardTime(
                            remainingMs,
                          )} at ${venueName}. Staff confirms before applying the reward.`
                        : rewardIsUsed
                          ? 'The reward code is no longer visible after use.'
                          : rewardCanRedeem
                            ? 'Tap Redeem only when you are ready to show this screen to staff.'
                            : userQc >= reward.qcCost && !rewardIsAvailableNow
                              ? `This reward can be redeemed ${formatRewardAvailability(reward)}.`
                              : 'Attend events and complete quests to unlock this reward.'}
                    </Text>
                  </View>
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

function getOrganizerInitials(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return 'CQ';

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
