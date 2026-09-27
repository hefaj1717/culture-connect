import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Gift,
  MapPin,
  RefreshCw,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardListSkeleton, EmptyState, ErrorState } from '@/components/async-state';
import { ScreenHeader } from '@/components/screen-header';
import { BrandImage } from '@/components/brand-image';
import { getCultureCityData } from '@/data/culture';
import { type PendingAdminEvent, type PendingAdminReward } from '@/lib/admin-moderation';
import { formatRewardAvailability } from '@/lib/reward-availability';

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
  swipeStyle: AnimatedStyle<ViewStyle>;
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
        <Animated.View className="flex-1 bg-canvas" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
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
                  <ArrowLeft size={21} color="#6B818C" strokeWidth={2.6} />
                </Pressable>
                <Pressable
                  onPress={onRefresh}
                  className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Refresh pending content"
                >
                  <RefreshCw size={18} color="#6B818C" strokeWidth={2.5} />
                </Pressable>
              </View>

              <ScreenHeader
                subtitle="Review organizer submissions before students see them in CultureQuest."
                title="Approve what goes live"
              />

              <View className="mb-4 flex-row overflow-hidden rounded-feature border border-primary/10 bg-surface">
                <ReviewQueueSummary icon={<CalendarDays size={17} color="#6B818C" />} label="Events" value={events.length} />
                <View className="my-4 w-px bg-primary/15" />
                <ReviewQueueSummary icon={<Gift size={17} color="#A63446" />} label="Rewards" value={rewards.length} />
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
                <ErrorState
                  body={error}
                  compact
                  style={{ marginBottom: 16 }}
                  title="Review queue could not load"
                />
              )}

              {loading ? (
                <CardListSkeleton count={3} />
              ) : activeItemsCount === 0 ? (
                <EmptyState
                  body={`Pending ${activeTab} will appear here as soon as organizers submit them.`}
                  icon={activeTab === 'events' ? CalendarDays : Gift}
                  title="Nothing to review"
                />
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

function ReviewQueueSummary({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-2.5 px-4 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">{icon}</View>
      <View>
        <Text className="font-serifRegular text-[22px] leading-6 text-ink">{value}</Text>
        <Text className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</Text>
      </View>
    </View>
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
          style={StyleSheet.absoluteFill}
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
        <InfoLine icon={<MapPin size={15} color="#6B818C" />} text={event.venueName} />
        <InfoLine
          icon={<CalendarDays size={15} color="#6B818C" />}
          text={`${event.date}, ${formatPendingEventTimeRange(event)}`}
        />
        <InfoLine
          icon={<UserRound size={15} color="#6B818C" />}
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
            <BrandImage
              className="h-full w-full"
              source={require('@/assets/images/culture/default-coffee.jpg')}
              withTextGradient={false}
            />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 font-heading text-[22px] font-extrabold leading-[25px] text-ink">
              {reward.title}
            </Text>
            <Text className="text-[13px] font-extrabold text-accent">{reward.qcCost} QC</Text>
          </View>
          <Text className="text-[13px] font-semibold text-muted" numberOfLines={1}>
            {reward.placeName} · {city.name}
          </Text>
        </View>
      </View>
      <Text className="text-[13px] leading-5 text-muted" numberOfLines={3}>
        {reward.description}
      </Text>
      <InfoLine icon={<MapPin size={15} color="#6B818C" />} text={reward.placeAddress} />
      <InfoLine icon={<Clock size={15} color="#6B818C" />} text={formatRewardAvailability(reward)} />
      <InfoLine
        icon={<UserRound size={15} color="#6B818C" />}
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
          <X size={16} color="#6B818C" strokeWidth={2.5} />
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
