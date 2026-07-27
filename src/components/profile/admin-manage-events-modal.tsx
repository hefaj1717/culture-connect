import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  RefreshCw,
  Save,
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
import { CardStyles, Colors } from '@/constants/theme';
import { eventCategoryLabels, type EventCategory } from '@/data/culture';
import type { AdminManagedEvent } from '@/lib/admin-moderation';
import type { OrganizerEventStatus } from '@/lib/organizer-events';

type AdminEventFilter = 'all' | OrganizerEventStatus | 'past';

const adminEventFilters: { key: AdminEventFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'past', label: 'Past' },
];

const editableStatuses: OrganizerEventStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

const editableCategories = Object.keys(eventCategoryLabels) as EventCategory[];

type AdminManageEventsModalProps = {
  error: string | null;
  events: AdminManagedEvent[];
  loading: boolean;
  onClose: () => void;
  onDeleteEvent: (id: string) => void;
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
  savingEventId: string | null;
  stableModalTopInset: number;
  visible: boolean;
};

export function AdminManageEventsModal({
  error,
  events,
  loading,
  onClose,
  onDeleteEvent,
  onRefresh,
  onSaveEvent,
  savingEventId,
  stableModalTopInset,
  visible,
}: AdminManageEventsModalProps) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const [activeFilter, setActiveFilter] = useState<AdminEventFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<AdminManagedEvent | null>(null);
  const visibleSelectedEvent = selectedEvent
    ? (events.find((event) => event.databaseId === selectedEvent.databaseId) ?? selectedEvent)
    : null;
  const filteredEvents = useMemo(
    () =>
      activeFilter === 'all'
        ? events
        : events.filter((event) =>
            activeFilter === 'past'
              ? event.reviewStatus === 'approved' && isPastEventDateLabel(event.date)
              : event.reviewStatus === activeFilter,
          ),
    [activeFilter, events],
  );

  useEffect(() => {
    if (visible) {
      translateX.value = 0;
      setSelectedEvent(null);
    }
  }, [translateX, visible]);

  const closeOrBack = () => {
    if (selectedEvent) {
      setSelectedEvent(null);
      return;
    }

    onClose();
  };

  const gesture = Gesture.Pan()
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
            runOnJS(closeOrBack)();
          }
        });
        return;
      }

      translateX.value = withTiming(0, { duration: 180 });
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function closeWithAnimation() {
    translateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        translateX.value = 0;
        runOnJS(closeOrBack)();
      }
    });
  }

  return (
    <Modal animationType="slide" onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            {visibleSelectedEvent ? (
              <AdminEventEditor
                event={visibleSelectedEvent}
                onBack={() => setSelectedEvent(null)}
                onDelete={() => {
                  setSelectedEvent(null);
                  onDeleteEvent(visibleSelectedEvent.databaseId);
                }}
                onSave={onSaveEvent}
                saving={savingEventId === visibleSelectedEvent.databaseId}
                stableModalTopInset={stableModalTopInset}
              />
            ) : (
              <>
                <View
                  className="flex-row items-center justify-between bg-white px-5 pb-3"
                  style={{ paddingTop: stableModalTopInset + 6 }}
                >
                  <Pressable
                    onPress={closeWithAnimation}
                    className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                    accessibilityLabel="Close manage events"
                    accessibilityRole="button"
                  >
                    <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
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
                  <View className="mb-4 overflow-hidden rounded-3xl bg-ink">
                    <LinearGradient
                      colors={['rgba(124,58,237,0.72)', 'rgba(36,28,46,0.98)']}
                      end={{ x: 1, y: 1 }}
                      start={{ x: 0, y: 0 }}
                      style={{ padding: 20 }}
                    >
                      <Text className="text-[12px] font-semibold uppercase tracking-wide text-white/70">
                        Admin manage
                      </Text>
                      <Text className="mt-1 font-heading text-[29px] font-extrabold leading-[33px] text-white">
                        Manage all events.
                      </Text>
                      <Text className="mt-2 max-w-[300px] text-[13px] leading-5 text-white/80">
                        Edit event details, change status, update XP, or remove events.
                      </Text>
                    </LinearGradient>
                  </View>
                </View>

                <AdminEventFilterBar
                  activeKey={activeFilter}
                  events={events}
                  onSelect={setActiveFilter}
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
                  {error && (
                    <View className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                      <Text className="text-[13px] leading-5 text-destructive">{error}</Text>
                    </View>
                  )}

                  {loading ? (
                    <View className="items-center justify-center rounded-3xl border border-gray-200 bg-white p-8">
                      <ActivityIndicator color={Colors.light.primary} />
                      <Text className="mt-3 text-[13px] font-semibold text-muted">
                        Loading events
                      </Text>
                    </View>
                  ) : events.length === 0 ? (
                    <AdminEventEmptyState
                      body="Organizer events will appear here after they are submitted."
                      title="No events yet"
                    />
                  ) : filteredEvents.length === 0 ? (
                    <AdminEventEmptyState
                      body="No events match this status filter."
                      title="Nothing here"
                    />
                  ) : (
                    filteredEvents.map((event) => (
                      <AdminManagedEventCard
                        event={event}
                        key={event.databaseId}
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

function AdminManagedEventCard({
  event,
  onPress,
}: {
  event: AdminManagedEvent;
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
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View className="p-4">
        <View className="mb-2 flex-row items-center justify-between gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {event.date}
          </Text>
          <AdminEventStatusPill status={event.reviewStatus} />
        </View>
        <Text className="font-ui text-[16px] font-extrabold text-ink" numberOfLines={2}>
          {event.title}
        </Text>
        <Text className="mt-1 text-[13px] font-medium text-muted" numberOfLines={1}>
          {event.venueName} · {formatEventTimeRange(event)}
        </Text>
        <View className="mt-3 flex-row gap-2">
          <MiniStat label="Interested" value={event.interestedCount ?? 0} />
          <MiniStat label="Attended" value={event.attendeeCount} />
          <MiniStat label="XP" value={event.xpBonus} />
        </View>
      </View>
    </Pressable>
  );
}

function AdminEventEditor({
  event,
  onBack,
  onDelete,
  onSave,
  saving,
  stableModalTopInset,
}: {
  event: AdminManagedEvent;
  onBack: () => void;
  onDelete: () => void;
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
          <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
        </Pressable>
        <Pressable
          onPress={onDelete}
          className="h-10 w-10 items-center justify-center rounded-full bg-destructive/10 active:opacity-80"
          accessibilityLabel="Delete event"
          accessibilityRole="button"
        >
          <Trash2 size={18} color="#EF4444" strokeWidth={2.5} />
        </Pressable>
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
            style={StyleSheet.absoluteFillObject}
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
            <Text className="mt-1 text-[13px] font-semibold text-white/75">
              {event.organizerName}
            </Text>
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
            <MiniStat label="Attended" value={event.attendeeCount} />
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
      </ScrollView>
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

function ChoiceSection({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
      <Text className="mb-3 font-ui text-[15px] font-extrabold text-ink">{label}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl bg-primary/5 px-3 py-2">
      <Text className="text-[13px] font-extrabold text-primary">{value.toLocaleString()}</Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </Text>
    </View>
  );
}

function AdminEventEmptyState({ body, title }: { body: string; title: string }) {
  return (
    <View className="rounded-3xl border border-primary/10 bg-primary/5 p-5">
      <Text className="font-ui text-[15px] font-extrabold text-ink">{title}</Text>
      <Text className="mt-1 text-[13px] leading-5 text-muted">{body}</Text>
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

function countEventsForFilter(events: AdminManagedEvent[], filter: AdminEventFilter) {
  if (filter === 'all') return events.length;
  if (filter === 'past') {
    return events.filter(
      (event) => event.reviewStatus === 'approved' && isPastEventDateLabel(event.date),
    ).length;
  }

  return events.filter((event) => event.reviewStatus === filter).length;
}

function getEventImageSource(event: AdminManagedEvent) {
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

function getStatusLabel(status: OrganizerEventStatus) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'cancelled') return 'Cancelled';
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
