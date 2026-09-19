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
  Users,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Keyboard,
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

import { CardListSkeleton, EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { BrandImage } from '@/components/brand-image';
import { OrganizerAvatar, OrganizerProfileModal } from '@/components/organizer-profile-modal';
import { ScreenHeader } from '@/components/screen-header';
import { CardStyles, Colors, Spacing } from '@/constants/theme';
import {
  type CultureEvent,
  type CultureCityData,
  type CityId,
  type Venue,
  eventCategoryLabels,
  getCultureCityData,
} from '@/data/culture';
import { getEventEngagement } from '@/lib/event-engagement';
import { fetchOrganizerEvents } from '@/lib/organizer-events';
import {
  fetchOrganizerProfiles,
  organizerProfileFromEvent,
  type OrganizerProfile,
} from '@/lib/organizer-profiles';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import type { UserEventStatus } from '@/lib/event-history';
import { useAuth } from '@/providers/auth-provider';

const audienceFilters = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live now' },
  { key: 'upcoming', label: 'Coming up' },
  { key: 'international', label: 'International' },
  { key: 'english', label: 'In English' },
  { key: 'free', label: 'Free' },
  { key: 'tonight', label: 'Tonight' },
];
const EVENT_CHECK_IN_RADIUS_METERS = 500;

