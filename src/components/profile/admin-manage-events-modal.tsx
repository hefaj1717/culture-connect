import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Gift,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardListSkeleton, EmptyState, ErrorState } from '@/components/async-state';
import { ScreenHeader } from '@/components/screen-header';
import { BrandImage } from '@/components/brand-image';
import {
  DatePickerModal,
  TimePickerModal,
  formatEventDate,
  formatTimeUnit,
  startOfMonth,
} from '@/components/profile/date-time-pickers';
import { OrganizerProfileModal } from '@/components/organizer-profile-modal';
import { CardStyles, Colors } from '@/constants/theme';
import {
  eventCategories,
  eventCategoryLabels,
  getCultureCityData,
  type EventCategory,
  type RewardPartner,
} from '@/data/culture';
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import type {
  AdminManagedEvent,
  AdminManagedReward,
  RewardPartnerStatus,
} from '@/lib/admin-moderation';
import type { OrganizerEventStatus } from '@/lib/organizer-events';
import { organizerProfileFromEvent, type OrganizerProfile } from '@/lib/organizer-profiles';
import {
  formatRewardAvailability,
  getIsoDaysInDateRange,
  normalizeRewardDateInput,
  normalizeRewardTimeInput,
  validateRewardAvailability,
} from '@/lib/reward-availability';

type ManageContentTab = 'events' | 'rewards';
type AdminEventFilter = 'all' | OrganizerEventStatus | 'past';
type AdminRewardFilter = 'all' | RewardPartnerStatus;

const adminEventFilters: { key: AdminEventFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'past', label: 'Past' },
];

const adminRewardFilters: { key: AdminRewardFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'archived', label: 'Archived' },
];

const editableStatuses: OrganizerEventStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];
const editableRewardStatuses: RewardPartnerStatus[] = [
  'pending',
  'approved',
  'rejected',
  'archived',
];

const editableCategories: EventCategory[] = [...eventCategories];
const rewardCategoryLabels: Record<RewardPartner['category'], string> = {
  bar: 'Bar',
  bookstore: 'Bookstore',
  cafe: 'Cafe',
  restaurant: 'Restaurant',
  shop: 'Shop',
};
const editableRewardCategories = Object.keys(rewardCategoryLabels) as RewardPartner['category'][];

type AdminManageEventsModalProps = {
  error: string | null;
  events: AdminManagedEvent[];
  loading: boolean;
  onClose: () => void;
  onDeleteEvent: (id: string) => void;
  onDeleteReward: (id: string) => void;
  onRefresh: () => void;
  onSaveEvent: (
    eventId: string,
    input: {
      category: EventCategory;
      date: string;
      description: string;
      endTime?: string | null;
      status: OrganizerEventStatus;
      time: string;
      title: string;
      venueAddress?: string | null;
      venueName: string;
      xpBonus: number;
    },
  ) => Promise<{ success: boolean }>;
  onSaveReward: (
    rewardId: string,
    input: {
      availableDays: number[];
      availableEndTime: string;
      availableFrom: string;
      availableStartTime: string;
      availableUntil?: string | null;
      category: RewardPartner['category'];
      description: string;
      placeAddress: string;
      placeName: string;
      status: RewardPartnerStatus;
      title: string;
      xpCost: number;
    },
  ) => Promise<{ success: boolean }>;
  rewards: AdminManagedReward[];
  savingEventId: string | null;
  savingRewardId: string | null;
  stableModalTopInset: number;
  visible: boolean;
};

