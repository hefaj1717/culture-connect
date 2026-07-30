import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Gift,
  MapPin,
  RefreshCw,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandImage } from '@/components/brand-image';
import { getCultureCityData } from '@/data/culture';
import { type PendingAdminEvent, type PendingAdminReward } from '@/lib/admin-moderation';

type ReviewTab = 'events' | 'rewards';
type ReviewContentKind = 'event' | 'reward';

type AdminReviewModalProps = {
  error: string | null;
  events: PendingAdminEvent[];
  gesture: GestureType;
  loading: boolean;
  onClose: () => void;
  onDeleteEvent: (id: string) => void;
  onRefresh: () => void;
  onReview: (kind: ReviewContentKind, id: string, status: 'approved' | 'rejected') => void;
  rewards: PendingAdminReward[];
  reviewingContentId: string | null;
  stableModalTopInset: number;
  swipeStyle: StyleProp<ViewStyle>;
  visible: boolean;
};

export function AdminReviewModal({
  error,
  events,
  gesture,
  loading,
  onClose,
  onDeleteEvent,
  onRefresh,
  onReview,
  rewards,
  reviewingContentId,
  stableModalTopInset,
  swipeStyle,
  visible,
}: AdminReviewModalProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>('events');
  const activeItemsCount = activeTab === 'events' ? events.length : rewards.length;

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
                paddingTop: stableModalTopInset + 14,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View className="mb-5 flex-row items-center justify-between">
                <Pressable
                  onPress={onClose}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close content review"
                >
                  <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                </Pressable>
                <Pressable
                  onPress={onRefresh}
                  className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Refresh pending content"
                >
                  <RefreshCw size={18} color="#7C3AED" strokeWidth={2.5} />
                </Pressable>
              </View>

              <View className="mb-5 overflow-hidden rounded-3xl bg-ink">
                <LinearGradient
                  colors={['rgba(124,58,237,0.72)', 'rgba(36,28,46,0.98)']}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={{ padding: 20 }}
                >
                  <Text className="text-[12px] font-semibold uppercase tracking-wide text-white/70">
                    Admin review
                  </Text>
                  <Text className="mt-1 font-heading text-[29px] font-extrabold leading-[33px] text-white">
                    Approve what goes live.
                  </Text>
                  <Text
                    className="mt-2 max-w-[300px] text-[13px] leading-5 text-white/80"
                    style={{ color: 'rgba(255,255,255,0.82)' }}
                  >
                    Review organizer submissions before students see them in CultureQuest.
                  </Text>
                </LinearGradient>
              </View>

              <View className="mb-4 flex-row gap-2 rounded-2xl bg-gray-100 p-1">
                <ReviewTabButton
                  active={activeTab === 'events'}
                  count={events.length}
                  label="Events"
                  onPress={() => setActiveTab('events')}
                />
                <ReviewTabButton
                  active={activeTab === 'rewards'}
                  count={rewards.length}
                  label="Rewards"
                  onPress={() => setActiveTab('rewards')}
                />
              </View>

              {error && (
                <View className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                  <Text className="text-[13px] leading-5 text-destructive">{error}</Text>
                </View>
              )}

              {loading ? (
                <View className="items-center justify-center rounded-3xl border border-gray-200 bg-white p-8">
                  <ActivityIndicator color="#7C3AED" />
                  <Text className="mt-3 text-[13px] font-semibold text-muted">
                    Loading pending {activeTab}
                  </Text>
                </View>
              ) : activeItemsCount === 0 ? (
                <View className="rounded-3xl border border-primary/10 bg-primary/5 p-5">
                  <Text className="font-heading text-[22px] font-extrabold text-ink">
                    Nothing to review
                  </Text>
                  <Text className="mt-2 text-[13px] leading-5 text-muted">
                    Pending {activeTab} will appear here as soon as organizers submit them.
                  </Text>
                </View>
              ) : (
                <View className="gap-4">
                  {activeTab === 'events'
                    ? events.map((event) => (
                        <PendingEventCard
                          event={event}
                          key={event.id}
                          onDelete={onDeleteEvent}
                          onReview={onReview}
                          reviewingContentId={reviewingContentId}
                        />
                      ))
                    : rewards.map((reward) => (
                        <PendingRewardCard
                          key={reward.id}
                          onReview={onReview}
                          reward={reward}
                          reviewingContentId={reviewingContentId}
                        />
                      ))}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function ReviewTabButton({
  active,
  count,
  label,
  onPress,
}: {
  active: boolean;
  count: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl active:opacity-85 ${
        active ? 'bg-white' : 'bg-transparent'
      }`}
    >
      <Text className={`text-[13px] font-extrabold ${active ? 'text-ink' : 'text-muted'}`}>
        {label}
      </Text>
      <View className={`rounded-full px-2 py-0.5 ${active ? 'bg-primary/10' : 'bg-white/70'}`}>
        <Text className="text-[11px] font-extrabold text-primary">{count}</Text>
      </View>
    </Pressable>
  );
}

function PendingEventCard({
  event,
  onDelete,
  onReview,
  reviewingContentId,
}: {
  event: PendingAdminEvent;
  onDelete: (id: string) => void;
  onReview: (kind: ReviewContentKind, id: string, status: 'approved' | 'rejected') => void;
  reviewingContentId: string | null;
}) {
  const busy = reviewingContentId === `event-${event.id}`;
  const deleteBusy = reviewingContentId === `event-delete-${event.id}`;
  const city = getCultureCityData(event.cityId);
  const isEditedEvent = event.changes.length > 0;
  const submittedLabel = formatReviewTimestamp(event.updatedAt ?? event.createdAt);

  return (
    <View className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
      <View className="h-[150px] bg-gray-200">
        <BrandImage
          source={
            event.imageUrl
              ? { uri: event.imageUrl }
              : event.organizerAvatarUrl
                ? { uri: event.organizerAvatarUrl }
                : require('@/assets/images/culture/venue-theater.jpg')
          }
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
          withTextGradient
        >
          <View
            className={`absolute left-4 top-4 rounded-full px-3 py-1 ${
              isEditedEvent ? 'bg-accent' : 'bg-white/90'
            }`}
          >
            <Text
              className={`text-[11px] font-bold ${isEditedEvent ? 'text-ink' : 'text-primary'}`}
            >
              {isEditedEvent ? 'Edit review' : 'New event'} · {city.name}
            </Text>
          </View>
          <View className="absolute bottom-4 left-4 right-4">
            <Text className="font-heading text-[25px] font-extrabold leading-[28px] text-white">
              {event.title}
            </Text>
          </View>
        </BrandImage>
      </View>
      <View className="p-4">
        <InfoLine icon={<MapPin size={15} color="#7C3AED" />} text={event.venueName} />
        <InfoLine
          icon={<CalendarDays size={15} color="#7C3AED" />}
          text={`${event.date}, ${formatPendingEventTimeRange(event)}`}
        />
        <InfoLine
          icon={<UserRound size={15} color="#7C3AED" />}
          text={`Submitted by ${event.organizerName}`}
        />
        <Text className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {isEditedEvent ? 'Review requested' : 'Submitted'} {submittedLabel}
        </Text>
        <Text className="mt-3 text-[13px] leading-5 text-muted" numberOfLines={3}>
          {event.description}
        </Text>
        {isEditedEvent && <PendingEventChanges changes={event.changes} />}
        <ReviewActions
          busy={busy}
          onApprove={() => onReview('event', event.id, 'approved')}
          onDelete={() => onDelete(event.id)}
          onReject={() => onReview('event', event.id, 'rejected')}
          deleteBusy={deleteBusy}
        />
      </View>
    </View>
  );
}

function PendingEventChanges({ changes }: { changes: PendingAdminEvent['changes'] }) {
  return (
    <View className="mt-4 rounded-2xl border border-accent/20 bg-accent/10 p-3">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <Text className="text-[11px] font-extrabold uppercase tracking-wide text-accentDeep">
          Changes requested
        </Text>
        <View className="rounded-full bg-white/70 px-2 py-0.5">
          <Text className="text-[10px] font-extrabold text-accentDeep">
            {changes.length} {changes.length === 1 ? 'field' : 'fields'}
          </Text>
        </View>
      </View>
      <View className="gap-2">
        {changes.map((change) => (
          <View
            key={`${change.field}-${change.from}-${change.to}`}
            className="rounded-2xl bg-white/70 p-2.5"
          >
            <Text className="mb-2 text-[12px] font-extrabold text-ink">{change.field}</Text>
            <View className="gap-1.5">
              <ChangeValue label="Previous" tone="muted" value={change.from} />
              <ChangeValue label="Requested" tone="accent" value={change.to} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ChangeValue({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'accent' | 'muted';
  value: string;
}) {
  return (
    <View
      className={`rounded-xl px-2.5 py-2 ${tone === 'accent' ? 'bg-accent/15' : 'bg-gray-100'}`}
    >
      <Text
        className={`text-[9px] font-extrabold uppercase tracking-wide ${
          tone === 'accent' ? 'text-accentDeep' : 'text-muted'
        }`}
      >
        {label}
      </Text>
      <Text
        className={`mt-0.5 text-[11px] font-semibold leading-4 ${
          tone === 'accent' ? 'text-ink' : 'text-muted'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

function formatPendingEventTimeRange(event: PendingAdminEvent) {
  return event.endTime ? `${event.time}-${event.endTime}` : event.time;
}

function PendingRewardCard({
  onReview,
  reward,
  reviewingContentId,
}: {
  onReview: (kind: ReviewContentKind, id: string, status: 'approved' | 'rejected') => void;
  reward: PendingAdminReward;
  reviewingContentId: string | null;
}) {
  const busy = reviewingContentId === `reward-${reward.id}`;
  const city = getCultureCityData(reward.cityId);

  return (
    <View className="rounded-3xl border border-gray-200 bg-white p-4">
      <View className="mb-3 flex-row items-start gap-3">
        <View className="h-12 w-12 overflow-hidden rounded-2xl bg-primary/10">
          {reward.organizerAvatarUrl ? (
            <BrandImage
              className="h-full w-full"
              source={{ uri: reward.organizerAvatarUrl }}
              withTextGradient={false}
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-primary/10">
              <Gift size={21} color="#7C3AED" strokeWidth={2.4} />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 font-heading text-[22px] font-extrabold leading-[25px] text-ink">
              {reward.title}
            </Text>
            <Text className="text-[13px] font-extrabold text-primary">{reward.xpCost} XP</Text>
          </View>
          <Text className="text-[13px] font-semibold text-muted" numberOfLines={1}>
            {reward.placeName} · {city.name}
          </Text>
        </View>
      </View>
      <Text className="text-[13px] leading-5 text-muted" numberOfLines={3}>
        {reward.description}
      </Text>
      <InfoLine icon={<MapPin size={15} color="#7C3AED" />} text={reward.placeAddress} />
      <InfoLine
        icon={<UserRound size={15} color="#7C3AED" />}
        text={`Submitted by ${reward.organizerName}`}
      />
      <ReviewActions
        busy={busy}
        onApprove={() => onReview('reward', reward.id, 'approved')}
        onReject={() => onReview('reward', reward.id, 'rejected')}
      />
    </View>
  );
}

function formatReviewTimestamp(value?: string | null) {
  if (!value) return 'recently';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'recently';

  return parsed.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

function InfoLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="mt-2 flex-row items-center gap-2">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">{icon}</View>
      <Text className="min-w-0 flex-1 text-[12px] font-semibold text-muted" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function ReviewActions({
  busy,
  deleteBusy,
  onApprove,
  onDelete,
  onReject,
}: {
  busy: boolean;
  deleteBusy?: boolean;
  onApprove: () => void;
  onDelete?: () => void;
  onReject: () => void;
}) {
  const anyBusy = busy || !!deleteBusy;
  function confirmAction(action: 'approved' | 'rejected') {
    Alert.alert(
      action === 'approved' ? 'Approve this submission?' : 'Reject this submission?',
      action === 'approved'
        ? 'This will make the event or reward visible to students.'
        : 'This will send the submission back as rejected.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: action === 'approved' ? onApprove : onReject,
          style: action === 'approved' ? 'default' : 'destructive',
          text: action === 'approved' ? 'Approve' : 'Reject',
        },
      ],
    );
  }

  return (
    <View className="mt-4 gap-2">
      <View className="flex-row gap-2">
        <Pressable
          disabled={anyBusy}
          onPress={() => confirmAction('rejected')}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white active:opacity-80"
        >
          <X size={16} color="#756F7B" strokeWidth={2.5} />
          <Text className="text-[13px] font-extrabold text-muted">Reject</Text>
        </Pressable>
        <Pressable
          disabled={anyBusy}
          onPress={() => confirmAction('approved')}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
        >
          {busy ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Check size={16} color="white" strokeWidth={2.5} />
          )}
          <Text className="text-[13px] font-extrabold text-white">Approve</Text>
        </Pressable>
      </View>
      {onDelete && (
        <Pressable
          disabled={anyBusy}
          onPress={onDelete}
          className="h-10 flex-row items-center justify-center gap-2 rounded-xl bg-destructive/10 active:opacity-80"
        >
          {deleteBusy ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : (
            <Trash2 size={15} color="#EF4444" strokeWidth={2.5} />
          )}
          <Text className="text-[13px] font-extrabold text-destructive">Delete event</Text>
        </Pressable>
      )}
    </View>
  );
}
