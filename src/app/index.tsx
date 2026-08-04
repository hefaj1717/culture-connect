import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { ArrowLeft, ArrowRight, Bell, CheckCircle2, Globe, User, Users } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
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
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import type { UniversityLeaderboardRow } from '@/lib/university-leaderboard';
import type { OrganizerApplicationStatus } from '@/providers/auth-provider';

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
  organizerApplicationStatus?: OrganizerApplicationStatus;
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
  organizerApplicationStatus = 'none',
  onOpenDiscover,
  onOpenEvent,
  onOpenProfile,
}: HomeScreenProps) {
  const stableTopInset = useStableTopInset();
  const layout = useResponsiveLayout();
  const [canShowUserLocation, setCanShowUserLocation] = useState(false);
  const happeningNow = events.slice(0, 3);
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
  const visibleNotifications = useMemo(() => {
    const organizerNotification =
      organizerApplicationStatus === 'approved'
        ? {
            id: 'organizer-approved',
            title: 'Organizer approved',
            message: 'Your institution has been approved. Event creation tools are next.',
            time: 'Now',
            unread: true,
          }
        : organizerApplicationStatus === 'rejected'
          ? {
              id: 'organizer-rejected',
              title: 'Organizer application rejected',
              message: 'Your organizer request was not approved. Check your profile for details.',
              time: 'Now',
              unread: true,
            }
          : null;

    return organizerNotification ? [organizerNotification] : [];
  }, [organizerApplicationStatus]);

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(
    visibleNotifications.some((notification) => notification.unread),
  );
  const {
    closeWithAnimation: closeNotificationsWithAnimation,
    gesture: notificationsGesture,
    swipeStyle: notificationsSwipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => setNotificationsOpen(false),
    resetKey: visibleNotifications.map((notification) => notification.id).join('-'),
    visible: notificationsOpen,
  });

  useEffect(() => {
    setSelectedActivityId(null);
  }, [cityData.id]);

  useEffect(() => {
    setHasUnreadNotifications(visibleNotifications.some((notification) => notification.unread));
  }, [visibleNotifications]);

  function openNotifications() {
    setNotificationsOpen(true);
    setHasUnreadNotifications(false);
  }

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
            style={StyleSheet.absoluteFillObject}
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
                <Pressable
                  onPress={openNotifications}
                  className="relative h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Open notifications"
                >
                  <Bell size={24} color="rgba(255,255,255,0.96)" strokeWidth={2.1} />
                  {hasUnreadNotifications && (
                    <View className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-destructive" />
                  )}
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
              <LoadingState
                body={`Checking approved events for ${cityData.name}.`}
                compact
                style={{ width: layout.stateCardWidth }}
                title="Loading events"
              />
            ) : eventsError ? (
              <ErrorState
                body="Check your Supabase connection or apply the latest migrations, then refresh the app."
                compact
                style={{ width: layout.stateCardWidth }}
                title="Events could not load"
              />
            ) : happeningNow.length === 0 ? (
              <EmptyState
                body={`Approved events in ${cityData.name} will appear here as soon as organizers publish them.`}
                compact
                style={{ width: layout.stateCardWidth }}
                title="No events yet"
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
                      style={StyleSheet.absoluteFillObject}
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
                        icon={<Users size={12} color="#7C3AED" strokeWidth={2.4} />}
                        value={getEventEngagement(event, eventStatuses[event.id]).interested}
                      />
                      <MiniEngagementStat
                        icon={<CheckCircle2 size={12} color="#7C3AED" strokeWidth={2.4} />}
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
                        <Globe size={12} color="#756F7B" />
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
                pitchEnabled={false}
                rotateEnabled={false}
                showsBuildings
                showsCompass={false}
                showsMyLocationButton={canShowUserLocation}
                showsPointsOfInterest
                showsScale={false}
                showsUserLocation={canShowUserLocation}
                style={StyleSheet.absoluteFillObject}
                toolbarEnabled={false}
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
                      className="items-center justify-center rounded-full border-[3px] border-white"
                      style={{
                        backgroundColor: spot.color,
                        height: selectedActivitySpot?.id === spot.id ? 28 : 23,
                        shadowColor: '#7F1D1D',
                        shadowOffset: { height: 2, width: 0 },
                        shadowOpacity: selectedActivitySpot?.id === spot.id ? 0.28 : 0.18,
                        shadowRadius: selectedActivitySpot?.id === spot.id ? 8 : 5,
                        width: selectedActivitySpot?.id === spot.id ? 28 : 23,
                      }}
                    />
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
              <View className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1">
                <Text className="text-[10px] font-bold text-muted">
                  {eventsLoading
                    ? 'Loading events'
                    : activitySpots.length > 0
                      ? 'Live map'
                      : 'No live events'}
                </Text>
              </View>
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
            <LinearGradient
              colors={['#241C2E', '#4C1D95']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingHorizontal: 16, paddingVertical: 16 }}
            >
              <Text className="font-heading text-[25px] leading-[29px] text-white">
                University leaderboard
              </Text>
              <Text className="mt-1 text-[12px] leading-4 text-white/70">
                XP counts only for students linked to a university.
              </Text>
            </LinearGradient>

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
                  body={`Universities for ${cityData.name} will appear here after the setup migration.`}
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

      <Modal
        animationType="none"
        onRequestClose={closeNotificationsWithAnimation}
        transparent
        visible={notificationsOpen}
      >
        <GestureDetector gesture={notificationsGesture}>
          <Animated.View className="flex-1 bg-white" style={notificationsSwipeStyle}>
            <View
              className="flex-row items-center bg-white px-5 pb-3"
              style={{ paddingTop: stableTopInset + 6 }}
            >
              <Pressable
                onPress={closeNotificationsWithAnimation}
                className="h-11 w-11 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
              >
                <ArrowLeft size={22} color="#756F7B" strokeWidth={2.6} />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1 bg-white"
              contentContainerStyle={{
                gap: 18,
                paddingHorizontal: 20,
                paddingTop: 10,
                paddingBottom: 40,
              }}
              showsVerticalScrollIndicator={false}
            >
              {visibleNotifications.length === 0 ? (
                <View className="pt-2">
                  <Text className="mb-3 text-[13px] font-extrabold uppercase tracking-[2px] text-muted">
                    Today
                  </Text>
                  <Text className="font-heading text-[26px] leading-[31px] text-ink">
                    Quiet for now
                  </Text>
                  <Text className="mt-2 max-w-[310px] text-[14px] leading-6 text-muted">
                    Important account and CultureQuest updates will appear here when there is
                    something new.
                  </Text>
                </View>
              ) : (
                <View className="gap-1">
                  <Text className="mb-2 text-[13px] font-extrabold uppercase tracking-[2px] text-muted">
                    Today
                  </Text>
                  {visibleNotifications.map((notification) => (
                    <Pressable
                      key={notification.id}
                      className="flex-row items-start gap-3 border-b border-gray-100 py-4 active:opacity-75"
                      onPress={closeNotificationsWithAnimation}
                    >
                      <View className="mt-2 h-2.5 w-2.5 rounded-full bg-destructive" />
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-start justify-between gap-3">
                          <Text className="min-w-0 flex-1 text-[15px] leading-6 text-ink">
                            <Text className="font-extrabold">{notification.title}</Text>
                            {'  '}
                            <Text className="text-muted">{notification.message}</Text>
                          </Text>
                          <Text className="pt-0.5 text-[12px] font-bold text-primary">
                            {notification.time}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}

                  <View className="pt-6">
                    <Text className="mb-2 text-[13px] font-extrabold uppercase tracking-[2px] text-muted">
                      Earlier
                    </Text>
                    <View className="flex-row items-start gap-3 py-4 opacity-80">
                      <View className="mt-2 h-2.5 w-2.5 rounded-full bg-primary/25" />
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] leading-6 text-muted">
                          Older organizer, event, and reward updates will appear here.
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </GestureDetector>
      </Modal>
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

function getActivityColor(intensity: number) {
  const redScale = [
    '#FEE2E2',
    '#FECACA',
    '#FCA5A5',
    '#F87171',
    '#EF4444',
    '#DC2626',
    '#B91C1C',
    '#991B1B',
    '#7F1D1D',
    '#5F1111',
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
      latitudeDelta: 0.055,
      longitudeDelta: 0.055,
    };
  }

  if (cityData.id === 'leuven') {
    return {
      latitude: 50.8798,
      longitude: 4.7005,
      latitudeDelta: 0.035,
      longitudeDelta: 0.035,
    };
  }

  return {
    latitude: 50.8798,
    longitude: 4.7005,
    latitudeDelta: 0.045,
    longitudeDelta: 0.045,
  };
}
