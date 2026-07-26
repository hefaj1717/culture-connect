import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  LogOut,
  MapPin,
  Settings,
  Users,
  UserRound,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandImage } from '@/components/brand-image';
import { PassportBadge, type AchievementBadge } from '@/components/profile/badges';
import { OrganizerStatusCard, OrganizerVerifiedBadge } from '@/components/profile/organizer-status';
import { RankAvatar } from '@/components/profile/profile-avatar';
import { RewardPartnerRow } from '@/components/profile/reward-partner-row';
import { eventCategoryLabels, type CultureEvent, type RewardPartner } from '@/data/culture';
import { getEventEngagement } from '@/lib/event-engagement';
import type { UserEventHistoryItem, UserEventStatus } from '@/lib/event-history';
import type { ManagedOrganizerEvent, OrganizerEventStatus } from '@/lib/organizer-events';

type OrganizerStatus = 'none' | 'pending' | 'approved' | 'rejected';
type ActivityHistoryFilter = 'all' | UserEventStatus;
type OrganizerHistoryFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'past' | 'cancelled';

const activityHistoryFilters: { key: ActivityHistoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'interested', label: 'Interested' },
  { key: 'going', label: 'Going' },
  { key: 'attended', label: 'Attended' },
];

const organizerHistoryFilters: { key: OrganizerHistoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

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
  onOpenSettings: () => void;
  organizerStatus: OrganizerStatus;
  userXp: number;
};

