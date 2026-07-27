import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  QrCode,
  Search,
  Star,
  Users,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandImage } from '@/components/brand-image';
import {
  categoryLabels,
  type CultureEvent,
  type CultureCityData,
  type Venue,
  eventCategoryLabels,
  getCultureCityData,
} from '@/data/culture';
import { getEventEngagement } from '@/lib/event-engagement';
import { fetchOrganizerEvents } from '@/lib/organizer-events';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { UserEventStatus } from '@/lib/event-history';

const audienceFilters = [
  { key: 'all', label: 'All Events' },
  { key: 'international', label: 'International' },
  { key: 'english', label: 'In English' },
  { key: 'free', label: 'Free' },
  { key: 'tonight', label: 'Tonight' },
];
const EVENT_CHECK_IN_RADIUS_METERS = 500;

type ExploreScreenProps = {
  checkedInEventIds?: string[];
  cityData?: CultureCityData;
  events?: CultureEvent[];
  eventsError?: string | null;
  eventsLoading?: boolean;
  eventsRefreshKey?: number;
  eventStatuses?: Record<string, UserEventStatus>;
  onEventCheckIn?: (
    event: CultureEvent,
    location: { latitude: number; longitude: number },
  ) => Promise<boolean>;
  onEventStatusChange?: (eventId: string, status: UserEventStatus | null) => void;
  openEventId?: string;
  openEventNonce?: number;
};

