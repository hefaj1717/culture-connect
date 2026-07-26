import { ArrowLeft, CalendarDays, ChevronRight, Clock, MapPin } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandImage } from '@/components/brand-image';
import { PassportBadge, type AchievementBadge } from '@/components/profile/badges';
import { OrganizerStatusCard, OrganizerVerifiedBadge } from '@/components/profile/organizer-status';
import { RankAvatar } from '@/components/profile/profile-avatar';
import { RewardPartnerRow } from '@/components/profile/reward-partner-row';
import { eventCategoryLabels, type CultureEvent, type RewardPartner } from '@/data/culture';
import type { UserEventHistoryItem, UserEventStatus } from '@/lib/event-history';
import type { ManagedOrganizerEvent, OrganizerEventStatus } from '@/lib/organizer-events';

type OrganizerStatus = 'none' | 'pending' | 'approved' | 'rejected';

type LevelProgress = {
  currentLevel: { name: string; minXp: number };
  nextLevel: { name: string; minXp: number } | null;
  progressPercent: number;
  xpToNext: number;
};

type ProfileRankCardProps = {
  avatarInitials: string | null;
  avatarUrl?: string | null;
  cityLabel: string;
  fullName: string;
  levelProgress: LevelProgress;
  organizerStatus: OrganizerStatus;
  userXp: number;
};

export function ProfileRankCard({
  avatarInitials,
  avatarUrl,
  cityLabel,
  fullName,
  levelProgress,
  organizerStatus,
  userXp,
}: ProfileRankCardProps) {
  return (
    <View className="mx-5 mb-5 rounded-[28px] border border-gray-200 bg-white p-4">
      <View className="mb-5 flex-row items-center gap-4">
        <RankAvatar
          initials={avatarInitials}
          progressPercent={levelProgress.progressPercent}
          uri={avatarUrl}
        />

        <View className="min-w-0 flex-1">
          <View className="mb-1">
            <Text className="font-heading text-[31px] font-extrabold leading-[35px] text-ink">
              {fullName}
            </Text>
          </View>
          {organizerStatus === 'approved' && (
            <View className="mb-2">
              <OrganizerVerifiedBadge />
            </View>
          )}
          <Text className="text-[13px] font-medium text-muted" numberOfLines={1}>
            {levelProgress.currentLevel.name} · {cityLabel}
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-2xl bg-canvas p-4">
        <View className="mb-3 flex-row items-end justify-between gap-4">
          <View>
            <View className="mb-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Total XP
              </Text>
            </View>
            <Text className="font-ui text-[34px] font-extrabold leading-[38px] text-ink">
              {userXp.toLocaleString()}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-right text-[12px] font-semibold leading-4 text-muted">
              {levelProgress.nextLevel
                ? `${levelProgress.xpToNext.toLocaleString()} XP to ${levelProgress.nextLevel.name}`
                : 'Top city rank reached'}
            </Text>
            <Text className="mt-1 text-[13px] font-extrabold text-primary">
              {Math.round(levelProgress.progressPercent)}%
            </Text>
          </View>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-primary/10">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${levelProgress.progressPercent}%` }}
          />
        </View>
      </View>
    </View>
  );
}

type ProfileActionsProps = {
  onEdit: () => void;
  onSignOut: () => void;
};