export function ProfileRankCard({
  avatarInitials,
  avatarUrl,
  cityLabel,
  fullName,
  levelProgress,
  onOpenSettings,
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
          <View className="mb-1 flex-row items-start justify-between gap-2">
            <Text className="font-heading text-[31px] font-extrabold leading-[35px] text-ink">
              {fullName}
            </Text>
            <Pressable
              accessibilityLabel="Open profile settings"
              onPress={onOpenSettings}
              className="h-10 w-10 items-center justify-center rounded-full bg-canvas active:opacity-80"
            >
              <Settings size={19} color="#756F7B" strokeWidth={2.4} />
            </Pressable>
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

type AccountActionsModalProps = {
  onClose: () => void;
  onEdit: () => void;
  onSignOut: () => void;
  visible: boolean;
};

export function AccountActionsModal({
  onClose,
  onEdit,
  onSignOut,
  visible,
}: AccountActionsModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-ink/25 px-5 pb-8" onPress={onClose}>
        <Pressable
          className="rounded-[28px] border border-gray-200 bg-white p-3"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="mb-2 h-1.5 w-10 self-center rounded-full bg-gray-200" />
          <Pressable
            onPress={() => {
              onClose();
              onEdit();
            }}
            className="flex-row items-center gap-3 rounded-2xl px-3 py-4 active:bg-primary/5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserRound size={18} color="#7C3AED" strokeWidth={2.4} />
            </View>
            <View className="flex-1">
              <Text className="font-ui text-[15px] font-extrabold text-ink">Edit profile</Text>
              <Text className="mt-0.5 text-[12px] text-muted">Name, city, and profile photo</Text>
            </View>
            <ChevronRight size={17} color="#756F7B" strokeWidth={2.4} />
          </Pressable>

          <View className="mx-3 h-px bg-gray-100" />

          <Pressable
            onPress={() => {
              onClose();
              onSignOut();
            }}
            className="flex-row items-center gap-3 rounded-2xl px-3 py-4 active:bg-destructive/5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <LogOut size={18} color="#756F7B" strokeWidth={2.4} />
            </View>
            <View className="flex-1">
              <Text className="font-ui text-[15px] font-extrabold text-ink">Log out</Text>
              <Text className="mt-0.5 text-[12px] text-muted">
                Leave this account on this device
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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

type AdminToolsSectionProps = {
  onCreateQuest: () => void;
  onOpenReview: () => void;
  pendingCount: number;
};

export function AdminToolsSection({
  onCreateQuest,
  onOpenReview,
  pendingCount,
}: AdminToolsSectionProps) {
  return (
    <View className="mb-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Admin Tools</Text>
      </View>
      <View className="rounded-3xl border border-primary/10 bg-ink p-4">
        <View className="mb-1 flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 font-heading text-[20px] font-extrabold text-white">
            CultureQuest control room
          </Text>
          <View className="rounded-full bg-white/10 px-3 py-1">
            <Text className="text-[11px] font-extrabold text-white">{pendingCount} pending</Text>
          </View>
        </View>
        <Text className="mt-1 text-[13px] leading-5 text-white/70">
          Review organizer submissions and create official city trails.
        </Text>
        <View className="mt-4 gap-2">
          <Pressable
            onPress={onOpenReview}
            className="h-11 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
          >
            <Text className="text-[14px] font-semibold text-white">Review content</Text>
          </Pressable>
          <Pressable
            onPress={onCreateQuest}
            className="h-11 flex-row items-center justify-center rounded-xl border border-white/15 bg-white/10 active:opacity-85"
          >
            <Text className="text-[14px] font-semibold text-white">Create quest</Text>
          </Pressable>
        </View>
      </View>
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

function useHistorySwipeBack({
  onSwipeBack,
  visible,
}: {
  onSwipeBack: () => void;
  visible: boolean;
}) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = 0;
    }
  }, [translateX, visible]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-999, 18])
        .failOffsetY([-35, 35])
        .onUpdate((event) => {
          translateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldClose = translateX.value > width * 0.28 || event.velocityX > 700;

          if (shouldClose) {
            translateX.value = withTiming(width, { duration: 180 }, (finished) => {
              if (finished) {
                translateX.value = 0;
                runOnJS(onSwipeBack)();
              }
            });
            return;
          }

          translateX.value = withTiming(0, { duration: 180 });
        }),
    [onSwipeBack, translateX, width],
  );

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const closeWithAnimation = useCallback(() => {
    translateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        translateX.value = 0;
        runOnJS(onSwipeBack)();
      }
    });
  }, [onSwipeBack, translateX, width]);

  return { closeWithAnimation, gesture, swipeStyle };
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
  const [activityFilter, setActivityFilter] = useState<ActivityHistoryFilter>('all');
  const selectedHistoryItem = selectedEvent
    ? history.find((item) => item.event.id === selectedEvent.id)
    : null;
  const filteredHistory =
    activityFilter === 'all' ? history : history.filter((item) => item.status === activityFilter);
  const handleSwipeBack = useCallback(() => {
    if (selectedEvent) {
      setSelectedEvent(null);
      return;
    }

    onClose();
  }, [onClose, selectedEvent]);
  const { closeWithAnimation, gesture, swipeStyle } = useHistorySwipeBack({
    onSwipeBack: handleSwipeBack,
    visible,
  });

  return (
    <Modal animationType="slide" onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            {selectedEvent ? (
              <HistoryEventDetail
                event={selectedEvent}
                onBack={() => setSelectedEvent(null)}
                stableModalTopInset={stableModalTopInset}
                status={selectedHistoryItem?.status}
              />
            ) : (
              <>
                <View
                  className="bg-white px-5 pb-2"
                  style={{ paddingTop: stableModalTopInset + 6 }}
                >
                  <Pressable
                    onPress={closeWithAnimation}
                    className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  >
                    <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                  </Pressable>
                </View>
                <HistoryFilterBar
                  activeKey={activityFilter}
                  filters={activityHistoryFilters}
                  onSelect={setActivityFilter}
                />

                <ScrollView
                  className="flex-1"
                  contentContainerStyle={{
                    gap: 12,
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: 36,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  {history.length === 0 ? (
                    <HistoryEmptyState
                      body="Events you mark as Interested, Going, or Attended will appear here."
                      title="No saved events yet"
                    />
                  ) : filteredHistory.length === 0 ? (
                    <HistoryEmptyState
                      body={`No ${getActivityFilterEmptyLabel(activityFilter)} events in your history yet.`}
                      title="Nothing here yet"
                    />
                  ) : (
                    filteredHistory.map((item) => (
                      <EventHistoryRow
                        event={item.event}
                        key={`${item.event.id}-${item.status}-full`}
                        onPress={() => setSelectedEvent(item.event)}
                        status={item.status}
                      />
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
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
  const [organizerFilter, setOrganizerFilter] = useState<OrganizerHistoryFilter>('all');
  const filteredEvents =
    organizerFilter === 'all'
      ? events
      : events.filter((event) =>
          organizerFilter === 'past'
            ? event.reviewStatus === 'approved' && isPastEventDateLabel(event.date)
            : event.reviewStatus === organizerFilter,
        );
  const handleSwipeBack = useCallback(() => {
    if (selectedEvent) {
      setSelectedEvent(null);
      return;
    }

    onClose();
  }, [onClose, selectedEvent]);
  const { closeWithAnimation, gesture, swipeStyle } = useHistorySwipeBack({
    onSwipeBack: handleSwipeBack,
    visible,
  });

  return (
    <Modal animationType="slide" onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            {selectedEvent ? (
              <HistoryEventDetail
                event={selectedEvent}
                onBack={() => setSelectedEvent(null)}
                organizerStatus={selectedEvent.reviewStatus}
                stableModalTopInset={stableModalTopInset}
              />
            ) : (
              <>
                <View
                  className="bg-white px-5 pb-2"
                  style={{ paddingTop: stableModalTopInset + 6 }}
                >
                  <Pressable
                    onPress={closeWithAnimation}
                    className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  >
                    <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                  </Pressable>
                </View>
                <HistoryFilterBar
                  activeKey={organizerFilter}
                  filters={organizerHistoryFilters}
                  onSelect={setOrganizerFilter}
                />

                <ScrollView
                  className="flex-1"
                  contentContainerStyle={{
                    gap: 12,
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: 36,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  {events.length === 0 ? (
                    <HistoryEmptyState
                      body="Events you submit for review will appear here with their approval status."
                      title="No organizer events yet"
                    />
                  ) : filteredEvents.length === 0 ? (
                    <HistoryEmptyState
                      body={`No ${getOrganizerFilterEmptyLabel(organizerFilter)} events in your organizer history.`}
                      title="Nothing here yet"
                    />
                  ) : (
                    filteredEvents.map((event) => (
                      <OrganizerEventRow
                        event={event}
                        key={`${event.id}-full`}
                        onPress={() => setSelectedEvent(event)}
                      />
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
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

function HistoryFilterBar<T extends string>({
  activeKey,
  filters,
  onSelect,
}: {
  activeKey: T;
  filters: { key: T; label: string }[];
  onSelect: (key: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, height: 52, maxHeight: 52 }}
      contentContainerStyle={{
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 8,
      }}
    >
      {filters.map((filter) => {
        const active = activeKey === filter.key;

        return (
          <Pressable
            key={filter.key}
            onPress={() => onSelect(filter.key)}
            className={`h-9 justify-center rounded-full px-4 ${
              active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'
            }`}
          >
            <Text className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function getActivityFilterEmptyLabel(filter: ActivityHistoryFilter) {
  if (filter === 'going') return 'going';
  if (filter === 'attended') return 'attended';
  if (filter === 'interested') return 'interested';
  return 'saved';
}

function getOrganizerFilterEmptyLabel(filter: OrganizerHistoryFilter) {
  if (filter === 'cancelled') return 'cancelled';
  if (filter === 'approved') return 'approved';
  if (filter === 'rejected') return 'rejected';
  if (filter === 'pending') return 'pending';
  if (filter === 'past') return 'past';
  return 'submitted';
}

function isPastEventDateLabel(dateLabel: string) {
  const match = dateLabel.match(/\b([A-Z][a-z]{2,8})\s+(\d{1,2})\b/);
  if (!match) return false;

  const monthIndex = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ].indexOf(match[1].slice(0, 3).toLowerCase());

  if (monthIndex < 0) return false;

  const today = new Date();
  const eventDate = new Date(today.getFullYear(), monthIndex, Number(match[2]), 23, 59, 59);

  return eventDate.getTime() < today.getTime();
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
        <HistoryEngagementStats event={event} status={status} />
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
        <HistoryEngagementStats event={event} />
      </View>
    </Pressable>
  );
}

function HistoryEventDetail({
  event,
  onBack,
  organizerStatus,
  stableModalTopInset,
  status,
}: {
  event: CultureEvent;
  onBack: () => void;
  organizerStatus?: OrganizerEventStatus;
  stableModalTopInset: number;
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
        <Pressable
          onPress={onBack}
          className="absolute left-5 h-10 w-10 items-center justify-center rounded-full bg-black/35 active:opacity-80"
          style={{ top: stableModalTopInset + 6 }}
        >
          <ArrowLeft size={21} color="#FFFFFF" strokeWidth={2.6} />
        </Pressable>
      </View>

      <View className="px-5 pt-5">
        <View className="mb-5 gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <HistoryInfoRow icon={<MapPin size={17} color="#7C3AED" />} label={event.venueName} />
          <HistoryInfoRow
            icon={<Clock size={17} color="#7C3AED" />}
            label={`${event.date}, ${event.time}`}
          />
          <View className="flex-row gap-2">
            <HistoryStatPill
              icon={<Users size={15} color="#7C3AED" strokeWidth={2.4} />}
              label="Interested"
              value={getEventEngagement(event, status).interested}
            />
            <HistoryStatPill
              icon={<CheckCircle2 size={15} color="#7C3AED" strokeWidth={2.4} />}
              label="Attended"
              value={getEventEngagement(event, status).attended}
            />
          </View>
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

function HistoryEngagementStats({
  event,
  status,
}: {
  event: CultureEvent;
  status?: UserEventStatus;
}) {
  const engagement = getEventEngagement(event, status);

  return (
    <View className="mt-3 flex-row gap-2">
      <HistoryStatPill
        icon={<Users size={14} color="#7C3AED" strokeWidth={2.4} />}
        label="Interested"
        value={engagement.interested}
      />
      <HistoryStatPill
        icon={<CheckCircle2 size={14} color="#7C3AED" strokeWidth={2.4} />}
        label="Attended"
        value={engagement.attended}
      />
    </View>
  );
}

function HistoryStatPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5 rounded-2xl bg-primary/5 px-2.5 py-2">
      {icon}
      <Text className="min-w-0 flex-1 text-[11px] font-semibold text-ink/70" numberOfLines={1}>
        {value.toLocaleString()} {label}
      </Text>
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
  userXp: number;
};

export function RewardsSection({
  cityName,
  error,
  onSelectReward,
  rewards,
  userXp,
}: RewardsSectionProps) {
  return (
    <View className="mb-6 px-5">
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
            userXp={userXp}
            variantIndex={index}
          />
        ))}
      </View>
    </View>
  );
}