export type EventCheckInResult = {
  duplicate?: boolean;
  error?: string | null;
  success: boolean;
  totalXp?: number | null;
  xpEarned?: number;
};

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
    checkInCode: string,
    location: { latitude: number; longitude: number },
  ) => Promise<EventCheckInResult>;
  onEventStatusChange?: (
    eventId: string,
    status: UserEventStatus | null,
  ) => Promise<{ error: string | null }>;
  onExternalEventClose?: () => void;
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
  onExternalEventClose,
  openEventId,
  openEventNonce,
}: ExploreScreenProps) {
  const { hasRole, organizerApplicationStatus, session } = useAuth();
  const stableTopInset = useStableTopInset();
  const layout = useResponsiveLayout();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'events' | 'venues'>('events');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CultureEvent | null>(null);
  const [confirmedCheckIns, setConfirmedCheckIns] = useState<Record<string, boolean>>({});
  const [organizerEvents, setOrganizerEvents] = useState<CultureEvent[]>([]);
  const [organizerEventsError, setOrganizerEventsError] = useState<string | null>(null);
  const [organizerEventsLoading, setOrganizerEventsLoading] = useState(false);
  const [organizerProfiles, setOrganizerProfiles] = useState<OrganizerProfile[]>([]);
  const [organizerProfilesError, setOrganizerProfilesError] = useState<string | null>(null);
  const [organizerProfilesLoading, setOrganizerProfilesLoading] = useState(false);
  const [selectedOrganizerProfile, setSelectedOrganizerProfile] = useState<OrganizerProfile | null>(
    null,
  );
  const handledOpenEventNonceRef = useRef<number | null>(null);
  const externalSelectedEventIdRef = useRef<string | null>(null);
  const eventReturnOrganizerRef = useRef<OrganizerProfile | null>(null);
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

  useEffect(() => {
    let active = true;

    async function loadOrganizerProfiles() {
      setOrganizerProfilesLoading(true);
      const result = await fetchOrganizerProfiles(cityData.id);
      if (!active) return;

      setOrganizerProfiles(result.profiles);
      setOrganizerProfilesError(result.error);
      setOrganizerProfilesLoading(false);
    }

    loadOrganizerProfiles();

    return () => {
      active = false;
    };
  }, [cityData.id, eventsRefreshKey]);

  const normalizedSearch = search.trim().toLowerCase();
  const currentUserOrganizerProfile = useMemo(() => {
    if (!session?.user.id || (organizerApplicationStatus !== 'approved' && !hasRole('organizer'))) {
      return null;
    }

    const metadata = session.user.user_metadata;
    const profileCityId: CityId = metadata?.city_id === 'lublin' ? 'lublin' : 'leuven';
    if (profileCityId !== cityData.id) {
      return null;
    }

    const firstName = typeof metadata?.first_name === 'string' ? metadata.first_name : '';
    const lastName = typeof metadata?.last_name === 'string' ? metadata.last_name : '';
    const metadataName = [firstName, lastName].filter(Boolean).join(' ');
    const name =
      (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) ||
      metadataName ||
      session.user.email?.split('@')[0] ||
      'CultureQuest organiser';
    const latitude = metadata?.organizer_location_latitude;
    const longitude = metadata?.organizer_location_longitude;

    return {
      avatarUrl: typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null,
      bio:
        typeof metadata?.organizer_bio === 'string' && metadata.organizer_bio.trim()
          ? metadata.organizer_bio.trim()
          : 'Verified CultureQuest organiser.',
      cityId: profileCityId,
      id: session.user.id,
      locationAddress:
        typeof metadata?.organizer_location_address === 'string' &&
        metadata.organizer_location_address.trim()
          ? metadata.organizer_location_address
          : null,
      locationCoordinates:
        typeof latitude === 'number' && typeof longitude === 'number'
          ? { latitude, longitude }
          : null,
      locationName:
        typeof metadata?.organizer_location_name === 'string' &&
        metadata.organizer_location_name.trim()
          ? metadata.organizer_location_name
          : null,
      name,
    } satisfies OrganizerProfile;
  }, [
    cityData.id,
    hasRole,
    organizerApplicationStatus,
    session?.user.email,
    session?.user.id,
    session?.user.user_metadata,
  ]);

  const displayedOrganizerProfiles = useMemo(() => {
    if (!currentUserOrganizerProfile) {
      return organizerProfiles;
    }

    const withoutCurrentUser = organizerProfiles.filter(
      (profile) => profile.id !== currentUserOrganizerProfile.id,
    );

    return [currentUserOrganizerProfile, ...withoutCurrentUser];
  }, [currentUserOrganizerProfile, organizerProfiles]);

  const filteredOrganizerProfiles = useMemo(
    () =>
      displayedOrganizerProfiles.filter(
        (profile) =>
          profile.name.toLowerCase().includes(normalizedSearch) ||
          profile.bio.toLowerCase().includes(normalizedSearch) ||
          (profile.locationName?.toLowerCase().includes(normalizedSearch) ?? false) ||
          (profile.locationAddress?.toLowerCase().includes(normalizedSearch) ?? false),
      ),
    [displayedOrganizerProfiles, normalizedSearch],
  );

  const filteredEvents = useMemo(
    () =>
      allEvents
        .filter((event) => {
          const matchesSearch =
            event.title.toLowerCase().includes(normalizedSearch) ||
            event.venueName.toLowerCase().includes(normalizedSearch);

          let matchesAudience = true;
          if (audienceFilter === 'live') matchesAudience = getCheckInWindowState(event) === 'open';
          if (audienceFilter === 'upcoming') {
            matchesAudience = getCheckInWindowState(event) === 'not-started';
          }
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
        })
        .sort((eventA, eventB) => {
          const eventALive = getCheckInWindowState(eventA) === 'open';
          const eventBLive = getCheckInWindowState(eventB) === 'open';

          if (eventALive !== eventBLive) return eventALive ? -1 : 1;

          return getEventStartTimestamp(eventA) - getEventStartTimestamp(eventB);
        }),
    [allEvents, audienceFilter, normalizedSearch],
  );

  const featuredEvent = allEvents.find((event) => event.isFlashQuest);

  useEffect(() => {
    setSelectedEvent(null);
    setSelectedOrganizerProfile(null);
    handledOpenEventNonceRef.current = null;
    externalSelectedEventIdRef.current = null;
    eventReturnOrganizerRef.current = null;
  }, [cityData.id]);

  useEffect(() => {
    if (!openEventId) return;
    if (openEventNonce && handledOpenEventNonceRef.current === openEventNonce) return;

    const eventToOpen = allEvents.find((event) => event.id === openEventId);
    if (!eventToOpen) return;

    handledOpenEventNonceRef.current = openEventNonce ?? null;
    externalSelectedEventIdRef.current = eventToOpen.id;
    setTab('events');
    setSelectedEvent(eventToOpen);
  }, [allEvents, openEventId, openEventNonce]);

  function closeSelectedEvent() {
    const shouldReturnToSource =
      !!selectedEvent && externalSelectedEventIdRef.current === selectedEvent.id;
    const organizerToRestore = eventReturnOrganizerRef.current;

    externalSelectedEventIdRef.current = null;
    eventReturnOrganizerRef.current = null;
    setSelectedEvent(null);

    if (organizerToRestore) {
      setSelectedOrganizerProfile(organizerToRestore);
    } else if (shouldReturnToSource) {
      onExternalEventClose?.();
    }
  }

  const selectedEventStatus = selectedEvent ? eventStatuses[selectedEvent.id] : undefined;
  const selectedDetailStatus =
    selectedEventStatus === 'interested' || selectedEventStatus === 'going'
      ? selectedEventStatus
      : undefined;
  const selectedEventOrganizerProfile = useMemo(() => {
    if (!selectedEvent) {
      return null;
    }

    return (
      displayedOrganizerProfiles.find((profile) => profile.id === selectedEvent.organizerId) ??
      organizerProfileFromEvent(selectedEvent)
    );
  }, [displayedOrganizerProfiles, selectedEvent]);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4 px-5" style={{ paddingTop: stableTopInset + Spacing.sm }}>
          <ScreenHeader title="Discover" style={{ marginBottom: Spacing.md }} />
          <View
            className="h-14 flex-row items-center gap-3.5 rounded-2xl border border-primary/10 px-4"
            style={{ backgroundColor: Colors.light.backgroundElement }}
          >
            <Search size={20} color={Colors.light.primary} strokeWidth={2.4} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search events, organizers..."
              placeholderTextColor={Colors.light.textSecondary}
              autoCapitalize="none"
              className="flex-1 text-[15px] font-medium text-ink"
            />
          </View>
        </View>

        <View
          className="mb-4 mx-5 flex-row rounded-2xl p-1"
          style={{ backgroundColor: Colors.light.backgroundElement }}
        >
          {(['events', 'venues'] as const).map((nextTab) => {
            const active = tab === nextTab;
            const tabLabel = nextTab === 'events' ? 'Events' : 'Organizers';
            return (
              <Pressable
                key={nextTab}
                onPress={() => {
                  Keyboard.dismiss();
                  setTab(nextTab);
                }}
                className={`h-10 flex-1 items-center justify-center rounded-xl ${active ? 'bg-primary' : ''}`}
              >
                <Text className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                  {tabLabel}
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
              className="mb-4"
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {audienceFilters.map((filter) => {
                const active = audienceFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    onPress={() => {
                      Keyboard.dismiss();
                      setAudienceFilter(active ? 'all' : filter.key);
                    }}
                    className={`h-9 items-center justify-center rounded-full px-4 ${active ? 'bg-primary' : 'border border-primary/10'}`}
                    style={active ? undefined : { backgroundColor: Colors.light.backgroundElement }}
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
                  onPress={() => {
                    Keyboard.dismiss();
                    setSelectedEvent(featuredEvent);
                  }}
                  className="overflow-hidden rounded-3xl active:opacity-90"
                  style={[CardStyles.elevated, { backgroundColor: Colors.light.backgroundElement }]}
                >
                  <View className="bg-gray-200" style={{ height: layout.isSmallPhone ? 150 : 170 }}>
                    <BrandImage
                      source={getEventImageSource(featuredEvent)}
                      contentFit="cover"
                      style={StyleSheet.absoluteFill}
                      withTextGradient
                    >
                      <View className="absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1">
                        <Text className="text-[11px] font-bold text-white">Live quest</Text>
                      </View>
                    </BrandImage>
                  </View>

                  <View className="p-4">
                    <View className="mb-2 flex-row flex-wrap items-center gap-2">
                      <View className="rounded-full bg-primary/5 px-2 py-0.5">
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
                        going={
                          getEventEngagement(featuredEvent, eventStatuses[featuredEvent.id]).going
                        }
                        interested={
                          getEventEngagement(featuredEvent, eventStatuses[featuredEvent.id])
                            .interested
                        }
                        mode={getCheckInWindowState(featuredEvent) === 'open' ? 'live' : 'upcoming'}
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
                        <Clock size={13} color={Colors.light.textSecondary} />
                        <Text className="text-[12px] text-muted">
                          {featuredEvent.date}, {formatEventTimeRange(featuredEvent)}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <MapPin size={13} color={Colors.light.textSecondary} />
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
                <ErrorState
                  body="We could not load events right now. Check your connection and try again."
                  compact
                  style={{ marginBottom: 12 }}
                  title="Approved events could not load"
                />
              )}

              <Text className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {audienceFilter === 'international'
                  ? 'International Events'
                  : audienceFilter === 'english'
                    ? 'Events in English'
                    : audienceFilter === 'free'
                      ? 'Free Events'
                      : audienceFilter === 'live'
                        ? 'Live Now'
                        : audienceFilter === 'upcoming'
                          ? 'Coming Up'
                          : 'Events'}
              </Text>

              {eventsLoading ? (
                <CardListSkeleton count={4} />
              ) : filteredEvents.length === 0 ? (
                <EmptyState
                  body={
                    eventsError
                      ? 'Events are unavailable right now.'
                      : 'Try another filter, or check back when organizers publish something new.'
                  }
                  title={eventsError ? 'Events unavailable' : 'No events found'}
                />
              ) : (
                <View className="gap-3">
                  {filteredEvents.map((event) => {
                    const isLiveNow = getCheckInWindowState(event) === 'open';

                    return (
                      <Pressable
                        key={event.id}
                        onPress={() => {
                          Keyboard.dismiss();
                          setSelectedEvent(event);
                        }}
                        className="flex-row items-start gap-3 rounded-2xl p-3 active:opacity-90"
                        style={[
                          CardStyles.compact,
                          {
                            backgroundColor: Colors.light.backgroundElement,
                          },
                        ]}
                      >
                        {isLiveNow ? (
                          <View
                            pointerEvents="none"
                            className="absolute bottom-0 left-0 top-0 w-1.5 rounded-l-2xl bg-accent"
                          />
                        ) : null}
                        <View
                          className="shrink-0 overflow-hidden rounded-xl bg-gray-200"
                          style={{
                            height: layout.isSmallPhone ? 90 : 98,
                            width: layout.isSmallPhone ? 90 : 98,
                          }}
                        >
                          <BrandImage
                            source={getEventImageSource(event)}
                            contentFit="cover"
                            style={StyleSheet.absoluteFill}
                          />
                        </View>
                        <View className="min-w-0 flex-1">
                          <View className="mb-1.5 flex-row items-center gap-2">
                            {isLiveNow ? (
                              <View className="flex-row items-center gap-1.5">
                                <View className="h-2 w-2 rounded-full bg-accent" />
                                <Text className="text-[11px] font-bold uppercase text-accent">
                                  Live now
                                </Text>
                              </View>
                            ) : (
                              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                                <Text className="text-[10px] font-semibold uppercase text-primary">
                                  {event.date}
                                </Text>
                              </View>
                            )}
                            {event.isFree && (
                              <Text className="text-[11px] font-bold text-success">Free</Text>
                            )}
                          </View>
                          <Text
                            className="mb-1 font-ui text-[16px] font-bold text-ink"
                            numberOfLines={2}
                          >
                            {event.title}
                          </Text>
                          <Text className="mb-2 text-[12px] text-muted" numberOfLines={1}>
                            {event.venueName}
                          </Text>
                          <View className="flex-row flex-wrap items-center gap-2.5">
                            <View className="flex-row items-center gap-1">
                              <Clock size={12} color={Colors.light.textSecondary} />
                              <Text className="text-[12px] text-muted">
                                {formatEventTimeRange(event)}
                              </Text>
                            </View>
                            <EventEngagementPills
                              attended={getEventEngagement(event, eventStatuses[event.id]).attended}
                              going={getEventEngagement(event, eventStatuses[event.id]).going}
                              interested={
                                getEventEngagement(event, eventStatuses[event.id]).interested
                              }
                              mode={isLiveNow ? 'live' : 'upcoming'}
                            />
                          </View>
                        </View>
                        <ChevronRight
                          size={18}
                          color={Colors.light.inputPlaceholder}
                          style={{ alignSelf: 'center' }}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="gap-3 px-5">
            {organizerProfilesError && (
              <ErrorState
                body="We could not load organizers right now. Check your connection and try again."
                compact
                title="Organizer profiles could not load"
              />
            )}

            {organizerProfilesLoading ? (
              <LoadingState
                body={`Loading approved organizer profiles for ${cityData.name}.`}
                title="Loading organizers"
              />
            ) : filteredOrganizerProfiles.length === 0 ? (
              <EmptyState
                body={`Approved organizers in ${cityData.name} will appear here once they complete their profiles.`}
                title="No organizers yet"
              />
            ) : (
              filteredOrganizerProfiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSelectedOrganizerProfile(profile);
                  }}
                  className="flex-row items-center gap-3 rounded-feature p-3 active:opacity-80"
                  style={[CardStyles.compact, { backgroundColor: Colors.light.backgroundElement }]}
                >
                  <OrganizerAvatar profile={profile} size={52} />
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="shrink text-[16px] font-semibold text-ink" numberOfLines={1}>
                        {profile.name}
                      </Text>
                      <CheckCircle2 size={14} color={Colors.light.background} fill={Colors.light.success} />
                    </View>
                    <View className="mt-1 flex-row items-center gap-1">
                      <MapPin size={12} color={Colors.light.primary} strokeWidth={2.3} />
                      <Text className="flex-1 text-[12px] font-medium text-primary" numberOfLines={1}>
                        {profile.locationName ?? cityData.name}
                      </Text>
                    </View>
                    <Text className="mt-1.5 text-[12px] leading-4 text-muted" numberOfLines={1}>
                      {profile.bio}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.light.primary} />
                </Pressable>
              ))
            )}
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
        venue={null}
        onCheckIn={async (event, checkInCode, location) => {
          const checkInResult = (await onEventCheckIn?.(event, checkInCode, location)) ?? {
            error: 'Check-in is not available right now.',
            success: false,
          };

          if (checkInResult.success) {
            setConfirmedCheckIns((current) => ({
              ...current,
              [event.id]: true,
            }));
          }

          return checkInResult;
        }}
        onClose={closeSelectedEvent}
        cityName={cityData.name}
        organizerEvents={allEvents}
        onOpenOrganizerEvent={(event) => setSelectedEvent(event)}
        organizerProfile={selectedEventOrganizerProfile}
        onToggleStatus={async (eventId, status) =>
          (await onEventStatusChange?.(eventId, eventStatuses[eventId] === status ? null : status)) ?? {
            error: 'RSVP is not available right now.',
          }
        }
        status={selectedDetailStatus}
      />
      <OrganizerProfileModal
        cityName={cityData.name}
        events={allEvents}
        onOpenEvent={(event) => {
          eventReturnOrganizerRef.current = selectedOrganizerProfile;
          setSelectedOrganizerProfile(null);
          setSelectedEvent(event);
        }}
        onClose={() => {
          setSelectedOrganizerProfile(null);
        }}
        profile={selectedOrganizerProfile}
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
  cityName,
  organizerEvents,
  onOpenOrganizerEvent,
  organizerProfile,
  onToggleStatus,
  status,
}: {
  checkedIn: boolean;
  event: CultureEvent | null;
  venue?: Venue | null;
  onCheckIn: (
    event: CultureEvent,
    checkInCode: string,
    location: { latitude: number; longitude: number },
  ) => Promise<EventCheckInResult>;
  onClose: () => void;
  cityName: string;
  organizerEvents: CultureEvent[];
  onOpenOrganizerEvent: (event: CultureEvent) => void;
  organizerProfile?: OrganizerProfile | null;
  onToggleStatus: (
    eventId: string,
    status: 'interested' | 'going',
  ) => Promise<{ error: string | null }>;
  status?: 'interested' | 'going';
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stableTopInset = useStableTopInset();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [statusActionPending, setStatusActionPending] = useState(false);
  const [statusActionToRetry, setStatusActionToRetry] = useState<'interested' | 'going' | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [embeddedOrganizerProfile, setEmbeddedOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (event) {
      translateX.value = 0;
      setEmbeddedOrganizerProfile(null);
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

  function openOrganizerProfile() {
    if (!organizerProfile) {
      return;
    }

    setEmbeddedOrganizerProfile(organizerProfile);
  }

  if (!event) return null;

  const activeEvent = event;
  const verifiedVenue = venue ?? getEventLocationVenue(activeEvent);
  const detailEngagement = getEventEngagement(activeEvent, checkedIn ? 'attended' : status);
  const checkInWindowState = getCheckInWindowState(activeEvent);
  const isLiveNow = checkInWindowState === 'open';

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

    const checkInCode = result.data.trim();
    if (!checkInCode || !locationResult.location) {
      setScanMessage('This QR code could not be verified. Try scanning again.');
      setTimeout(() => setScanLocked(false), 1400);
      return;
    }

    const checkInResult = await onCheckIn(event, checkInCode, locationResult.location);
    if (checkInResult.success) {
      setScannerOpen(false);
      setScanMessage(null);
      setLocationMessage(getCheckInResultMessage(event, checkInResult));
      return;
    }

    setScanMessage(checkInResult.error ?? 'This QR code does not match this event.');
    setTimeout(() => setScanLocked(false), 1400);
  }

  async function handleStatusToggle(nextStatus: 'interested' | 'going') {
    if (!event || statusActionPending) return;

    setStatusActionPending(true);
    setStatusActionError(null);
    setStatusActionToRetry(nextStatus);
    const result = await onToggleStatus(event.id, nextStatus);
    setStatusActionPending(false);

    if (result.error) {
      setStatusActionError(result.error);
      return;
    }

    setStatusActionToRetry(null);
  }

  return (
    <Modal
      animationType="slide"
      transparent
      onRequestClose={embeddedOrganizerProfile ? () => setEmbeddedOrganizerProfile(null) : closeWithAnimation}
      visible
    >
      <GestureDetector gesture={swipeGesture}>
        <Animated.View className="flex-1 bg-canvas" style={swipeStyle}>
          <View className="flex-1 bg-canvas">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
              showsVerticalScrollIndicator={false}
            >
              <View
                className="relative z-10 h-[260px] bg-ink"
                style={{ boxShadow: '0 8px 18px rgba(30, 30, 36, 0.14)' }}
              >
                <BrandImage
                  source={getEventImageSource(event)}
                  contentFit="cover"
                  style={StyleSheet.absoluteFill}
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
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-white/75">
                      {eventCategoryLabels[event.category]}
                    </Text>
                    {isLiveNow ? (
                      <View className="flex-row items-center gap-1.5">
                        <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                        <Text className="text-[11px] font-bold uppercase tracking-wide text-white">
                          Live now
                        </Text>
                      </View>
                    ) : null}
                    {checkedIn && (
                      <View className="rounded-full bg-success px-2.5 py-1">
                        <Text className="text-[11px] font-bold text-white">
                          Attendance confirmed
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    className="font-heading text-[30px] leading-9 text-white"
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
                    disabled={statusActionPending}
                    icon={
                      <BellRing
                        size={17}
                        color={status === 'interested' ? Colors.light.onPrimary : Colors.light.primary}
                      />
                    }
                    label="Interested"
                    onPress={() => handleStatusToggle('interested')}
                  />
                  <StatusButton
                    active={status === 'going'}
                    disabled={statusActionPending}
                    icon={
                      <CheckCircle2
                        size={17}
                        color={status === 'going' ? Colors.light.onPrimary : Colors.light.primary}
                      />
                    }
                    label="Going"
                    onPress={() => handleStatusToggle('going')}
                  />
                </View>

                {statusActionError && (
                  <View className="mb-4 flex-row items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                    <Text className="mr-3 flex-1 text-[13px] leading-5 text-destructive">
                      {statusActionError}
                    </Text>
                    {statusActionToRetry && (
                      <Pressable
                        disabled={statusActionPending}
                        onPress={() => handleStatusToggle(statusActionToRetry)}
                        className="rounded-lg bg-destructive px-3 py-2 active:opacity-85"
                      >
                        <Text className="text-[12px] font-bold text-white">Retry</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                <View
                  className="mb-6 rounded-feature p-4"
                  style={{ backgroundColor: Colors.light.backgroundElement }}
                >
                  <InfoRow icon={<MapPin size={17} color={Colors.light.primary} />} label={event.venueName} />
                  <View className="my-3 h-px bg-primary/10" />
                  <InfoRow
                    icon={<Clock size={17} color={Colors.light.primary} />}
                    label={`${event.date}, ${formatEventTimeRange(event)}`}
                  />
                  <View className="my-3 h-px bg-primary/10" />
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-row items-center gap-2">
                      {isLiveNow ? (
                        <>
                          <CheckCircle2 size={17} color={Colors.light.accent} />
                          <Text className="text-[13px] font-semibold text-ink">
                            {detailEngagement.attended.toLocaleString()} checked in
                          </Text>
                          <Text className="text-[13px] text-muted">·</Text>
                          <Text className="text-[13px] text-muted">
                            {detailEngagement.interested.toLocaleString()} interested
                          </Text>
                        </>
                      ) : (
                        <>
                          <Users size={17} color={Colors.light.primary} />
                          <Text className="text-[13px] font-semibold text-ink">
                            {(detailEngagement.interested + detailEngagement.going).toLocaleString()}{' '}
                            planning to attend
                          </Text>
                        </>
                      )}
                    </View>
                    <View className="rounded-full bg-accent/10 px-3 py-1.5">
                      <Text className="text-[12px] font-semibold text-accent">+{event.xpBonus} XP</Text>
                    </View>
                  </View>
                </View>

                <View className="mb-2 flex-row items-center gap-3">
                  <Text className="font-serifRegular text-[22px] leading-7 text-ink">About</Text>
                  <View className="h-px flex-1 bg-primary/15" />
                </View>
                <Text className="mb-6 text-[14px] leading-6 text-muted">{event.description}</Text>

                <View className="mb-6">
                  <View className="mb-2 flex-row items-center gap-3">
                    <Text className="font-serifRegular text-[22px] leading-7 text-ink">Hosted by</Text>
                    <View className="h-px flex-1 bg-primary/15" />
                  </View>
                  {organizerProfile ? (
                    <Pressable
                      onPress={openOrganizerProfile}
                      className="flex-row items-center gap-3 rounded-feature p-3 active:opacity-85"
                      style={{ backgroundColor: Colors.light.backgroundElement }}
                    >
                      <OrganizerAvatar profile={organizerProfile} size={44} />
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
                          {organizerProfile.name}
                        </Text>
                        <Text className="mt-1 text-[12px] font-semibold text-primary" numberOfLines={1}>
                          {organizerProfile.locationName ?? 'Verified CultureQuest organizer'}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={Colors.light.primary} />
                    </Pressable>
                  ) : (
                    <View
                      className="rounded-feature p-3"
                      style={{ backgroundColor: Colors.light.backgroundElement }}
                    >
                      <Text className="text-[15px] font-bold text-ink">{event.organizerName}</Text>
                      <Text className="mt-1 text-[12px] leading-4 text-muted">
                        Organizer profile is not available yet.
                      </Text>
                    </View>
                  )}
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
                      <View
                        className="mb-3 rounded-xl p-3"
                        style={{ backgroundColor: Colors.light.backgroundElement }}
                      >
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
                        Scan only the official event check-in card at the venue.
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
      {embeddedOrganizerProfile ? (
        <View style={StyleSheet.absoluteFill}>
          <OrganizerProfileModal
            embedded
            cityName={cityName}
            events={organizerEvents}
            onClose={() => setEmbeddedOrganizerProfile(null)}
            onOpenEvent={(nextEvent) => {
              setEmbeddedOrganizerProfile(null);
              onOpenOrganizerEvent(nextEvent);
            }}
            profile={embeddedOrganizerProfile}
          />
        </View>
      ) : null}
    </Modal>
  );
}

function StatusButton({
  active,
  disabled = false,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl ${
        active ? 'bg-primary' : ''
      } ${disabled ? 'opacity-55' : ''}`}
      style={active ? undefined : { backgroundColor: Colors.light.backgroundElement }}
    >
      {icon}
      <Text className={`text-[14px] font-semibold ${active ? 'text-white' : 'text-primary'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function EventEngagementPills({
  attended,
  going,
  interested,
  mode = 'upcoming',
}: {
  attended: number;
  going: number;
  interested: number;
  mode?: 'live' | 'upcoming';
}) {
  const metrics =
    mode === 'live'
      ? [
          {
            icon: <CheckCircle2 size={12} color={Colors.light.accent} strokeWidth={2.4} />,
            value: attended,
          },
          {
            icon: <Users size={12} color={Colors.light.primary} strokeWidth={2.4} />,
            value: interested,
          },
        ]
      : [
          {
            icon: <Users size={12} color={Colors.light.primary} strokeWidth={2.4} />,
            value: interested + going,
          },
        ];

  return (
    <View className="flex-row items-center gap-1.5">
      {metrics.map((metric, index) => (
        <View
          className="flex-row items-center gap-1 rounded-full bg-primary/5 px-2 py-1"
          key={index}
        >
          {metric.icon}
          <Text className="text-[11px] font-bold text-primary">
            {metric.value.toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">{icon}</View>
      <Text className="flex-1 text-[13px] font-medium text-ink">{label}</Text>
    </View>
  );
}

function getCheckInResultMessage(event: CultureEvent, result: EventCheckInResult) {
  if (result.success && result.duplicate) {
    return 'Attendance was already confirmed for this event. XP was not added again.';
  }

  if (result.success) {
    const xpEarned = result.xpEarned && result.xpEarned > 0 ? result.xpEarned : event.xpBonus;
    const balanceLabel =
      typeof result.totalXp === 'number' ? ` New balance: ${result.totalXp.toLocaleString()} XP.` : '';

    return `Attendance verified. +${xpEarned.toLocaleString()} XP for ${event.title}.${balanceLabel}`;
  }

  return result.error || 'Attendance could not be confirmed. Try again.';
}

function getEventImageSource(event: CultureEvent) {
  if (event.imageUrl) {
    return { uri: event.imageUrl };
  }
  if (event.organizerAvatarUrl) {
    return { uri: event.organizerAvatarUrl };
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
    color: Colors.light.primary,
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

function getEventStartTimestamp(event: CultureEvent) {
  if (!event.startsAt) return Number.POSITIVE_INFINITY;

  const startsAt = Date.parse(event.startsAt);
  return Number.isNaN(startsAt) ? Number.POSITIVE_INFINITY : startsAt;
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