export function AdminManageEventsModal({
  error,
  events,
  loading,
  onClose,
  onDeleteEvent,
  onDeleteReward,
  onRefresh,
  onSaveEvent,
  onSaveReward,
  rewards,
  savingEventId,
  savingRewardId,
  stableModalTopInset,
  visible,
}: AdminManageEventsModalProps) {
  const [activeTab, setActiveTab] = useState<ManageContentTab>('events');
  const [activeFilter, setActiveFilter] = useState<AdminEventFilter>('all');
  const [activeRewardFilter, setActiveRewardFilter] = useState<AdminRewardFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AdminManagedEvent | null>(null);
  const [selectedReward, setSelectedReward] = useState<AdminManagedReward | null>(null);
  const [selectedOrganizerProfile, setSelectedOrganizerProfile] = useState<OrganizerProfile | null>(
    null,
  );
  const visibleSelectedEvent = selectedEvent
    ? (events.find((event) => event.databaseId === selectedEvent.databaseId) ?? selectedEvent)
    : null;
  const visibleSelectedReward = selectedReward
    ? (rewards.find((reward) => reward.databaseId === selectedReward.databaseId) ?? selectedReward)
    : null;
  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      const matchesFilter =
        activeFilter === 'all'
          ? true
          : activeFilter === 'past'
            ? event.reviewStatus === 'approved' && isPastEventDateLabel(event.date)
            : event.reviewStatus === activeFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        event.title.toLowerCase().includes(normalizedSearch) ||
        event.venueName.toLowerCase().includes(normalizedSearch) ||
        event.organizerName.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, events, searchQuery]);
  const filteredRewards = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return rewards.filter((reward) => {
      const matchesFilter =
        activeRewardFilter === 'all' ? true : reward.reviewStatus === activeRewardFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        reward.title.toLowerCase().includes(normalizedSearch) ||
        reward.placeName.toLowerCase().includes(normalizedSearch) ||
        reward.organizerName.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeRewardFilter, rewards, searchQuery]);

  useEffect(() => {
    if (visible) {
      setSelectedEvent(null);
      setSelectedReward(null);
      setSelectedOrganizerProfile(null);
    }
  }, [visible]);

  const hasSelectedContent = !!visibleSelectedEvent || !!visibleSelectedReward;
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    enabled: !hasSelectedContent,
    onSwipeBack: onClose,
    resetKey: `${activeTab}-${activeTab === 'events' ? activeFilter : activeRewardFilter}`,
    visible,
  });
  const {
    closeWithAnimation: closeDetailWithAnimation,
    gesture: detailGesture,
    swipeStyle: detailSwipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => {
      setSelectedEvent(null);
      setSelectedReward(null);
    },
    resetKey: selectedEvent?.databaseId ?? selectedReward?.databaseId ?? null,
    visible: visible && hasSelectedContent,
  });

  function openOrganizerProfile(event: AdminManagedEvent) {
    const profile = organizerProfileFromEvent(event);
    if (profile) {
      setSelectedOrganizerProfile(profile);
    }
  }

  function openRewardOrganizerProfile(reward: AdminManagedReward) {
    setSelectedOrganizerProfile({
      avatarUrl: reward.organizerAvatarUrl ?? null,
      bio: reward.organizerBio?.trim() || 'Verified CultureQuest organiser.',
      cityId: reward.organizerCityId,
      id: reward.organizerId,
      locationAddress: reward.organizerLocationAddress ?? null,
      locationCoordinates: reward.organizerLocationCoordinates ?? null,
      locationName: reward.organizerLocationName ?? null,
      name: reward.organizerName,
    });
  }

  return (
    <Modal
      animationType="slide"
      transparent
      onRequestClose={hasSelectedContent ? closeDetailWithAnimation : closeWithAnimation}
      visible={visible}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-canvas" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
            <View
              className="flex-row items-center justify-between bg-canvas px-5 pb-3"
              style={{ paddingTop: stableModalTopInset + 6 }}
            >
              <Pressable
                onPress={closeWithAnimation}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                accessibilityLabel="Close manage events"
                accessibilityRole="button"
              >
                <ArrowLeft size={21} color="#6B818C" strokeWidth={2.6} />
              </Pressable>
              <Pressable
                onPress={onRefresh}
                className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 active:opacity-80"
                accessibilityLabel="Refresh events"
                accessibilityRole="button"
              >
                <RefreshCw size={18} color={Colors.light.primary} strokeWidth={2.5} />
              </Pressable>
            </View>

            <View className="px-5">
              <ScreenHeader
                subtitle="Edit events and rewards, change status, update XP, or archive content."
                title="Manage content"
              />
            </View>

            <AdminContentTabBar
              activeTab={activeTab}
              eventCount={events.length}
              onSelect={setActiveTab}
              rewardCount={rewards.length}
            />

            {activeTab === 'events' ? (
              <AdminEventFilterBar
                activeKey={activeFilter}
                events={events}
                onSelect={setActiveFilter}
              />
            ) : (
              <AdminRewardFilterBar
                activeKey={activeRewardFilter}
                onSelect={setActiveRewardFilter}
                rewards={rewards}
              />
            )}

            <View className="px-5 pb-2">
              <View className="h-12 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4">
                <Search size={17} color="#6B818C" strokeWidth={2.4} />
                <TextInput
                  autoCorrect={false}
                  className="min-w-0 flex-1 text-[14px] font-semibold text-ink"
                  onChangeText={setSearchQuery}
                  placeholder={
                    activeTab === 'events'
                      ? 'Search title, venue, or organizer'
                      : 'Search reward, place, or organizer'
                  }
                  placeholderTextColor="#8B909A"
                  returnKeyType="search"
                  value={searchQuery}
                />
              </View>
            </View>

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
              {error && <ErrorState body={error} compact title="Content could not load" />}

              {loading ? (
                <CardListSkeleton count={3} />
              ) : activeTab === 'events' ? (
                events.length === 0 ? (
                  <EmptyState
                    body="Organizer events will appear here after they are submitted."
                    title="No events yet"
                  />
                ) : filteredEvents.length === 0 ? (
                  <EmptyState
                    body="No events match this status filter."
                    title="Nothing here"
                  />
                ) : (
                  filteredEvents.map((event) => (
                    <AdminManagedEventCard
                      event={event}
                      key={event.databaseId}
                      onOpenOrganizer={() => openOrganizerProfile(event)}
                      onPress={() => setSelectedEvent(event)}
                    />
                  ))
                )
              ) : rewards.length === 0 ? (
                <EmptyState
                  body="Organizer rewards will appear here after they are submitted."
                  title="No rewards yet"
                />
              ) : filteredRewards.length === 0 ? (
                <EmptyState
                  body="No rewards match this status filter."
                  title="Nothing here"
                />
              ) : (
                filteredRewards.map((reward) => (
                  <AdminManagedRewardCard
                    key={reward.databaseId}
                    onOpenOrganizer={() => openRewardOrganizerProfile(reward)}
                    onPress={() => setSelectedReward(reward)}
                    reward={reward}
                  />
                ))
              )}
            </ScrollView>

            {visibleSelectedEvent && (
              <GestureDetector gesture={detailGesture}>
                <Animated.View className="absolute inset-0 bg-white" style={detailSwipeStyle}>
                  <AdminEventEditor
                    event={visibleSelectedEvent}
                    onBack={closeDetailWithAnimation}
                    onDelete={() => onDeleteEvent(visibleSelectedEvent.databaseId)}
                    onOpenOrganizer={() => openOrganizerProfile(visibleSelectedEvent)}
                    onSave={onSaveEvent}
                    saving={savingEventId === visibleSelectedEvent.databaseId}
                    stableModalTopInset={stableModalTopInset}
                  />
                </Animated.View>
              </GestureDetector>
            )}

            {visibleSelectedReward && (
              <GestureDetector gesture={detailGesture}>
                <Animated.View className="absolute inset-0 bg-white" style={detailSwipeStyle}>
                  <AdminRewardEditor
                    onBack={closeDetailWithAnimation}
                    onDelete={() => onDeleteReward(visibleSelectedReward.databaseId)}
                    onOpenOrganizer={() => openRewardOrganizerProfile(visibleSelectedReward)}
                    onSave={onSaveReward}
                    reward={visibleSelectedReward}
                    saving={savingRewardId === visibleSelectedReward.databaseId}
                    stableModalTopInset={stableModalTopInset}
                  />
                </Animated.View>
              </GestureDetector>
            )}
          </SafeAreaView>
          <OrganizerProfileModal
            cityName={
              selectedOrganizerProfile
                ? getCultureCityData(selectedOrganizerProfile.cityId).name
                : 'CultureQuest'
            }
            events={events}
            onClose={() => setSelectedOrganizerProfile(null)}
            onOpenEvent={(event) => {
              setSelectedOrganizerProfile(null);
              const adminEvent =
                events.find((candidate) => candidate.id === event.id) ??
                events.find((candidate) => candidate.databaseId === event.id);
              if (adminEvent) {
                setSelectedReward(null);
                setSelectedEvent(adminEvent);
              }
            }}
            profile={selectedOrganizerProfile}
          />
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function AdminEventFilterBar({
  activeKey,
  events,
  onSelect,
}: {
  activeKey: AdminEventFilter;
  events: AdminManagedEvent[];
  onSelect: (key: AdminEventFilter) => void;
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
      {adminEventFilters.map((filter) => {
        const active = activeKey === filter.key;
        const count = countEventsForFilter(events, filter.key);

        return (
          <Pressable
            key={filter.key}
            onPress={() => onSelect(filter.key)}
            className={`h-9 flex-row items-center gap-2 rounded-full px-4 ${
              active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'
            }`}
          >
            <Text className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>
              {filter.label}
            </Text>
            <Text className={`text-[11px] font-extrabold ${active ? 'text-white' : 'text-muted'}`}>
              {count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function AdminContentTabBar({
  activeTab,
  eventCount,
  onSelect,
  rewardCount,
}: {
  activeTab: ManageContentTab;
  eventCount: number;
  onSelect: (tab: ManageContentTab) => void;
  rewardCount: number;
}) {
  return (
    <View className="mx-5 mb-3 flex-row rounded-2xl bg-gray-100 p-1">
      {[
        { count: eventCount, key: 'events' as const, label: 'Events' },
        { count: rewardCount, key: 'rewards' as const, label: 'Rewards' },
      ].map((tab) => {
        const active = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${
              active ? 'bg-white' : ''
            }`}
          >
            <Text className={`text-[13px] font-extrabold ${active ? 'text-ink' : 'text-muted'}`}>
              {tab.label}
            </Text>
            <Text
              className={`text-[12px] font-extrabold ${active ? 'text-primary' : 'text-muted'}`}
            >
              {tab.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AdminRewardFilterBar({
  activeKey,
  onSelect,
  rewards,
}: {
  activeKey: AdminRewardFilter;
  onSelect: (key: AdminRewardFilter) => void;
  rewards: AdminManagedReward[];
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
      {adminRewardFilters.map((filter) => {
        const active = activeKey === filter.key;
        const count = countRewardsForFilter(rewards, filter.key);

        return (
          <Pressable
            key={filter.key}
            onPress={() => onSelect(filter.key)}
            className={`h-9 flex-row items-center gap-2 rounded-full px-4 ${
              active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'
            }`}
          >
            <Text className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>
              {filter.label}
            </Text>
            <Text className={`text-[11px] font-extrabold ${active ? 'text-white' : 'text-muted'}`}>
              {count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function AdminManagedEventCard({
  event,
  onOpenOrganizer,
  onPress,
}: {
  event: AdminManagedEvent;
  onOpenOrganizer: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-primary/10 bg-white active:opacity-85"
      style={CardStyles.compact}
    >
      <View className="h-[126px] bg-gray-200">
        <BrandImage
          contentFit="cover"
          source={getEventImageSource(event)}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View className="p-4">
        <View className="mb-2 flex-row items-center justify-between gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {event.date}
          </Text>
          <View className="flex-row items-center gap-2">
            {event.changes.length > 0 && event.reviewStatus === 'pending' && (
              <View className="rounded-full bg-accent/20 px-2.5 py-1">
                <Text className="text-[10px] font-extrabold text-accentDeep">Edit pending</Text>
              </View>
            )}
            <AdminEventStatusPill status={event.reviewStatus} />
          </View>
        </View>
        <Text className="font-ui text-[16px] font-extrabold text-ink" numberOfLines={2}>
          {event.title}
        </Text>
        <Text className="mt-1 text-[13px] font-medium text-muted" numberOfLines={1}>
          {event.venueName} · {formatEventTimeRange(event)}
        </Text>
        <Pressable
          accessibilityLabel={`Open organizer profile for ${event.organizerName}`}
          accessibilityRole="button"
          className="mt-1 self-start active:opacity-75"
          onPress={(pressEvent) => {
            pressEvent.stopPropagation();
            onOpenOrganizer();
          }}
        >
          <Text className="text-[12px] font-semibold text-primary" numberOfLines={1}>
            Created by {event.organizerName}
          </Text>
        </Pressable>
        <View className="mt-3 flex-row gap-2">
          <MiniStat label="Interested" value={event.interestedCount ?? 0} />
          <MiniStat label="Going" value={event.goingCount ?? 0} />
          <MiniStat label="Attended" value={event.attendeeCount} />
          <MiniStat label="XP" value={event.xpBonus} />
        </View>
        {event.changes.length > 0 && (
          <Text className="mt-3 text-[11px] font-semibold text-accentDeep">
            {event.changes.length} requested {event.changes.length === 1 ? 'change' : 'changes'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function AdminManagedRewardCard({
  onOpenOrganizer,
  onPress,
  reward,
}: {
  onOpenOrganizer: () => void;
  onPress: () => void;
  reward: AdminManagedReward;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-primary/10 bg-white active:opacity-85"
      style={CardStyles.compact}
    >
      <View className="h-[126px] bg-gray-200">
        <BrandImage
          contentFit="cover"
          source={getRewardImageSource(reward)}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View className="p-4">
        <View className="mb-2 flex-row items-center justify-between gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {rewardCategoryLabels[reward.category]}
          </Text>
          <AdminRewardStatusPill status={reward.reviewStatus} />
        </View>
        <Text className="font-ui text-[16px] font-extrabold text-ink" numberOfLines={2}>
          {reward.title}
        </Text>
        <Text className="mt-1 text-[13px] font-medium text-muted" numberOfLines={1}>
          {reward.placeName} · {reward.xpCost.toLocaleString()} XP
        </Text>
        <Text className="mt-1 text-[12px] font-semibold text-muted" numberOfLines={1}>
          {formatRewardAvailability(reward)}
        </Text>
        <Pressable
          accessibilityLabel={`Open organizer profile for ${reward.organizerName}`}
          accessibilityRole="button"
          className="mt-1 self-start active:opacity-75"
          onPress={(pressEvent) => {
            pressEvent.stopPropagation();
            onOpenOrganizer();
          }}
        >
          <Text className="text-[12px] font-semibold text-primary" numberOfLines={1}>
            Created by {reward.organizerName}
          </Text>
        </Pressable>
        <Text className="mt-3 text-[12px] font-medium leading-4 text-muted" numberOfLines={2}>
          {reward.description}
        </Text>
      </View>
    </Pressable>
  );
}

function AdminEventEditor({
  event,
  onBack,
  onDelete,
  onOpenOrganizer,
  onSave,
  saving,
  stableModalTopInset,
}: {
  event: AdminManagedEvent;
  onBack: () => void;
  onDelete: () => void;
  onOpenOrganizer: () => void;
  onSave: AdminManageEventsModalProps['onSaveEvent'];
  saving: boolean;
  stableModalTopInset: number;
}) {
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [date, setDate] = useState(event.date);
  const [description, setDescription] = useState(event.description);
  const [endTime, setEndTime] = useState(event.endTime ?? '');
  const [status, setStatus] = useState<OrganizerEventStatus>(event.reviewStatus);
  const [time, setTime] = useState(event.time);
  const [title, setTitle] = useState(event.title);
  const [venueAddress, setVenueAddress] = useState(event.venueAddress ?? '');
  const [venueName, setVenueName] = useState(event.venueName);
  const [xpBonus, setXpBonus] = useState(String(event.xpBonus));

  useEffect(() => {
    setCategory(event.category);
    setDate(event.date);
    setDescription(event.description);
    setEndTime(event.endTime ?? '');
    setStatus(event.reviewStatus);
    setTime(event.time);
    setTitle(event.title);
    setVenueAddress(event.venueAddress ?? '');
    setVenueName(event.venueName);
    setXpBonus(String(event.xpBonus));
  }, [event]);

  async function save() {
    const parsedXp = Number.parseInt(xpBonus, 10);

    if (!title.trim() || !venueName.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Missing details', 'Title, venue, date, and start time are required.');
      return;
    }

    if (!Number.isFinite(parsedXp) || parsedXp < 0 || parsedXp > 5000) {
      Alert.alert('Invalid XP', 'XP must be a number between 0 and 5000.');
      return;
    }

    const result = await onSave(event.databaseId, {
      category,
      date: date.trim(),
      description: description.trim(),
      endTime: endTime.trim() || null,
      status,
      time: time.trim(),
      title: title.trim(),
      venueAddress: venueAddress.trim() || null,
      venueName: venueName.trim(),
      xpBonus: parsedXp,
    });

    if (result.success) {
      onBack();
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center justify-between bg-white px-5 pb-3"
        style={{ paddingTop: stableModalTopInset + 6 }}
      >
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
          accessibilityLabel="Back to event list"
          accessibilityRole="button"
        >
          <ArrowLeft size={21} color="#6B818C" strokeWidth={2.6} />
        </Pressable>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 overflow-hidden rounded-3xl bg-ink">
          <BrandImage
            contentFit="cover"
            source={getEventImageSource(event)}
            style={StyleSheet.absoluteFill}
            withTextGradient
          />
          <View className="min-h-[190px] justify-end p-5">
            <View className="mb-2 flex-row flex-wrap items-center gap-2">
              <AdminEventStatusPill status={event.reviewStatus} />
              <View className="rounded-full bg-white/90 px-2.5 py-1">
                <Text className="text-[10px] font-extrabold text-primary">{event.xpBonus} XP</Text>
              </View>
            </View>
            <Text className="font-heading text-[30px] font-extrabold leading-[34px] text-white">
              {event.title}
            </Text>
            <Pressable
              accessibilityLabel={`Open organizer profile for ${event.organizerName}`}
              accessibilityRole="button"
              className="mt-1 self-start active:opacity-75"
              onPress={onOpenOrganizer}
            >
              <Text className="text-[13px] font-semibold text-white/80">{event.organizerName}</Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 font-ui text-[15px] font-extrabold text-ink">Event details</Text>
          <AdminTextField label="Title" onChangeText={setTitle} value={title} />
          <AdminTextField label="Venue name" onChangeText={setVenueName} value={venueName} />
          <AdminTextField
            label="Venue address"
            onChangeText={setVenueAddress}
            value={venueAddress}
          />
          <View className="flex-row gap-3">
            <AdminTextField
              containerClassName="flex-1"
              label="Date"
              onChangeText={setDate}
              value={date}
            />
            <AdminTextField
              containerClassName="flex-1"
              label="Start"
              onChangeText={setTime}
              value={time}
            />
          </View>
          <AdminTextField label="End time" onChangeText={setEndTime} value={endTime} />
          <AdminTextField
            keyboardType="number-pad"
            label="XP awarded"
            onChangeText={setXpBonus}
            value={xpBonus}
          />
          <AdminTextField
            label="Description"
            multiline
            onChangeText={setDescription}
            value={description}
          />
        </View>

        {event.changes.length > 0 && (
          <ManageEventChanges
            changes={event.changes}
            requestedAt={event.reviewRequestedAt ?? event.createdAt}
          />
        )}

        <ChoiceSection label="Status">
          {editableStatuses.map((nextStatus) => (
            <ChoiceChip
              active={status === nextStatus}
              key={nextStatus}
              label={getStatusLabel(nextStatus)}
              onPress={() => setStatus(nextStatus)}
            />
          ))}
        </ChoiceSection>

        <ChoiceSection label="Category">
          {editableCategories.map((nextCategory) => (
            <ChoiceChip
              active={category === nextCategory}
              key={nextCategory}
              label={eventCategoryLabels[nextCategory]}
              onPress={() => setCategory(nextCategory)}
            />
          ))}
        </ChoiceSection>

        <View className="mb-4 rounded-3xl border border-primary/10 bg-primary/5 p-4">
          <InfoRow icon={<CalendarDays size={16} color={Colors.light.primary} />} text={date} />
          <InfoRow
            icon={<Clock size={16} color={Colors.light.primary} />}
            text={formatEventTimeRange({ ...event, time, endTime })}
          />
          <InfoRow icon={<MapPin size={16} color={Colors.light.primary} />} text={venueName} />
          <View className="mt-3 flex-row gap-2">
            <MiniStat label="Interested" value={event.interestedCount ?? 0} />
            <MiniStat label="Going" value={event.goingCount ?? 0} />
            <MiniStat label="Attended" value={event.attendeeCount} />
          </View>
        </View>

        <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 font-ui text-[15px] font-extrabold text-ink">Event audit</Text>
          <AuditRow label="Database ID" value={event.databaseId} />
          <AuditRow label="Organizer" onPress={onOpenOrganizer} value={event.organizerName} />
          <AuditRow label="Status" value={getStatusLabel(status)} />
          <AuditRow label="Created" value={formatAuditDate(event.createdAt)} />
          <View className="mt-3 flex-row gap-2">
            <MiniStat label="City" valueText={event.cityId} />
            <MiniStat label="XP" value={Number.parseInt(xpBonus, 10) || 0} />
          </View>
        </View>

        <Pressable
          disabled={saving}
          onPress={save}
          className="h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-85 disabled:opacity-60"
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Save size={17} color="white" strokeWidth={2.5} />
          )}
          <Text className="text-[15px] font-extrabold text-white">
            {saving ? 'Saving event...' : 'Save event'}
          </Text>
        </Pressable>

        <Pressable
          disabled={saving}
          onPress={onDelete}
          className="mt-3 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-destructive active:opacity-85 disabled:opacity-60"
        >
          <Trash2 size={17} color="white" strokeWidth={2.5} />
          <Text className="text-[15px] font-extrabold text-white">Delete event</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function AdminRewardEditor({
  onBack,
  onDelete,
  onOpenOrganizer,
  onSave,
  reward,
  saving,
  stableModalTopInset,
}: {
  onBack: () => void;
  onDelete: () => void;
  onOpenOrganizer: () => void;
  onSave: AdminManageEventsModalProps['onSaveReward'];
  reward: AdminManagedReward;
  saving: boolean;
  stableModalTopInset: number;
}) {
  const [category, setCategory] = useState<RewardPartner['category']>(reward.category);
  const [availableDays, setAvailableDays] = useState(reward.availableDays);
  const [availableEndTime, setAvailableEndTime] = useState(reward.availableEndTime);
  const [availableFrom, setAvailableFrom] = useState(reward.availableFrom ?? '');
  const [availableStartTime, setAvailableStartTime] = useState(reward.availableStartTime);
  const [availableUntil, setAvailableUntil] = useState(reward.availableUntil ?? '');
  const [description, setDescription] = useState(reward.description);
  const [placeAddress, setPlaceAddress] = useState(reward.placeAddress);
  const [placeName, setPlaceName] = useState(reward.placeName);
  const [status, setStatus] = useState<RewardPartnerStatus>(reward.reviewStatus);
  const [title, setTitle] = useState(reward.title);
  const [xpCost, setXpCost] = useState(String(reward.xpCost));
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'from' | 'until'>('from');
  const [calendarMonth, setCalendarMonth] = useState(
    startOfMonth(parseAdminRewardDate(reward.availableFrom ?? '') ?? new Date()),
  );
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'end' | 'start'>('start');
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

  useEffect(() => {
    setCategory(reward.category);
    setAvailableDays(reward.availableDays);
    setAvailableEndTime(reward.availableEndTime);
    setAvailableFrom(reward.availableFrom ?? '');
    setAvailableStartTime(reward.availableStartTime);
    setAvailableUntil(reward.availableUntil ?? '');
    setDescription(reward.description);
    setPlaceAddress(reward.placeAddress);
    setPlaceName(reward.placeName);
    setStatus(reward.reviewStatus);
    setTitle(reward.title);
    setXpCost(String(reward.xpCost));
  }, [reward]);

  function updateAvailableFrom(value: string) {
    const normalized = normalizeRewardDateInput(value);
    const nextUntil = availableUntil && availableUntil >= normalized ? availableUntil : normalized;

    setAvailableFrom(normalized);
    setAvailableUntil(nextUntil);
    setAvailableDays(getIsoDaysInDateRange(normalized, nextUntil));
  }

  function updateAvailableUntil(value: string) {
    const normalized = normalizeRewardDateInput(value);

    setAvailableUntil(normalized);
    setAvailableDays(getIsoDaysInDateRange(availableFrom, normalized));
  }

  function openDatePicker(target: 'from' | 'until') {
    const selectedDate =
      parseAdminRewardDate(target === 'from' ? availableFrom : availableUntil) ?? new Date();

    setCalendarMonth(startOfMonth(selectedDate));
    setDatePickerTarget(target);
    setDatePickerOpen(true);
  }

  function openTimePicker(target: 'end' | 'start') {
    const [hour, minute] = parseAdminRewardTime(
      target === 'start' ? availableStartTime : availableEndTime,
    );

    setSelectedHour(hour);
    setSelectedMinute(minute);
    setTimePickerTarget(target);
    setTimePickerOpen(true);
  }

  async function save() {
    const parsedXp = Number.parseInt(xpCost, 10);

    if (!title.trim() || !placeName.trim() || !placeAddress.trim()) {
      Alert.alert('Missing details', 'Reward title, place, and address are required.');
      return;
    }

    if (!Number.isFinite(parsedXp) || parsedXp <= 0 || parsedXp > 5000) {
      Alert.alert('Invalid XP', 'Reward XP cost must be between 1 and 5000.');
      return;
    }
    const availabilityError = validateRewardAvailability({
      availableDays,
      availableEndTime,
      availableFrom,
      availableStartTime,
      availableUntil,
    });
    if (availabilityError) {
      Alert.alert('Invalid availability', availabilityError);
      return;
    }

    const result = await onSave(reward.databaseId, {
      availableDays,
      availableEndTime,
      availableFrom,
      availableStartTime,
      availableUntil: availableUntil || null,
      category,
      description: description.trim(),
      placeAddress: placeAddress.trim(),
      placeName: placeName.trim(),
      status,
      title: title.trim(),
      xpCost: parsedXp,
    });

    if (result.success) {
      onBack();
    }
  }

  return (
    <View className="flex-1 bg-white">
      <View
        className="flex-row items-center justify-between bg-white px-5 pb-3"
        style={{ paddingTop: stableModalTopInset + 6 }}
      >
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
          accessibilityLabel="Back to reward list"
          accessibilityRole="button"
        >
          <ArrowLeft size={21} color="#6B818C" strokeWidth={2.6} />
        </Pressable>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 overflow-hidden rounded-3xl bg-ink">
          <BrandImage
            contentFit="cover"
            source={getRewardImageSource(reward)}
            style={StyleSheet.absoluteFill}
            withTextGradient
          />
          <View className="min-h-[190px] justify-end p-5">
            <View className="mb-2 flex-row flex-wrap items-center gap-2">
              <AdminRewardStatusPill status={reward.reviewStatus} />
              <View className="rounded-full bg-white/90 px-2.5 py-1">
                <Text className="text-[10px] font-extrabold text-primary">
                  {reward.xpCost.toLocaleString()} XP
                </Text>
              </View>
            </View>
            <Text className="font-heading text-[30px] font-extrabold leading-[34px] text-white">
              {reward.title}
            </Text>
            <Pressable
              accessibilityLabel={`Open organizer profile for ${reward.organizerName}`}
              accessibilityRole="button"
              className="mt-1 self-start active:opacity-75"
              onPress={onOpenOrganizer}
            >
              <Text className="text-[13px] font-semibold text-white/80">
                {reward.organizerName}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 font-ui text-[15px] font-extrabold text-ink">Reward details</Text>
          <AdminTextField label="Reward title" onChangeText={setTitle} value={title} />
          <AdminTextField label="Place name" onChangeText={setPlaceName} value={placeName} />
          <AdminTextField
            label="Place address"
            onChangeText={setPlaceAddress}
            value={placeAddress}
          />
          <AdminTextField
            keyboardType="number-pad"
            label="XP cost"
            onChangeText={(value) => setXpCost(value.replace(/\D/g, ''))}
            value={xpCost}
          />
          <AdminTextField
            label="Description"
            multiline
            onChangeText={setDescription}
            value={description}
          />
        </View>

        <ChoiceSection label="Status">
          {editableRewardStatuses.map((nextStatus) => (
            <ChoiceChip
              active={status === nextStatus}
              key={nextStatus}
              label={getRewardStatusLabel(nextStatus)}
              onPress={() => setStatus(nextStatus)}
            />
          ))}
        </ChoiceSection>

        <ChoiceSection label="Category">
          {editableRewardCategories.map((nextCategory) => (
            <ChoiceChip
              active={category === nextCategory}
              key={nextCategory}
              label={rewardCategoryLabels[nextCategory]}
              onPress={() => setCategory(nextCategory)}
            />
          ))}
        </ChoiceSection>

        <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
          <Text className="mb-1 font-ui text-[15px] font-extrabold text-ink">
            Redeem availability
          </Text>
          <Text className="mb-3 text-[12px] leading-4 text-muted">
            Controls when students can redeem this reward.
          </Text>
          <View className="mb-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-[12px] font-semibold text-muted">From date</Text>
              <Pressable
                accessibilityLabel="Choose reward start date"
                accessibilityRole="button"
                className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 active:border-primary"
                onPress={() => openDatePicker('from')}
              >
                <Text className="text-[14px] font-semibold text-ink">
                  {formatAdminRewardDateLabel(availableFrom)}
                </Text>
                <CalendarDays size={17} color={Colors.light.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
            <View className="flex-1">
              <Text className="mb-1.5 text-[12px] font-semibold text-muted">Until date</Text>
              <Pressable
                accessibilityLabel="Choose reward end date"
                accessibilityRole="button"
                className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 active:border-primary"
                onPress={() => openDatePicker('until')}
              >
                <Text className="text-[14px] font-semibold text-ink">
                  {formatAdminRewardDateLabel(availableUntil)}
                </Text>
                <CalendarDays size={17} color={Colors.light.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
          <View className="mb-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1.5 text-[12px] font-semibold text-muted">Starts</Text>
              <Pressable
                accessibilityLabel="Choose reward start time"
                accessibilityRole="button"
                className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 active:border-primary"
                onPress={() => openTimePicker('start')}
              >
                <Text className="text-[14px] font-semibold text-ink">{availableStartTime}</Text>
                <Clock size={17} color={Colors.light.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
            <View className="flex-1">
              <Text className="mb-1.5 text-[12px] font-semibold text-muted">Ends</Text>
              <Pressable
                accessibilityLabel="Choose reward end time"
                accessibilityRole="button"
                className="h-12 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 active:border-primary"
                onPress={() => openTimePicker('end')}
              >
                <Text className="text-[14px] font-semibold text-ink">{availableEndTime}</Text>
                <Clock size={17} color={Colors.light.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
          <Text className="text-[12px] font-semibold leading-4 text-primary">
            {formatRewardAvailability({
              ...reward,
              availableDays,
              availableEndTime,
              availableFrom,
              availableStartTime,
              availableUntil: availableUntil || null,
            })}
          </Text>
        </View>

        <View className="mb-4 rounded-3xl border border-primary/10 bg-primary/5 p-4">
          <InfoRow icon={<Gift size={16} color={Colors.light.primary} />} text={title} />
          <InfoRow icon={<MapPin size={16} color={Colors.light.primary} />} text={placeName} />
          <View className="mt-3 flex-row gap-2">
            <MiniStat label="City" valueText={reward.cityId} />
            <MiniStat label="XP cost" value={Number.parseInt(xpCost, 10) || 0} />
          </View>
        </View>

        <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 font-ui text-[15px] font-extrabold text-ink">Reward audit</Text>
          <AuditRow label="Database ID" value={reward.databaseId} />
          <AuditRow label="Organizer" onPress={onOpenOrganizer} value={reward.organizerName} />
          <AuditRow label="Status" value={getRewardStatusLabel(status)} />
          <AuditRow label="Created" value={formatAuditDate(reward.createdAt)} />
          <AuditRow label="Address" value={placeAddress} />
        </View>

        <Pressable
          disabled={saving}
          onPress={save}
          className="h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-85 disabled:opacity-60"
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Save size={17} color="white" strokeWidth={2.5} />
          )}
          <Text className="text-[15px] font-extrabold text-white">
            {saving ? 'Saving reward...' : 'Save reward'}
          </Text>
        </Pressable>

        <Pressable
          disabled={saving}
          onPress={onDelete}
          className="mt-3 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-destructive active:opacity-85 disabled:opacity-60"
        >
          <Trash2 size={17} color="white" strokeWidth={2.5} />
          <Text className="text-[15px] font-extrabold text-white">Archive reward</Text>
        </Pressable>
      </ScrollView>
      <DatePickerModal
        month={calendarMonth}
        onChangeMonth={setCalendarMonth}
        onClose={() => setDatePickerOpen(false)}
        onSelectDate={(date) => {
          const formattedDate = formatAdminRewardDateInput(date);

          if (datePickerTarget === 'from') {
            updateAvailableFrom(formattedDate);
          } else {
            updateAvailableUntil(formattedDate);
          }
          setDatePickerOpen(false);
        }}
        visible={datePickerOpen}
      />
      <TimePickerModal
        hour={selectedHour}
        minute={selectedMinute}
        onChangeHour={setSelectedHour}
        onChangeMinute={setSelectedMinute}
        onClose={() => setTimePickerOpen(false)}
        onConfirm={() => {
          const formattedTime = `${formatTimeUnit(selectedHour)}:${formatTimeUnit(selectedMinute)}`;

          if (timePickerTarget === 'start') {
            setAvailableStartTime(normalizeRewardTimeInput(formattedTime));
          } else {
            setAvailableEndTime(normalizeRewardTimeInput(formattedTime));
          }
          setTimePickerOpen(false);
        }}
        visible={timePickerOpen}
      />
    </View>
  );
}

function AdminTextField({
  containerClassName = '',
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  value,
}: {
  containerClassName?: string;
  keyboardType?: 'default' | 'number-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View className={`mb-3 ${containerClassName}`}>
      <Text className="mb-1.5 text-[12px] font-semibold text-muted">{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholderTextColor="#8B909A"
        style={multiline ? { minHeight: 104, textAlignVertical: 'top' } : undefined}
        value={value}
        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] font-medium text-ink"
      />
    </View>
  );
}

function parseAdminRewardDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAdminRewardDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatAdminRewardDateLabel(value: string) {
  const date = parseAdminRewardDate(value);

  return date ? formatEventDate(date) : 'Choose date';
}

function parseAdminRewardTime(value: string) {
  const [hourValue, minuteValue] = value.split(':');
  const hour = Number.parseInt(hourValue ?? '', 10);
  const minute = Number.parseInt(minuteValue ?? '', 10);

  return [
    Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 9,
    Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0,
  ] as const;
}

function ChoiceSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
      <Text className="mb-3 font-ui text-[15px] font-extrabold text-ink">{label}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function ManageEventChanges({
  changes,
  requestedAt,
}: {
  changes: AdminManagedEvent['changes'];
  requestedAt?: string | null;
}) {
  return (
    <View className="mb-4 rounded-3xl border border-accent/20 bg-accent/10 p-4">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-extrabold uppercase tracking-wide text-accentDeep">
            Organizer edit request
          </Text>
          <Text className="mt-1 text-[12px] font-semibold text-muted">
            Requested {formatAuditDate(requestedAt ?? '')}
          </Text>
        </View>
        <View className="rounded-full bg-white/75 px-2.5 py-1">
          <Text className="text-[10px] font-extrabold text-accentDeep">
            {changes.length} {changes.length === 1 ? 'field' : 'fields'}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        {changes.map((change) => (
          <View className="rounded-2xl bg-white/75 p-3" key={`${change.field}-${change.to}`}>
            <Text className="text-[12px] font-extrabold text-ink">{change.field}</Text>
            <Text className="mt-1 text-[11px] font-semibold leading-4 text-muted">
              Before: {change.from}
            </Text>
            <Text className="mt-1 text-[11px] font-extrabold leading-4 text-accentDeep">
              Now: {change.to}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3.5 py-2 ${
        active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'
      }`}
    >
      <Text className={`text-[12px] font-extrabold ${active ? 'text-white' : 'text-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function InfoRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View className="mt-2 flex-row items-center gap-2">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-white">{icon}</View>
      <Text className="min-w-0 flex-1 text-[12px] font-semibold text-muted" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function AuditRow({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress?: () => void;
  value: string;
}) {
  const content = (
    <>
      <Text className="text-[10px] font-extrabold uppercase tracking-wide text-muted">{label}</Text>
      <Text
        className={`mt-1 text-[12px] font-semibold ${onPress ? 'text-primary' : 'text-ink'}`}
        numberOfLines={2}
      >
        {value}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={`Open organizer profile for ${value}`}
        accessibilityRole="button"
        className="border-b border-gray-100 py-2 active:opacity-75"
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return <View className="border-b border-gray-100 py-2 last:border-b-0">{content}</View>;
}

function MiniStat({
  label,
  value,
  valueText,
}: {
  label: string;
  value?: number;
  valueText?: string;
}) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl bg-primary/5 px-3 py-2">
      <Text className="text-[13px] font-extrabold capitalize text-primary">
        {valueText ?? (value ?? 0).toLocaleString()}
      </Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </Text>
    </View>
  );
}

function AdminEventStatusPill({ status }: { status: OrganizerEventStatus }) {
  const statusStyle = getStatusStyle(status);

  return (
    <View className={`rounded-full px-2.5 py-1 ${statusStyle.container}`}>
      <Text className={`text-[10px] font-extrabold ${statusStyle.text}`}>{statusStyle.label}</Text>
    </View>
  );
}

function AdminRewardStatusPill({ status }: { status: RewardPartnerStatus }) {
  const statusStyle = getRewardStatusStyle(status);

  return (
    <View className={`rounded-full px-2.5 py-1 ${statusStyle.container}`}>
      <Text className={`text-[10px] font-extrabold ${statusStyle.text}`}>{statusStyle.label}</Text>
    </View>
  );
}

function countEventsForFilter(events: AdminManagedEvent[], filter: AdminEventFilter) {
  if (filter === 'all') return events.length;
  if (filter === 'past') {
    return events.filter(
      (event) => event.reviewStatus === 'approved' && isPastEventDateLabel(event.date),
    ).length;
  }

  return events.filter((event) => event.reviewStatus === filter).length;
}

function countRewardsForFilter(rewards: AdminManagedReward[], filter: AdminRewardFilter) {
  if (filter === 'all') return rewards.length;

  return rewards.filter((reward) => reward.reviewStatus === filter).length;
}

function getEventImageSource(event: AdminManagedEvent) {
  if (event.imageUrl) {
    return { uri: event.imageUrl };
  }
  if (event.organizerAvatarUrl) {
    return { uri: event.organizerAvatarUrl };
  }

  if (event.organizerImage === 'cafe') {
    return require('@/assets/images/culture/venue-cafe.jpg');
  }
  if (event.organizerImage === 'theater') {
    return require('@/assets/images/culture/venue-theater.jpg');
  }

  return require('@/assets/images/culture/venue-museum.jpg');
}

function getRewardImageSource(reward: AdminManagedReward) {
  if (reward.organizerAvatarUrl) {
    return { uri: reward.organizerAvatarUrl };
  }
  if (reward.imageUrl) {
    return { uri: reward.imageUrl };
  }

  return require('@/assets/images/culture/default-coffee.jpg');
}

function getStatusLabel(status: OrganizerEventStatus) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'draft') return 'Draft';
  return 'Pending';
}

function getRewardStatusLabel(status: RewardPartnerStatus) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'archived') return 'Archived';
  if (status === 'draft') return 'Draft';
  return 'Pending';
}

function getStatusStyle(status: OrganizerEventStatus) {
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

function getRewardStatusStyle(status: RewardPartnerStatus) {
  if (status === 'approved') {
    return { container: 'bg-primary/10', label: 'Approved', text: 'text-primary' };
  }
  if (status === 'rejected') {
    return { container: 'bg-destructive/10', label: 'Rejected', text: 'text-destructive' };
  }
  if (status === 'archived') {
    return { container: 'bg-gray-100', label: 'Archived', text: 'text-muted' };
  }
  if (status === 'draft') {
    return { container: 'bg-gray-100', label: 'Draft', text: 'text-muted' };
  }

  return { container: 'bg-secondary/12', label: 'Pending', text: 'text-secondary' };
}

function formatEventTimeRange(event: { endTime?: string | null; time: string }) {
  return event.endTime ? `${event.time}-${event.endTime}` : event.time;
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

function formatAuditDate(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(parsed));
}
