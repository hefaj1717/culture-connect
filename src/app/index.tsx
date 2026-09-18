import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { ArrowRight, Bell, CheckCircle2, Globe, User, Users, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import MapView, { Marker } from 'react-native-maps';

import { CardListSkeleton, EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { BrandImage } from '@/components/brand-image';
import { CardStyles, Colors } from '@/constants/theme';
import { cultureMapStyle } from '@/constants/map-style';
import {
  type CultureCityData,
  type CultureEvent,
  getCultureCityData,
  languageLabels,
} from '@/data/culture';
import { getEventEngagement } from '@/lib/event-engagement';
import type { UserEventStatus } from '@/lib/event-history';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { UniversityLeaderboardRow } from '@/lib/university-leaderboard';

type HomeScreenProps = {
  avatarInitials?: string | null;
  avatarUrl?: string | null;
  cityData?: CultureCityData;
  events?: CultureEvent[];
  eventsError?: string | null;
  eventsLoading?: boolean;
  eventStatuses?: Record<string, UserEventStatus>;
  leaderboard?: UniversityLeaderboardRow[];
  leaderboardError?: string | null;
  leaderboardLoading?: boolean;
  onOpenDiscover?: () => void;
  onOpenEvent?: (eventId: string) => void;
  onOpenProfile?: () => void;
};

export default function HomeScreen({
  avatarInitials,
  avatarUrl,
  cityData = getCultureCityData(),
  events = [],
  eventsError = null,
  eventsLoading = false,
  eventStatuses = {},
  leaderboard = [],
  leaderboardError = null,
  leaderboardLoading = false,
  onOpenDiscover,
  onOpenEvent,
  onOpenProfile,
}: HomeScreenProps) {
  const stableTopInset = useStableTopInset();
  const layout = useResponsiveLayout();
  const [canShowUserLocation, setCanShowUserLocation] = useState(false);
  const [isMapInteractive, setIsMapInteractive] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const happeningNow = useMemo(
    () =>
      events
        .filter(isEventLiveNow)
        .sort((eventA, eventB) => getEventStartTimestamp(eventA) - getEventStartTimestamp(eventB))
        .slice(0, 3),
    [events],
  );
  const eventsThisWeekCount = useMemo(() => countEventsThisWeek(events), [events]);
  const weeklyEventMessage = useMemo(() => {
    if (eventsLoading) return `Checking this week's events in ${cityData.name}`;
    if (eventsError) return `Fresh ${cityData.name} events update soon`;
    if (eventsThisWeekCount === 0) return `No events scheduled in ${cityData.name} this week yet`;
    if (eventsThisWeekCount === 1) return `1 event in ${cityData.name} this week`;
    return `${eventsThisWeekCount} events in ${cityData.name} this week`;
  }, [cityData.name, eventsError, eventsLoading, eventsThisWeekCount]);
  const activitySpots = useMemo(() => {
    const mapSpots = events.reduce<
      {
        id: string;
        name: string;
        address: string;
        eventCount: number;
        attendedCount: number;
        goingCount: number;
        nextEvent: CultureEvent;
        interestedCount: number;
        coordinates: { latitude: number; longitude: number };
      }[]
    >((spots, event) => {
      const coordinates = event.venueCoordinates;

      if (!coordinates) return spots;

      const engagement = getEventEngagement(event, eventStatuses[event.id]);
      const existingSpot = spots.find((spot) => spot.id === event.venueId);
      if (existingSpot) {
        existingSpot.eventCount += 1;
        existingSpot.attendedCount += engagement.attended;
        existingSpot.goingCount += engagement.going;
        existingSpot.interestedCount += engagement.interested;
        return spots;
      }

      return [
        ...spots,
        {
          id: event.venueId,
          name: event.venueName,
          address: event.venueAddress ?? cityData.name,
          attendedCount: engagement.attended,
          eventCount: 1,
          goingCount: engagement.going,
          interestedCount: engagement.interested,
          nextEvent: event,
          coordinates,
        },
      ];
    }, []);

    if (mapSpots.length === 0) return [];

    const activityScores = mapSpots.map(
      (spot) => spot.interestedCount + spot.goingCount + spot.attendedCount,
    );
    const maxActivity = Math.max(...activityScores, 0);

    return mapSpots
      .map((spot) => {
        const activityScore = spot.interestedCount + spot.goingCount + spot.attendedCount;
        const intensity = maxActivity > 0 ? activityScore / maxActivity : 0;

        return {
          ...spot,
          activityScore,
          intensity,
          color: getActivityColor(intensity),
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore);
  }, [cityData.name, eventStatuses, events]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const selectedActivitySpot =
    activitySpots.find((spot) => spot.id === selectedActivityId) ?? activitySpots[0];
  const activityMapRegion = useMemo(() => getCityMapRegion(cityData), [cityData]);
  useEffect(() => {
    let mounted = true;

    async function enableUserLocationOnMap() {
      const currentPermission = await Location.getForegroundPermissionsAsync();
      const permission =
        currentPermission.status === 'granted'
          ? currentPermission
          : await Location.requestForegroundPermissionsAsync();

      if (mounted) {
        setCanShowUserLocation(permission.status === 'granted');
      }
    }

    enableUserLocationOnMap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedActivityId(null);
    setIsMapInteractive(true);
  }, [cityData.id]);

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingBottom: 104 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden bg-ink" style={{ height: layout.heroHeight }}>
          <BrandImage
            source={getHeroImageSource(cityData.heroImage)}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            withTextGradient
          />

          <View
            className="absolute left-0 right-0 top-0 z-20 px-5"
            style={{ paddingTop: stableTopInset }}
          >
            <View className="flex-row items-center justify-between pt-3">
              <Text className="font-heading text-[23px] font-extrabold text-white">
                CultureQuest
              </Text>
              <View className="flex-row items-center gap-3">
                <Pressable onPress={() => setNotificationsOpen(true)} className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-80" accessibilityLabel="Open notifications">
                  <Bell size={22} color="white" strokeWidth={2.2} />
                </Pressable>
                <Pressable
                  onPress={onOpenProfile}
                  className="h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary active:opacity-85"
                >
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      contentFit="cover"
                      style={{ height: 44, width: 44 }}
                    />
                  ) : avatarInitials ? (
                    <Text className="text-[13px] font-extrabold text-white">{avatarInitials}</Text>
                  ) : (
                    <User size={22} color="white" strokeWidth={2.4} />
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          <View className="absolute bottom-0 left-0 right-0 px-6 pb-7">
            <Text
              className="mb-2 font-display font-extrabold text-white"
              style={{
                fontSize: layout.isSmallPhone ? 36 : 42,
                lineHeight: layout.isSmallPhone ? 39 : 45,
              }}
            >
              {cityData.heroTitle}
            </Text>
            <Text
              className="mb-4 text-[15px] leading-5 text-white/75"
              style={{ maxWidth: Math.min(310, layout.usableWidth) }}
            >
              {cityData.heroSubtitle}
            </Text>

            <View className="mb-4 rounded-xl bg-secondary/95 px-4 py-2.5">
              <Text className="text-center text-[13px] font-semibold text-white">
                {weeklyEventMessage}
              </Text>
            </View>

            <Pressable
              onPress={onOpenDiscover}
              className="h-[52px] flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
            >
              <Text className="text-[16px] font-semibold text-white">Start Exploring</Text>
              <ArrowRight size={17} color="white" />
            </Pressable>
          </View>
        </View>

        <View className="pb-5 pt-6">
          <View className="mb-4 flex-row items-center gap-1.5 px-5">
            <View className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Happening Now
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {eventsLoading ? (
              <CardListSkeleton count={1} style={{ width: layout.stateCardWidth }} />
            ) : eventsError ? (
              <ErrorState
                body="We could not load events right now. Check your connection and try again."
                compact
                style={{ width: layout.stateCardWidth }}
                title="Events could not load"
              />
            ) : happeningNow.length === 0 ? (
              <EmptyState
                body={`Live events in ${cityData.name} will appear here during their scheduled time.`}
                compact
                style={{ width: layout.stateCardWidth }}
                title="Nothing live right now"
              />
            ) : (
              happeningNow.map((event) => (
                <Pressable
                  onPress={() => onOpenEvent?.(event.id)}
                  className="overflow-hidden rounded-2xl border border-primary/10 bg-white active:opacity-85"
                  style={[CardStyles.compact, { width: layout.cardWidth }]}
                  key={event.id}
                >
                  <View className="bg-gray-200" style={{ height: layout.eventImageHeight }}>
                    <BrandImage
                      source={getEventImageSource(event)}
                      contentFit="cover"
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <View className="p-3">
                    <Text className="mb-1 text-[14px] font-bold text-ink" numberOfLines={2}>
                      {event.title}
                    </Text>
                    <Text className="mb-2 text-[12px] text-muted" numberOfLines={1}>
                      {event.date} · {event.venueName}
                    </Text>
                    <View className="mb-2 flex-row gap-1.5">
                      <MiniEngagementStat
                        icon={<Users size={12} color={Colors.light.primary} strokeWidth={2.4} />}
                        value={getEventEngagement(event, eventStatuses[event.id]).interested}
                      />
                      <MiniEngagementStat
                        icon={<CheckCircle2 size={12} color={Colors.light.primary} strokeWidth={2.4} />}
                        value={getEventEngagement(event, eventStatuses[event.id]).attended}
                      />
                    </View>
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-[12px] font-bold text-primary">
                        +{event.xpBonus} XP
                      </Text>
                      {event.isFree && (
                        <View className="rounded-full bg-success/10 px-1.5 py-0.5">
                          <Text className="text-[10px] font-bold text-success">Free</Text>
                        </View>
                      )}
                      <View className="flex-row items-center gap-1">
                        <Globe size={12} color={Colors.light.textSecondary} />
                        <Text className="text-[11px] font-medium text-muted">
                          {languageLabels[event.language]}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
      </ScrollView>
      <Modal animationType="slide" transparent visible={notificationsOpen} onRequestClose={() => setNotificationsOpen(false)}>
        <View className="flex-1 justify-end bg-black/30"><View className="rounded-t-3xl bg-white px-5 pb-10 pt-5"><View className="flex-row items-center justify-between"><Text className="font-heading text-[24px] font-extrabold text-ink">Notifications</Text><Pressable onPress={() => setNotificationsOpen(false)} accessibilityLabel="Close notifications"><X size={22} color={Colors.light.textSecondary} /></Pressable></View><Text className="mt-5 text-[14px] leading-5 text-muted">Updates about events, rewards, and your account will appear here.</Text></View></View>
      </Modal>
    </View>

        <View className="bg-white px-5 pb-8">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              City activity
            </Text>
            <Text className="text-[11px] font-semibold text-primary">Approved events only</Text>
          </View>

          <View
            className="overflow-hidden rounded-3xl border border-primary/10 bg-[#EAF0F7]"
            style={CardStyles.elevated}
          >
            <View className="h-[210px]">
              <MapView
                initialRegion={activityMapRegion}
                customMapStyle={cultureMapStyle}
                key={cityData.id}
                mapType="standard"
                moveOnMarkerPress={false}
                pitchEnabled={false}
                rotateEnabled={false}
                scrollEnabled={isMapInteractive}
                showsBuildings
                showsCompass={false}
                showsMyLocationButton={canShowUserLocation}
                showsPointsOfInterests
                showsScale={false}
                showsUserLocation={canShowUserLocation}
                style={StyleSheet.absoluteFill}
                toolbarEnabled={false}
                zoomEnabled={isMapInteractive}
              >
                {activitySpots.map((spot) => (
                  <Marker
                    coordinate={spot.coordinates}
                    anchor={{ x: 0.5, y: 0.5 }}
                    key={spot.id}
                    onPress={() => setSelectedActivityId(spot.id)}
                    tracksViewChanges={false}
                  >
                    <View
                      className="h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        shadowColor: '#7F1D1D',
                        shadowOffset: { height: 2, width: 0 },
                        shadowOpacity: selectedActivitySpot?.id === spot.id ? 0.28 : 0.18,
                        shadowRadius: selectedActivitySpot?.id === spot.id ? 8 : 5,
                      }}
                    >
                      <View
                        className="items-center justify-center rounded-full border-[3px] border-white"
                        style={{
                          backgroundColor: spot.color,
                          height: selectedActivitySpot?.id === spot.id ? 24 : 22,
                          width: selectedActivitySpot?.id === spot.id ? 24 : 22,
                        }}
                      />
                    </View>
                  </Marker>
                ))}
              </MapView>
              <View
                pointerEvents="none"
                className="absolute inset-0 bg-ink/5"
                style={{ backgroundColor: `${Colors.light.ink}08` }}
              />
              <View className="absolute left-5 top-5 rounded-full bg-white/80 px-3 py-1">
                <Text className="text-[11px] font-bold text-primary">{cityData.name}</Text>
              </View>
              <Pressable
                disabled={eventsLoading || activitySpots.length === 0}
                onPress={() => setIsMapInteractive((current) => !current)}
                className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 active:opacity-80"
              >
                <Text className="text-[10px] font-bold text-muted">
                  {eventsLoading
                    ? 'Loading events'
                    : activitySpots.length === 0
                      ? 'No live events'
                      : isMapInteractive
                        ? 'Lock map'
                        : 'Move map'}
                </Text>
              </Pressable>
            </View>

            <View className="border-t border-primary/10 bg-white px-4 py-3">
              {eventsError ? (
                <ErrorState
                  body="Approved events could not load from Supabase."
                  compact
                  style={{ marginBottom: 12 }}
                  title="Event activity unavailable"
                  tone="inline"
                />
              ) : selectedActivitySpot ? (
                <View className="mb-3 flex-row items-start justify-between gap-3">
                  <Pressable
                    onPress={() => onOpenEvent?.(selectedActivitySpot.nextEvent.id)}
                    className="min-w-0 flex-1 active:opacity-70"
                  >
                    <Text className="font-ui text-[15px] font-bold text-ink" numberOfLines={1}>
                      {selectedActivitySpot.name}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
                      {selectedActivitySpot.nextEvent.title}
                    </Text>
                  </Pressable>
                  <View className="max-w-[150px] rounded-full bg-secondary/12 px-3 py-1.5">
                    <Text className="text-[12px] font-bold text-secondary" numberOfLines={1}>
                      {selectedActivitySpot.interestedCount.toLocaleString()} interested ·{' '}
                      {selectedActivitySpot.goingCount.toLocaleString()} going ·{' '}
                      {selectedActivitySpot.attendedCount.toLocaleString()} attended
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="mb-3">
                  {eventsLoading ? (
                    <LoadingState
                      body="Loading approved organizer events for this city."
                      compact
                      title="Loading map activity"
                      tone="inline"
                    />
                  ) : (
                    <EmptyState
                      body="The city map will light up once approved events have activity."
                      compact
                      title="No live activity yet"
                      tone="inline"
                    />
                  )}
                </View>
              )}

              <Pressable
                onPress={onOpenDiscover}
                className="h-10 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
              >
                <Text className="text-[13px] font-semibold text-white">Open Discover</Text>
                <ArrowRight size={14} color="white" />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="bg-white px-5 pb-8">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Campus ranking
            </Text>
            <Text className="text-[11px] font-semibold text-primary">{cityData.name}</Text>
          </View>

          <View
            className="overflow-hidden rounded-3xl border border-primary/10 bg-white"
            style={CardStyles.elevated}
          >
            <View className="bg-primary px-4 py-4">
              <Text className="font-heading text-[25px] leading-[29px] text-white">
                University leaderboard
              </Text>
              <Text className="mt-1 text-[12px] leading-4 text-white/70">
                XP counts only for students linked to a university.
              </Text>
            </View>

            <View className="gap-2 p-3">
              {leaderboardLoading ? (
                <LoadingState compact title="Loading universities" tone="inline" />
              ) : leaderboardError ? (
                <ErrorState
                  body="Leaderboard could not load from Supabase."
                  compact
                  title="Campus ranking unavailable"
                  tone="inline"
                />
              ) : leaderboard.length === 0 ? (
                <EmptyState
                  body={`Universities for ${cityData.name} will appear here when the first members join.`}
                  compact
                  title="No universities linked yet"
                  tone="inline"
                />
              ) : (
                leaderboard.slice(0, 5).map((row) => (
                  <View
                    key={row.universityId}
                    className="flex-row items-center gap-3 rounded-2xl bg-canvas px-3 py-3"
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Text className="text-[13px] font-extrabold text-primary">#{row.rank}</Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[14px] font-extrabold text-ink" numberOfLines={1}>
                        {row.shortName}
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>
                        {row.memberCount} linked student{row.memberCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text className="font-heading text-[20px] leading-[24px] text-accentDeep">
                      {row.totalXp.toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

    </View>
  );
}

function getHeroImageSource(heroImage: CultureCityData['heroImage']) {
  if (heroImage === 'lublin') {
    return require('@/assets/images/culture/hero-lublin.jpg');
  }

  return require('@/assets/images/culture/hero-culture.jpg');
}

function getEventImageSource(event: CultureEvent) {
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

function countEventsThisWeek(events: CultureEvent[]) {
  const now = new Date();
  const weekStart = getStartOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return events.filter((event) => {
    const eventDate = getEventDate(event);
    if (!eventDate) return false;

    return eventDate >= weekStart && eventDate < weekEnd;
  }).length;
}

function getStartOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

function getEventDate(event: CultureEvent) {
  if (event.startsAt) {
    const startsAtDate = new Date(event.startsAt);
    if (!Number.isNaN(startsAtDate.getTime())) return startsAtDate;
  }

  const dateMatch = event.date.match(/\b([A-Z][a-z]{2,8})\s+(\d{1,2})\b/);
  if (!dateMatch) return null;

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
  ].indexOf(dateMatch[1].slice(0, 3).toLowerCase());

  if (monthIndex < 0) return null;

  const now = new Date();
  const fallbackDate = new Date(now.getFullYear(), monthIndex, Number(dateMatch[2]));
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

function isEventLiveNow(event: CultureEvent) {
  const now = Date.now();
  const startsAt = event.startsAt ? Date.parse(event.startsAt) : null;
  const endsAt = event.endsAt ? Date.parse(event.endsAt) : null;

  if (!startsAt || Number.isNaN(startsAt) || now < startsAt) return false;
  if (!endsAt || Number.isNaN(endsAt)) return true;

  return now <= endsAt;
}

function getEventStartTimestamp(event: CultureEvent) {
  if (!event.startsAt) return Number.POSITIVE_INFINITY;

  const startsAt = Date.parse(event.startsAt);
  return Number.isNaN(startsAt) ? Number.POSITIVE_INFINITY : startsAt;
}

function getActivityColor(intensity: number) {
  const redScale = [
    '#F87171',
    '#F56565',
    '#F05252',
    '#EB4646',
    '#E43A3A',
    '#DB3232',
    '#D12B2B',
    '#C72525',
    '#BD2020',
    '#B91C1C',
  ];
  const shadeIndex = Math.max(0, Math.min(redScale.length - 1, Math.ceil(intensity * 10) - 1));

  return redScale[shadeIndex];
}

function MiniEngagementStat({ icon, value }: { icon: ReactNode; value: number }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-primary/5 px-2 py-1">
      {icon}
      <Text className="text-[10px] font-extrabold text-primary">{value.toLocaleString()}</Text>
    </View>
  );
}

function getCityMapRegion(cityData: CultureCityData) {
  if (cityData.id === 'lublin') {
    return {
      latitude: 51.2479,
      longitude: 22.5662,
      latitudeDelta: 0.075,
      longitudeDelta: 0.075,
    };
  }

  if (cityData.id === 'leuven') {
    return {
      latitude: 50.8798,
      longitude: 4.7005,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

  return {
    latitude: 50.8798,
    longitude: 4.7005,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };
}