export default function ExploreScreen({
  checkedInEventIds = [],
  cityData = getCultureCityData(),
  events: approvedEventsProp,
  eventsError: approvedEventsError = null,
  eventsLoading: approvedEventsLoading = false,
  eventsRefreshKey = 0,
  eventStatuses = {},
  onEventCheckIn,
  onEventStatusChange,
  openEventId,
  openEventNonce,
}: ExploreScreenProps) {
  const stableTopInset = useStableTopInset();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'events' | 'venues'>('events');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CultureEvent | null>(null);
  const [confirmedCheckIns, setConfirmedCheckIns] = useState<Record<string, boolean>>({});
  const [organizerEvents, setOrganizerEvents] = useState<CultureEvent[]>([]);
  const [organizerEventsError, setOrganizerEventsError] = useState<string | null>(null);
  const [organizerEventsLoading, setOrganizerEventsLoading] = useState(false);
  const { venues } = cityData;
  const hasApprovedEventsProp = approvedEventsProp !== undefined;
  const allEvents = approvedEventsProp ?? organizerEvents;
  const eventsError = hasApprovedEventsProp ? approvedEventsError : organizerEventsError;
  const eventsLoading = hasApprovedEventsProp ? approvedEventsLoading : organizerEventsLoading;

  useEffect(() => {
    let active = true;

    async function loadOrganizerEvents() {
      if (hasApprovedEventsProp) {
        setOrganizerEvents([]);
        setOrganizerEventsError(null);
        setOrganizerEventsLoading(false);
        return;
      }

      setOrganizerEventsLoading(true);
      const result = await fetchOrganizerEvents(cityData.id);
      if (!active) return;

      setOrganizerEvents(result.events);
      setOrganizerEventsError(result.error);
      setOrganizerEventsLoading(false);
    }

    loadOrganizerEvents();

    return () => {
      active = false;
    };
  }, [cityData.id, eventsRefreshKey, hasApprovedEventsProp]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredVenues = useMemo(
    () =>
      venues.filter(
        (venue) =>
          venue.name.toLowerCase().includes(normalizedSearch) ||
          venue.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)),
      ),
    [normalizedSearch, venues],
  );

  const filteredEvents = useMemo(
    () =>
      allEvents.filter((event) => {
        const matchesSearch =
          event.title.toLowerCase().includes(normalizedSearch) ||
          event.venueName.toLowerCase().includes(normalizedSearch);

        let matchesAudience = true;
        if (audienceFilter === 'international') matchesAudience = event.isInternational;
        if (audienceFilter === 'english') {
          matchesAudience = event.language === 'en' || event.language === 'multilingual';
        }
        if (audienceFilter === 'free') matchesAudience = event.isFree;
        if (audienceFilter === 'tonight') {
          matchesAudience =
            event.date.toLowerCase().includes('thu') ||
            event.date.toLowerCase().includes('fri') ||
            event.date.toLowerCase().includes('sat');
        }

        return matchesSearch && matchesAudience;
      }),
    [allEvents, audienceFilter, normalizedSearch],
  );

  const featuredEvent = allEvents.find((event) => event.isFlashQuest);

  useEffect(() => {
    if (!openEventId) return;

    const eventToOpen = allEvents.find((event) => event.id === openEventId);
    if (!eventToOpen) return;

    setTab('events');
    setSelectedEvent(eventToOpen);
  }, [allEvents, openEventId, openEventNonce]);

  const selectedEventStatus = selectedEvent ? eventStatuses[selectedEvent.id] : undefined;
  const selectedDetailStatus =
    selectedEventStatus === 'interested' || selectedEventStatus === 'going'
      ? selectedEventStatus
      : undefined;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5 px-5" style={{ paddingTop: stableTopInset + 16 }}>
          <View className="h-14 flex-row items-center gap-3.5 rounded-2xl border border-primary/10 bg-gray-100 px-4">
            <Search size={20} color="#7C3AED" strokeWidth={2.4} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search events, venues..."
              placeholderTextColor="#756F7B"
              autoCapitalize="none"
              className="flex-1 text-[15px] font-medium text-ink"
            />
          </View>
        </View>

        <View className="mb-4 flex-row gap-2 px-5">
          {(['events', 'venues'] as const).map((nextTab) => {
            const active = tab === nextTab;
            return (
              <Pressable
                key={nextTab}
                onPress={() => setTab(nextTab)}
                className={`rounded-full px-5 py-2.5 ${active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'}`}
              >
                <Text
                  className={`text-[13px] font-semibold capitalize ${active ? 'text-white' : 'text-muted'}`}
                >
                  {nextTab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'events' ? (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {audienceFilters.map((filter) => {
                const active = audienceFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    onPress={() => setAudienceFilter(filter.key)}
                    className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'}`}
                  >
                    <Text
                      className={`text-[13px] font-medium ${active ? 'text-white' : 'text-muted'}`}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {featuredEvent && (
              <View className="mb-6 px-5">
                <View className="mb-3 flex-row items-center gap-1.5">
                  <View className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Live Now
                  </Text>
                </View>

                <Pressable
                  onPress={() => setSelectedEvent(featuredEvent)}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white active:opacity-90"
                >
                  <View className="h-[170px] bg-gray-200">
                    <BrandImage
                      source={getEventImageSource(featuredEvent)}
                      contentFit="cover"
                      style={StyleSheet.absoluteFillObject}
                      withTextGradient
                    >
                      <View className="absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1">
                        <Text className="text-[11px] font-bold text-white">Live quest</Text>
                      </View>
                    </BrandImage>
                  </View>

                  <View className="p-4">
                    <View className="mb-2 flex-row flex-wrap items-center gap-2">
                      <View className="rounded-full bg-gray-100 px-2 py-0.5">
                        <Text className="text-[11px] font-semibold text-muted">
                          {eventCategoryLabels[featuredEvent.category]}
                        </Text>
                      </View>
                      {featuredEvent.isFree && (
                        <View className="rounded-full bg-success/10 px-2 py-0.5">
                          <Text className="text-[11px] font-bold text-success">Free</Text>
                        </View>
                      )}
                      <EventEngagementPills
                        attended={
                          getEventEngagement(featuredEvent, eventStatuses[featuredEvent.id])
                            .attended
                        }
                        interested={
                          getEventEngagement(featuredEvent, eventStatuses[featuredEvent.id])
                            .interested
                        }
                      />
                    </View>

                    <Text className="mb-1 font-ui text-[18px] font-bold text-ink">
                      {featuredEvent.title}
                    </Text>
                    <Text className="mb-3 text-[13px] leading-5 text-muted" numberOfLines={2}>
                      {featuredEvent.description}
                    </Text>
                    <View className="flex-row flex-wrap items-center gap-3">
                      <View className="flex-row items-center gap-1">
                        <Clock size={13} color="#756F7B" />
                        <Text className="text-[12px] text-muted">
                          {featuredEvent.date}, {formatEventTimeRange(featuredEvent)}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <MapPin size={13} color="#756F7B" />
                        <Text className="text-[12px] text-muted" numberOfLines={1}>
                          {featuredEvent.venueName}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </View>
            )}

            <View className="px-5">
              {eventsError && (
                <View className="mb-3 rounded-xl bg-secondary/10 p-3">
                  <Text className="text-[12px] leading-4 text-muted">
                    Approved events could not load from Supabase. Apply the latest migration or
                    check your connection.
                  </Text>
                </View>
              )}

              <Text className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {audienceFilter === 'international'
                  ? 'International Events'
                  : audienceFilter === 'english'
                    ? 'Events in English'
                    : audienceFilter === 'free'
                      ? 'Free Events'
                      : 'Coming Up'}
              </Text>

              {eventsLoading ? (
                <View className="items-center py-12">
                  <Text className="text-[14px] text-muted">Loading approved events...</Text>
                </View>
              ) : filteredEvents.length === 0 ? (
                <View className="items-center py-12">
                  <Text className="text-[14px] text-muted">
                    {eventsError
                      ? 'Events are unavailable right now.'
                      : 'No approved events found for this filter.'}
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {filteredEvents.map((event) => (
                    <Pressable
                      key={event.id}
                      onPress={() => setSelectedEvent(event)}
                      className="flex-row items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3"
                    >
                      <View className="h-[86px] w-[86px] shrink-0 overflow-hidden rounded-xl bg-gray-200">
                        <BrandImage
                          source={getEventImageSource(event)}
                          contentFit="cover"
                          style={StyleSheet.absoluteFillObject}
                        />
                      </View>
                      <View className="min-w-0 flex-1">
                        <View className="mb-1 flex-row items-center gap-2">
                          <Text className="text-[11px] font-semibold uppercase text-muted">
                            {event.date}
                          </Text>
                          {event.isFree && (
                            <Text className="text-[11px] font-bold text-success">Free</Text>
                          )}
                        </View>
                        <Text
                          className="mb-1 font-ui text-[15px] font-bold text-ink"
                          numberOfLines={2}
                        >
                          {event.title}
                        </Text>
                        <Text className="mb-2 text-[12px] text-muted" numberOfLines={1}>
                          {event.venueName}
                        </Text>
                        <View className="flex-row flex-wrap items-center gap-2.5">
                          <View className="flex-row items-center gap-1">
                            <Clock size={12} color="#756F7B" />
                            <Text className="text-[12px] text-muted">
                              {formatEventTimeRange(event)}
                            </Text>
                          </View>
                          <EventEngagementPills
                            attended={getEventEngagement(event, eventStatuses[event.id]).attended}
                            interested={
                              getEventEngagement(event, eventStatuses[event.id]).interested
                            }
                          />
                        </View>
                      </View>
                      <ChevronRight size={18} color="#8B909A" />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="gap-3 px-5">
            {filteredVenues.map((venue) => (
              <Pressable
                key={venue.id}
                className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80"
              >
                <View
                  className="h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${venue.color}20` }}
                >
                  <MapPin size={22} color={venue.color} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="mb-0.5 flex-row items-center gap-2">
                    <Text className="shrink text-[15px] font-semibold text-ink" numberOfLines={1}>
                      {venue.name}
                    </Text>
                    {venue.isLive && (
                      <View className="rounded-full bg-success/10 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-success">LIVE</Text>
                      </View>
                    )}
                    {venue.isPartner && (
                      <View className="rounded-full bg-primary/10 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-primary">Partner</Text>
                      </View>
                    )}
                  </View>
                  <Text className="mb-1 text-[13px] text-muted">
                    {categoryLabels[venue.category]}
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <Star size={12} color="#F4A261" fill="#F4A261" />
                      <Text className="text-[12px] text-muted">{venue.rating}</Text>
                    </View>
                    <Text className="text-[12px] font-bold text-primary">+{venue.xpReward} XP</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#756F7B" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <EventDetailModal
        checkedIn={
          !!(
            selectedEvent &&
            (confirmedCheckIns[selectedEvent.id] || checkedInEventIds.includes(selectedEvent.id))
          )
        }
        event={selectedEvent}
        venue={
          selectedEvent
            ? (venues.find((venue) => venue.id === selectedEvent.venueId) ?? null)
            : null
        }
        onCheckIn={async (event, location) => {
          const didConfirm = (await onEventCheckIn?.(event, location)) ?? false;

          if (didConfirm) {
            setConfirmedCheckIns((current) => ({
              ...current,
              [event.id]: true,
            }));
          }

          return didConfirm;
        }}
        onClose={() => setSelectedEvent(null)}
        onToggleStatus={(eventId, status) => {
          onEventStatusChange?.(eventId, eventStatuses[eventId] === status ? null : status);
        }}
        status={selectedDetailStatus}
      />
    </View>
  );
}

function EventDetailModal({
  checkedIn,
  event,
  venue,
  onCheckIn,
  onClose,
  onToggleStatus,
  status,
}: {
  checkedIn: boolean;
  event: CultureEvent | null;
  venue?: Venue | null;
  onCheckIn: (
    event: CultureEvent,
    location: { latitude: number; longitude: number },
  ) => Promise<boolean>;
  onClose: () => void;
  onToggleStatus: (eventId: string, status: 'interested' | 'going') => void;
  status?: 'interested' | 'going';
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stableTopInset = useStableTopInset();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (event) {
      translateX.value = 0;
    }
  }, [event, translateX]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-999, 18])
    .failOffsetY([-35, 35])
    .onUpdate((gestureEvent) => {
      translateX.value = Math.max(0, gestureEvent.translationX);
    })
    .onEnd((gestureEvent) => {
      const shouldClose = translateX.value > width * 0.28 || gestureEvent.velocityX > 700;

      if (shouldClose) {
        translateX.value = withTiming(width, { duration: 180 }, (finished) => {
          if (finished) {
            runOnJS(onClose)();
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
        runOnJS(onClose)();
      }
    });
  }

  if (!event) return null;

  const activeEvent = event;
  const verifiedVenue = venue ?? getEventLocationVenue(activeEvent);
  const detailEngagement = getEventEngagement(activeEvent, checkedIn ? 'attended' : status);
  const checkInWindowState = getCheckInWindowState(activeEvent);

  async function verifyVenueDistance() {
    const currentWindowState = getCheckInWindowState(activeEvent);
    if (currentWindowState === 'not-started') {
      return {
        allowed: false,
        location: null,
        message: 'Check-in is not open yet. Try again when the event starts.',
      };
    }
    if (currentWindowState === 'ended') {
      return {
        allowed: false,
        location: null,
        message: 'Check-in for this event has already closed.',
      };
    }

    if (!verifiedVenue) {
      return {
        allowed: false,
        location: null,
        message: 'Venue location is missing for this event.',
      };
    }

    const permissionResult = await Location.requestForegroundPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      return {
        allowed: false,
        location: null,
        message: 'Location permission is needed to verify attendance.',
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const distance = getDistanceMeters(
      position.coords.latitude,
      position.coords.longitude,
      verifiedVenue.coordinates.latitude,
      verifiedVenue.coordinates.longitude,
    );

    if (distance > EVENT_CHECK_IN_RADIUS_METERS) {
      return {
        allowed: false,
        location: null,
        message: `You need to be within 500m of ${verifiedVenue.name}. You are about ${formatDistance(distance)} away.`,
      };
    }

    return {
      allowed: true,
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      message: `Location verified: ${formatDistance(distance)} from ${verifiedVenue.name}.`,
    };
  }

  async function openScanner() {
    setCheckingLocation(true);
    setLocationMessage(null);
    const result = await verifyVenueDistance();
    setCheckingLocation(false);

    if (!result.allowed) {
      setLocationMessage(result.message);
      return;
    }

    setLocationMessage(result.message);
    setScanLocked(false);
    setScanMessage(null);
    setScannerOpen(true);
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanLocked || !event) return;

    setScanLocked(true);
    const locationResult = await verifyVenueDistance();
    if (!locationResult.allowed) {
      setScanMessage(locationResult.message);
      setTimeout(() => setScanLocked(false), 1400);
      return;
    }

    if (result.data === event.checkInCode) {
      if (!locationResult.location) {
        setScanMessage('Location could not be verified. Try scanning again.');
        setTimeout(() => setScanLocked(false), 1400);
        return;
      }

      const didAwardXp = await onCheckIn(event, locationResult.location);
      setScannerOpen(false);
      setScanMessage(null);
      setLocationMessage(
        didAwardXp
          ? `Attendance verified. ${event.xpBonus} XP has been added to your profile.`
          : 'Attendance could not be confirmed, or XP was already added for this event.',
      );
      return;
    }

    setScanMessage('This QR code does not match this event.');
    setTimeout(() => setScanLocked(false), 1200);
  }

  return (
    <Modal animationType="slide" onRequestClose={closeWithAnimation} visible>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <View className="flex-1 bg-white">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="relative h-[260px] bg-gray-200">
                <BrandImage
                  source={getEventImageSource(event)}
                  contentFit="cover"
                  style={StyleSheet.absoluteFillObject}
                  withTextGradient
                />
                <Pressable
                  onPress={closeWithAnimation}
                  className="absolute left-5 h-10 w-10 items-center justify-center rounded-full bg-black/30 active:opacity-80"
                  style={{ top: stableTopInset + 6 }}
                >
                  <ArrowLeft size={21} color="white" strokeWidth={2.6} />
                </Pressable>
                <View className="absolute bottom-5 left-5 right-5">
                  <View className="mb-2 flex-row flex-wrap items-center gap-2">
                    <View className="rounded-full bg-white/90 px-2.5 py-1">
                      <Text className="text-[11px] font-bold text-primary">
                        {eventCategoryLabels[event.category]}
                      </Text>
                    </View>
                    {checkedIn && (
                      <View className="rounded-full bg-success px-2.5 py-1">
                        <Text className="text-[11px] font-bold text-white">
                          Attendance confirmed
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    className="text-[28px] font-extrabold leading-8 text-white"
                    numberOfLines={3}
                  >
                    {event.title}
                  </Text>
                </View>
              </View>

              <View className="px-5 pt-5">
                <View className="mb-5 flex-row gap-2">
                  <StatusButton
                    active={status === 'interested'}
                    icon={
                      <BellRing size={17} color={status === 'interested' ? 'white' : '#7C3AED'} />
                    }
                    label="Interested"
                    onPress={() => onToggleStatus(event.id, 'interested')}
                  />
                  <StatusButton
                    active={status === 'going'}
                    icon={
                      <CheckCircle2 size={17} color={status === 'going' ? 'white' : '#7C3AED'} />
                    }
                    label="Going"
                    onPress={() => onToggleStatus(event.id, 'going')}
                  />
                </View>

                {!!status && (
                  <View className="mb-5 rounded-xl border border-primary/10 bg-primary/5 p-3">
                    <Text className="text-[13px] font-semibold text-primary">
                      Event notifications enabled
                    </Text>
                    <Text className="mt-1 text-[12px] leading-4 text-muted">
                      You will be notified when the organiser changes time, location, or important
                      details.
                    </Text>
                  </View>
                )}

                <View className="mb-5 gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <InfoRow icon={<MapPin size={17} color="#7C3AED" />} label={event.venueName} />
                  <InfoRow
                    icon={<Clock size={17} color="#7C3AED" />}
                    label={`${event.date}, ${formatEventTimeRange(event)}`}
                  />
                  <InfoRow
                    icon={<Users size={17} color="#7C3AED" />}
                    label={`${detailEngagement.interested.toLocaleString()} interested`}
                  />
                  <InfoRow
                    icon={<CheckCircle2 size={17} color="#7C3AED" />}
                    label={`${detailEngagement.attended.toLocaleString()} attended`}
                  />
                  <View className="rounded-2xl bg-primary/5 px-3 py-2.5">
                    <Text className="text-[13px] font-semibold text-primary">
                      +{event.xpBonus} XP after confirmed attendance
                    </Text>
                  </View>
                </View>

                <Text className="mb-2 font-ui text-[16px] font-extrabold text-ink">
                  About this event
                </Text>
                <Text className="mb-5 text-[14px] leading-5 text-ink/75">{event.description}</Text>

                <View className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                    Organiser
                  </Text>
                  <Text className="mt-1 text-[15px] font-bold text-ink">{event.organizerName}</Text>
                  <Text className="mt-1 text-[12px] leading-4 text-muted">
                    This organiser can post updates to everyone marked Interested or Going.
                  </Text>
                </View>

                {checkedIn ? (
                  <View className="rounded-2xl bg-success/10 p-4">
                    <Text className="text-[15px] font-extrabold text-success">
                      Attendance confirmed
                    </Text>
                    <Text className="mt-1 text-[13px] leading-5 text-ink/75">
                      You earned {event.xpBonus} XP for this event.
                    </Text>
                  </View>
                ) : (
                  <>
                    {locationMessage && (
                      <View className="mb-3 rounded-xl bg-gray-100 p-3">
                        <Text className="text-[12px] leading-4 text-muted">{locationMessage}</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={openScanner}
                      disabled={checkingLocation || checkInWindowState !== 'open'}
                      className="h-[52px] flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85 disabled:opacity-60"
                    >
                      <QrCode size={19} color="white" strokeWidth={2.4} />
                      <Text className="text-[15px] font-semibold text-white">
                        {checkingLocation
                          ? 'Checking location...'
                          : checkInWindowState === 'not-started'
                            ? 'Check-in opens at start time'
                            : checkInWindowState === 'ended'
                              ? 'Check-in closed'
                              : 'Scan event QR'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </ScrollView>

            <Modal
              animationType="slide"
              onRequestClose={() => setScannerOpen(false)}
              visible={scannerOpen}
            >
              <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
                <View className="flex-row items-center justify-between px-5 py-4">
                  <Text className="text-[18px] font-extrabold text-white">Scan QR code</Text>
                  <Pressable
                    onPress={() => setScannerOpen(false)}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
                  >
                    <X size={20} color="white" />
                  </Pressable>
                </View>

                {!permission ? (
                  <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-center text-[14px] text-white/80">Loading camera...</Text>
                  </View>
                ) : !permission.granted ? (
                  <View className="flex-1 items-center justify-center px-6">
                    <Text className="mb-4 text-center text-[15px] leading-5 text-white">
                      Camera access is needed to scan the organiser QR code.
                    </Text>
                    <Pressable
                      onPress={requestPermission}
                      className="h-12 items-center justify-center rounded-xl bg-white px-5"
                    >
                      <Text className="text-[14px] font-bold text-ink">Allow camera access</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-1">
                    <CameraView
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
                      style={{ flex: 1 }}
                    />
                    <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-5 py-5">
                      <Text className="text-center text-[14px] font-semibold text-white">
                        Ask the organiser for the event QR code.
                      </Text>
                      <Text className="mt-1 text-center text-[12px] text-white/70">
                        Demo payload: {event.checkInCode}
                      </Text>
                      {scanMessage && (
                        <Text className="mt-3 text-center text-[13px] font-semibold text-destructive">
                          {scanMessage}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </SafeAreaView>
            </Modal>
          </View>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function StatusButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${
        active ? 'bg-primary' : 'border border-primary/20 bg-primary/5'
      }`}
    >
      {icon}
      <Text className={`text-[14px] font-semibold ${active ? 'text-white' : 'text-primary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function EventEngagementPills({ attended, interested }: { attended: number; interested: number }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="flex-row items-center gap-1 rounded-full bg-primary/5 px-2 py-1">
        <Users size={12} color="#7C3AED" strokeWidth={2.4} />
        <Text className="text-[11px] font-bold text-primary">{interested.toLocaleString()}</Text>
      </View>
      <View className="flex-row items-center gap-1 rounded-full bg-primary/5 px-2 py-1">
        <CheckCircle2 size={12} color="#7C3AED" strokeWidth={2.4} />
        <Text className="text-[11px] font-bold text-primary">{attended.toLocaleString()}</Text>
      </View>
    </View>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
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

  return getOrganizerImageSource(event.organizerImage);
}

function getEventLocationVenue(event: CultureEvent): Venue | null {
  if (!event.venueCoordinates) {
    return null;
  }

  return {
    id: event.venueId,
    name: event.venueName,
    category: 'cultural-centre',
    address: event.venueAddress ?? event.venueName,
    description: event.description,
    hours: formatEventTimeRange(event),
    rating: 0,
    checkIns: 0,
    xpReward: event.xpBonus,
    isPartner: true,
    tags: [],
    color: '#7C3AED',
    coordinates: event.venueCoordinates,
  };
}

function getOrganizerImageSource(image: CultureEvent['organizerImage']) {
  if (image === 'cafe') {
    return require('@/assets/images/culture/venue-cafe.jpg');
  }
  if (image === 'theater') {
    return require('@/assets/images/culture/venue-theater.jpg');
  }

  return require('@/assets/images/culture/venue-museum.jpg');
}

function formatEventTimeRange(event: CultureEvent) {
  return event.endTime ? `${event.time}-${event.endTime}` : event.time;
}

function getCheckInWindowState(event: CultureEvent) {
  const now = Date.now();
  const startsAt = event.startsAt ? Date.parse(event.startsAt) : null;
  const endsAt = event.endsAt ? Date.parse(event.endsAt) : null;

  if (startsAt && !Number.isNaN(startsAt) && now < startsAt) {
    return 'not-started';
  }

  if (endsAt && !Number.isNaN(endsAt) && now > endsAt) {
    return 'ended';
  }

  return 'open';
}

function getDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusMeters = 6371000;
  const latARadians = toRadians(latitudeA);
  const latBRadians = toRadians(latitudeB);
  const latDelta = toRadians(latitudeB - latitudeA);
  const lonDelta = toRadians(longitudeB - longitudeA);
  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latARadians) * Math.cos(latBRadians) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMeters * centralAngle;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km`;
}