export function ProfileActions({ onEdit, onSignOut }: ProfileActionsProps) {
  return (
    <View className="mx-5 mb-6">
      <View className="flex-row gap-3">
        <Pressable
          onPress={onEdit}
          className="h-12 flex-1 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
        >
          <Text className="text-[14px] font-semibold text-white">Edit profile</Text>
        </Pressable>

        <Pressable
          onPress={onSignOut}
          className="h-12 flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 active:opacity-80"
        >
          <Text className="text-[14px] font-semibold text-muted">Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

type UserActivitySectionProps = {
  history: UserEventHistoryItem[];
  onOpenAll: () => void;
};

export function UserActivitySection({ history, onOpenAll }: UserActivitySectionProps) {
  return (
    <View className="mb-6 px-5">
      <Pressable
        onPress={onOpenAll}
        className="flex-row items-center gap-3 rounded-3xl border border-primary/10 bg-primary/5 p-4 active:opacity-85"
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
          <CalendarDays size={20} color="#7C3AED" strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-heading text-[20px] font-extrabold text-ink">My activity</Text>
          <Text className="mt-0.5 text-[12px] font-medium text-muted">
            {history.length > 0
              ? `${history.length} saved ${history.length === 1 ? 'event' : 'events'}`
              : 'Interested, going, and attended events'}
          </Text>
        </View>
        <ChevronRight size={18} color="#7C3AED" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

type DigitalPassportSectionProps = {
  badges: AchievementBadge[];
  onOpenAll: () => void;
  onOpenBadge: (badge: AchievementBadge) => void;
};

export function DigitalPassportSection({
  badges,
  onOpenAll,
  onOpenBadge,
}: DigitalPassportSectionProps) {
  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center justify-between px-5">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Digital Passport</Text>
        <Pressable onPress={onOpenAll} className="active:opacity-75">
          <Text className="text-[12px] font-semibold text-primary">View all</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {badges.slice(0, 8).map((badge) => (
          <PassportBadge
            badge={badge}
            key={badge.id}
            onPress={() => {
              onOpenBadge(badge);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

type OrganizerToolsSectionProps = {
  cityName: string;
  onCreateEvent: () => void;
  onCreateReward: () => void;
  status: OrganizerStatus;
};

export function OrganizerToolsSection({
  cityName,
  onCreateEvent,
  onCreateReward,
  status,
}: OrganizerToolsSectionProps) {
  if (status === 'none') {
    return null;
  }

  return (
    <View className="mb-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Organizer Tools</Text>
      </View>

      {status === 'approved' ? (
        <View className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
          <View className="mb-4">
            <View className="mb-1 flex-row items-start justify-between gap-3">
              <Text className="min-w-0 flex-1 font-heading text-[20px] font-extrabold text-ink">
                Event maker tools
              </Text>
              <OrganizerVerifiedBadge compact />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="mt-1 text-[13px] leading-5 text-muted">
                Create and publish events for {cityName}.
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Pressable
              onPress={onCreateEvent}
              className="h-11 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
            >
              <Text className="text-[14px] font-semibold text-white">Create event</Text>
            </Pressable>
            <Pressable
              onPress={onCreateReward}
              className="h-11 flex-row items-center justify-center rounded-xl border border-primary/25 bg-white active:opacity-85"
            >
              <Text className="text-[14px] font-semibold text-primary">Create reward</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <OrganizerStatusCard status={status} />
      )}
    </View>
  );
}

type OrganizerEventHistorySectionProps = {
  error?: string | null;
  events: ManagedOrganizerEvent[];
  onOpenAll: () => void;
};

export function OrganizerEventHistorySection({
  error,
  events,
  onOpenAll,
}: OrganizerEventHistorySectionProps) {
  return (
    <View className="mb-6 px-5">
      {error && (
        <View className="rounded-2xl border border-secondary/20 bg-secondary/10 p-3">
          <Text className="text-[12px] leading-4 text-muted">
            Your event history could not load yet. Apply the latest Supabase migration if needed.
          </Text>
        </View>
      )}

      {!error && (
        <Pressable
          onPress={onOpenAll}
          className="flex-row items-center gap-3 rounded-3xl border border-gray-200 bg-white p-4 active:opacity-85"
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-canvas">
            <CalendarDays size={20} color="#7C3AED" strokeWidth={2.4} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-heading text-[20px] font-extrabold text-ink">My events</Text>
            <Text className="mt-0.5 text-[12px] font-medium text-muted">
              {events.length > 0
                ? `${events.length} submitted ${events.length === 1 ? 'event' : 'events'}`
                : 'Submitted, pending, and past events'}
            </Text>
          </View>
          <ChevronRight size={18} color="#7C3AED" strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
}

export function UserActivityHistoryModal({
  history,
  onClose,
  stableModalTopInset,
  visible,
}: {
  history: UserEventHistoryItem[];
  onClose: () => void;
  stableModalTopInset: number;
  visible: boolean;
}) {
  const [selectedEvent, setSelectedEvent] = useState<CultureEvent | null>(null);
  const selectedHistoryItem = selectedEvent
    ? history.find((item) => item.event.id === selectedEvent.id)
    : null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <View
          className="border-b border-gray-200 bg-white px-5 pb-4"
          style={{ paddingTop: stableModalTopInset + 10 }}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                if (selectedEvent) {
                  setSelectedEvent(null);
                  return;
                }

                onClose();
              }}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
            >
              <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
            </Pressable>
            <View className="items-end">
              <Text className="font-heading text-[24px] font-extrabold text-ink">
                {selectedEvent ? 'Event' : 'My activity'}
              </Text>
              <Text className="text-[11px] font-semibold text-muted">
                {selectedEvent ? selectedEvent.venueName : `${history.length} events`}
              </Text>
            </View>
          </View>
        </View>

        {selectedEvent ? (
          <HistoryEventDetail event={selectedEvent} status={selectedHistoryItem?.status} />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ gap: 12, padding: 20, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {history.length === 0 ? (
              <HistoryEmptyState
                body="Events you mark as Interested, Going, or Attended will appear here."
                title="No saved events yet"
              />
            ) : (
              history.map((item) => (
                <EventHistoryRow
                  event={item.event}
                  key={`${item.event.id}-${item.status}-full`}
                  onPress={() => setSelectedEvent(item.event)}
                  status={item.status}
                />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export function OrganizerEventHistoryModal({
  events,
  onClose,
  stableModalTopInset,
  visible,
}: {
  events: ManagedOrganizerEvent[];
  onClose: () => void;
  stableModalTopInset: number;
  visible: boolean;
}) {
  const [selectedEvent, setSelectedEvent] = useState<ManagedOrganizerEvent | null>(null);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <View
          className="border-b border-gray-200 bg-white px-5 pb-4"
          style={{ paddingTop: stableModalTopInset + 10 }}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                if (selectedEvent) {
                  setSelectedEvent(null);
                  return;
                }

                onClose();
              }}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
            >
              <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
            </Pressable>
            <View className="items-end">
              <Text className="font-heading text-[24px] font-extrabold text-ink">
                {selectedEvent ? 'Event' : 'My events'}
              </Text>
              <Text className="text-[11px] font-semibold text-muted">
                {selectedEvent ? selectedEvent.venueName : `${events.length} submitted`}
              </Text>
            </View>
          </View>
        </View>

        {selectedEvent ? (
          <HistoryEventDetail event={selectedEvent} organizerStatus={selectedEvent.reviewStatus} />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ gap: 12, padding: 20, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {events.length === 0 ? (
              <HistoryEmptyState
                body="Events you submit for review will appear here with their approval status."
                title="No organizer events yet"
              />
            ) : (
              events.map((event) => (
                <OrganizerEventRow
                  event={event}
                  key={`${event.id}-full`}
                  onPress={() => setSelectedEvent(event)}
                />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function HistoryEmptyState({ body, title }: { body: string; title: string }) {
  return (
    <View className="rounded-3xl border border-primary/10 bg-primary/5 p-5">
      <Text className="font-ui text-[15px] font-extrabold text-ink">{title}</Text>
      <Text className="mt-1 text-[13px] leading-5 text-muted">{body}</Text>
    </View>
  );
}

function EventHistoryRow({
  event,
  onPress,
  status,
}: {
  event: CultureEvent;
  onPress?: () => void;
  status: UserEventStatus;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-gray-200 bg-white active:opacity-85"
    >
      <View className="h-[126px] bg-gray-200">
        <BrandImage
          source={getEventImageSource(event)}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View className="p-4">
        <View className="mb-2 flex-row items-center justify-between gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {event.date}
          </Text>
          <UserEventStatusPill status={status} />
        </View>
        <Text className="font-ui text-[16px] font-extrabold text-ink" numberOfLines={2}>
          {event.title}
        </Text>
        <Text className="mt-1 text-[13px] font-medium text-muted" numberOfLines={1}>
          {event.venueName} · {event.time}
        </Text>
      </View>
    </Pressable>
  );
}

function OrganizerEventRow({
  event,
  onPress,
}: {
  event: ManagedOrganizerEvent;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-gray-200 bg-white active:opacity-85"
    >
      <View className="h-[126px] bg-gray-200">
        <BrandImage
          source={getEventImageSource(event)}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View className="p-4">
        <View className="mb-2 flex-row items-center justify-between gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {event.date}
          </Text>
          <OrganizerEventStatusPill status={event.reviewStatus} />
        </View>
        <Text className="font-ui text-[16px] font-extrabold text-ink" numberOfLines={2}>
          {event.title}
        </Text>
        <Text className="mt-1 text-[13px] font-medium text-muted" numberOfLines={1}>
          {event.venueName} · {event.time}
        </Text>
      </View>
    </Pressable>
  );
}

function HistoryEventDetail({
  event,
  organizerStatus,
  status,
}: {
  event: CultureEvent;
  organizerStatus?: OrganizerEventStatus;
  status?: UserEventStatus;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 36 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="h-[260px] bg-gray-200">
        <BrandImage
          source={getEventImageSource(event)}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
          withTextGradient
        >
          <View className="absolute bottom-5 left-5 right-5">
            <View className="mb-2 flex-row flex-wrap items-center gap-2">
              <View className="rounded-full bg-white/90 px-2.5 py-1">
                <Text className="text-[11px] font-bold text-primary">
                  {eventCategoryLabels[event.category]}
                </Text>
              </View>
              {status && <UserEventStatusPill status={status} />}
              {organizerStatus && <OrganizerEventStatusPill status={organizerStatus} />}
            </View>
            <Text className="font-ui text-[28px] font-extrabold leading-8 text-white">
              {event.title}
            </Text>
          </View>
        </BrandImage>
      </View>

      <View className="px-5 pt-5">
        <View className="mb-5 gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <HistoryInfoRow icon={<MapPin size={17} color="#7C3AED" />} label={event.venueName} />
          <HistoryInfoRow
            icon={<Clock size={17} color="#7C3AED" />}
            label={`${event.date}, ${event.time}`}
          />
          <View className="rounded-2xl bg-primary/5 px-3 py-2.5">
            <Text className="text-[13px] font-semibold text-primary">
              +{event.xpBonus} XP after confirmed attendance
            </Text>
          </View>
        </View>

        <Text className="mb-2 font-ui text-[16px] font-extrabold text-ink">About this event</Text>
        <Text className="mb-5 text-[14px] leading-5 text-ink/75">{event.description}</Text>

        <View className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted">
            Organiser
          </Text>
          <Text className="mt-1 text-[15px] font-bold text-ink">{event.organizerName}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function HistoryInfoRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">{icon}</View>
      <Text className="flex-1 text-[13px] font-medium text-ink/75">{label}</Text>
    </View>
  );
}

function getEventImageSource(event: CultureEvent) {
  if (event.imageUrl) {
    return { uri: event.imageUrl };
  }

  if (event.organizerImage === 'cafe') {
    return require('@/assets/images/culture/venue-cafe.jpg');
  }
  if (event.organizerImage === 'theater') {
    return require('@/assets/images/culture/venue-theater.jpg');
  }

  return require('@/assets/images/culture/venue-museum.jpg');
}

function UserEventStatusPill({ status }: { status: UserEventStatus }) {
  const label = status === 'attended' ? 'Attended' : status === 'going' ? 'Going' : 'Interested';

  return (
    <View className="rounded-full bg-primary/10 px-2.5 py-1">
      <Text className="text-[10px] font-extrabold text-primary">{label}</Text>
    </View>
  );
}

function OrganizerEventStatusPill({ status }: { status: OrganizerEventStatus }) {
  const statusStyle = getOrganizerEventStatusStyle(status);

  return (
    <View className={`rounded-full px-2.5 py-1 ${statusStyle.container}`}>
      <Text className={`text-[10px] font-extrabold ${statusStyle.text}`}>{statusStyle.label}</Text>
    </View>
  );
}

function getOrganizerEventStatusStyle(status: OrganizerEventStatus) {
  if (status === 'approved') {
    return { container: 'bg-primary/10', label: 'Approved', text: 'text-primary' };
  }
  if (status === 'rejected') {
    return { container: 'bg-destructive/10', label: 'Rejected', text: 'text-destructive' };
  }
  if (status === 'cancelled') {
    return { container: 'bg-gray-100', label: 'Cancelled', text: 'text-muted' };
  }
  if (status === 'draft') {
    return { container: 'bg-gray-100', label: 'Draft', text: 'text-muted' };
  }

  return { container: 'bg-secondary/12', label: 'Pending', text: 'text-secondary' };
}

type RewardsSectionProps = {
  cityName: string;
  error?: string | null;
  onSelectReward: (reward: RewardPartner) => void;
  rewards: RewardPartner[];
};

export function RewardsSection({ cityName, error, onSelectReward, rewards }: RewardsSectionProps) {
  return (
    <View className="px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Rewards</Text>
        <Text className="text-[11px] font-semibold text-primary">{cityName}</Text>
      </View>

      {error && (
        <View className="mb-3 rounded-2xl border border-secondary/20 bg-secondary/10 p-3">
          <Text className="text-[12px] leading-4 text-muted">
            Rewards could not load yet. Apply the latest Supabase migration if you have not done it.
          </Text>
        </View>
      )}

      {!error && rewards.length === 0 && (
        <View className="rounded-3xl border border-gray-200 bg-white p-5">
          <Text className="font-heading text-[20px] font-extrabold text-ink">
            No approved rewards yet
          </Text>
          <Text className="mt-2 text-[13px] leading-5 text-muted">
            Approved partner rewards for {cityName} will appear here after CultureQuest review.
          </Text>
        </View>
      )}

      <View className="gap-3">
        {rewards.map((reward, index) => (
          <RewardPartnerRow
            key={reward.id}
            reward={reward}
            onPress={() => onSelectReward(reward)}
            variantIndex={index}
          />
        ))}
      </View>
    </View>
  );
}
