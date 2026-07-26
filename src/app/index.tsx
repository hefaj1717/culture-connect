import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, Bell, Globe, User, X } from 'lucide-react-native';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import MapView, { Circle as MapCircle, Marker } from 'react-native-maps';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandImage } from '@/components/brand-image';
import { Colors } from '@/constants/theme';
import { cultureMapStyle } from '@/constants/map-style';
import {
  type CultureCityData,
  type CultureEvent,
  getCultureCityData,
  languageLabels,
} from '@/data/culture';
import type { OrganizerApplicationStatus } from '@/providers/auth-provider';

const notifications = [
  {
    id: 'pilot-live',
    title: 'Leuven Pilot is live',
    message: 'Start exploring today and earn your first XP reward.',
    time: 'Now',
    unread: true,
  },
  {
    id: 'dance-night',
    title: 'Event tonight',
    message: 'Student Dance Night starts at STUK Arts Centre.',
    time: 'Today',
    unread: true,
  },
  {
    id: 'coffee-reward',
    title: 'Reward nearby',
    message: 'A cafe reward unlocks after two more check-ins.',
    time: 'This week',
    unread: false,
  },
];

type HomeScreenProps = {
  avatarInitials?: string | null;
  avatarUrl?: string | null;
  cityData?: CultureCityData;
  events?: CultureEvent[];
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
  organizerApplicationStatus = 'none',
  onOpenDiscover,
  onOpenEvent,
  onOpenProfile,
}: HomeScreenProps) {
  const happeningNow = events.slice(0, 3);
  const activitySpots = useMemo(() => {
    const venueSpots = cityData.venues
      .map((venue) => {
        const venueEvents = events.filter(
          (event) => event.venueId === venue.id || event.venueName === venue.name,
        );

        return {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          eventCount: venueEvents.length,
          attendeeCount:
            venueEvents.reduce((total, event) => total + event.attendeeCount, 0) ||
            Math.max(12, Math.round(venue.checkIns * 0.18)),
          nextEvent: venueEvents[0],
          coordinates: venue.coordinates,
        };
      })
      .filter((spot) => !!spot.coordinates);

    const eventOnlySpots = events
      .filter(
        (event) =>
          event.venueCoordinates &&
          !cityData.venues.some(
            (venue) => venue.id === event.venueId || venue.name === event.venueName,
          ),
      )
      .map((event) => ({
        id: event.venueId,
        name: event.venueName,
        address: event.venueAddress ?? cityData.name,
        eventCount: 1,
        attendeeCount: event.attendeeCount,
        nextEvent: event,
        coordinates: event.venueCoordinates!,
      }));

    const mapSpots = [...venueSpots, ...eventOnlySpots];

    if (mapSpots.length === 0) return [];

    const maxActivity = Math.max(
      ...mapSpots.map((spot) => spot.attendeeCount + spot.eventCount * 35),
      1,
    );

    return mapSpots
      .map((spot) => {
        const activityScore = spot.attendeeCount + spot.eventCount * 35;
        const intensity = activityScore / maxActivity;

        return {
          ...spot,
          activityScore,
          intensity,
          color: getActivityColor(intensity),
          radius: 170 + intensity * 300,
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore);
  }, [cityData.name, cityData.venues, events]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const selectedActivitySpot =
    activitySpots.find((spot) => spot.id === selectedActivityId) ?? activitySpots[0];
  const activityMapRegion = useMemo(() => getCityMapRegion(cityData), [cityData]);
  const leaderboardRows = useMemo(() => getLeaderboardRows(cityData.id), [cityData.id]);
  const cityLeaderboardXp = useMemo(
    () => leaderboardRows.reduce((total, row) => total + row.xp, 0),
    [leaderboardRows],
  );
  const userLeaderboardRow = leaderboardRows.find((row) => row.isUserGroup) ?? leaderboardRows[0];
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

    return organizerNotification ? [organizerNotification, ...notifications] : notifications;
  }, [organizerApplicationStatus]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(
    visibleNotifications.some((notification) => notification.unread),
  );

  useEffect(() => {
    setSelectedActivityId(null);
  }, [cityData.id]);

  useEffect(() => {
    if (organizerApplicationStatus === 'approved' || organizerApplicationStatus === 'rejected') {
      setHasUnreadNotifications(true);
    }
  }, [organizerApplicationStatus]);

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
        <View className="h-[520px] overflow-hidden bg-ink">
          <BrandImage
            source={getHeroImageSource(cityData.heroImage)}
            contentFit="cover"
            style={StyleSheet.absoluteFillObject}
            withTextGradient
          />

          <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 z-20 px-5">
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

            <View className="mt-10 items-center">
              <View className="flex-row items-center gap-2 rounded-full border border-white/25 bg-white/20 px-4 py-2">
                <View className="h-2 w-2 rounded-full bg-primary" />
                <Text className="text-[12px] font-semibold text-white">{cityData.statusText}</Text>
              </View>
            </View>
          </SafeAreaView>

          <View className="absolute bottom-0 left-0 right-0 px-6 pb-7">
            <Text className="mb-2 font-display text-[42px] font-extrabold leading-[45px] text-white">
              {cityData.heroTitle}
            </Text>
            <Text className="mb-4 max-w-[310px] text-[15px] leading-5 text-white/75">
              {cityData.heroSubtitle}
            </Text>

            <View className="mb-4 rounded-xl bg-secondary/95 px-4 py-2.5">
              <Text className="text-center text-[13px] font-semibold text-white">
                {cityData.pilotText}
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
            {happeningNow.length === 0 ? (
              <View className="w-[260px] rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="font-ui text-[15px] font-extrabold text-ink">
                  No approved events yet
                </Text>
                <Text className="mt-1 text-[12px] leading-4 text-muted">
                  Approved organizer events for {cityData.name} will appear here.
                </Text>
              </View>
            ) : (
              happeningNow.map((event) => (
                <Pressable
                  onPress={() => onOpenEvent?.(event.id)}
                  className="w-[220px] overflow-hidden rounded-2xl border border-gray-200 bg-white active:opacity-85"
                  key={event.id}
                >
                  <View className="h-[112px] bg-gray-200">
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

        {activitySpots.length > 0 && selectedActivitySpot && (
          <View className="bg-white px-5 pb-8">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                City activity
              </Text>
              <Text className="text-[11px] font-semibold text-primary">Now + upcoming</Text>
            </View>

            <View className="overflow-hidden rounded-3xl border border-gray-200 bg-[#EAF0F7]">
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
                  showsPointsOfInterest
                  showsScale={false}
                  showsUserLocation={false}
                  style={StyleSheet.absoluteFillObject}
                  toolbarEnabled={false}
                >
                  {activitySpots.map((spot) => (
                    <MapCircle
                      center={spot.coordinates}
                      fillColor={`${spot.color}45`}
                      key={`${spot.id}-heat`}
                      radius={spot.radius}
                      strokeColor={`${spot.color}88`}
                      strokeWidth={1}
                    />
                  ))}

                  {activitySpots.map((spot) => (
                    <Marker
                      coordinate={spot.coordinates}
                      anchor={{ x: 0.5, y: 0.5 }}
                      key={spot.id}
                      onPress={() => setSelectedActivityId(spot.id)}
                      tracksViewChanges={false}
                    >
                      <View
                        className="h-7 w-7 items-center justify-center rounded-full border-2 border-white"
                        style={{
                          backgroundColor:
                            selectedActivitySpot.id === spot.id ? spot.color : `${spot.color}22`,
                        }}
                      >
                        <View
                          className={`rounded-full border-2 border-white ${
                            selectedActivitySpot.id === spot.id ? 'h-4 w-4' : 'h-3.5 w-3.5'
                          }`}
                          style={{ backgroundColor: spot.color }}
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
                <View className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1">
                  <Text className="text-[10px] font-bold text-muted">Live map</Text>
                </View>
              </View>

              <View className="border-t border-gray-200 bg-white px-4 py-3">
                <View className="mb-3 flex-row items-start justify-between gap-3">
                  <Pressable
                    onPress={() => {
                      if (selectedActivitySpot.nextEvent) {
                        onOpenEvent?.(selectedActivitySpot.nextEvent.id);
                      }
                    }}
                    className="min-w-0 flex-1 active:opacity-70"
                    disabled={!selectedActivitySpot.nextEvent}
                  >
                    <Text className="font-ui text-[15px] font-bold text-ink" numberOfLines={1}>
                      {selectedActivitySpot.name}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
                      {selectedActivitySpot.nextEvent?.title || 'Upcoming culture activity nearby'}
                    </Text>
                  </Pressable>
                  <View className="rounded-full bg-secondary/12 px-3 py-1.5">
                    <Text className="text-[12px] font-bold text-secondary">
                      {selectedActivitySpot.attendeeCount} people
                    </Text>
                  </View>
                </View>

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
        )}

        <View className="px-5 pb-8">
          <Pressable
            onPress={() => setLeaderboardOpen(true)}
            className="overflow-hidden rounded-3xl bg-ink active:opacity-90"
          >
            <LinearGradient
              colors={['rgba(124,58,237,0.72)', 'rgba(36,28,46,0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 18 }}
            >
              <View className="flex-row items-center justify-between gap-4">
                <View className="min-w-0 flex-1">
                  <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/65">
                    Weekly leaderboard
                  </Text>
                  <Text className="font-heading text-[22px] font-extrabold leading-[27px] text-white">
                    Your university is #{userLeaderboardRow.rank} this week
                  </Text>
                  <Text className="mt-2 text-[13px] leading-5 text-white/70">
                    {cityLeaderboardXp.toLocaleString()} XP across {cityData.name}
                  </Text>
                </View>
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <ArrowRight size={19} color="white" strokeWidth={2.6} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
        transparent
        visible={notificationsOpen}
      >
        <Pressable className="flex-1 bg-black/35" onPress={() => setNotificationsOpen(false)}>
          <SafeAreaView className="flex-1 justify-start px-4 pt-2" edges={['top']}>
            <Pressable
              className="overflow-hidden rounded-[30px] bg-white"
              onPress={(event) => event.stopPropagation()}
            >
              <View className="items-center bg-white pt-2">
                <View className="h-1.5 w-10 rounded-full bg-gray-300" />
              </View>

              <LinearGradient
                colors={['rgba(124,58,237,0.12)', 'rgba(244,162,97,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View className="flex-row items-start justify-between px-5 pb-4 pt-4">
                  <View className="min-w-0 flex-1 pr-4">
                    <View className="mb-3 flex-row items-center gap-2">
                      <View className="relative h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                        <Bell size={21} color="white" strokeWidth={2.3} />
                        {visibleNotifications.some((notification) => notification.unread) && (
                          <View className="absolute -left-1 -top-1 min-w-5 items-center justify-center rounded-full bg-destructive px-1 py-0.5">
                            <Text className="text-[10px] font-extrabold leading-3 text-white">
                              {
                                visibleNotifications.filter((notification) => notification.unread)
                                  .length
                              }
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text className="font-heading text-[25px] font-extrabold leading-[29px] text-ink">
                      Updates
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setNotificationsOpen(false)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-white/80 active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Close notifications"
                  >
                    <X size={18} color="#756F7B" strokeWidth={2.4} />
                  </Pressable>
                </View>
              </LinearGradient>

              <View className="gap-2 bg-white p-3">
                {visibleNotifications.map((notification) => (
                  <Pressable
                    key={notification.id}
                    className="flex-row gap-3 rounded-2xl border border-primary/10 bg-primary/5 px-3 py-3.5 active:opacity-80"
                    onPress={() => setNotificationsOpen(false)}
                  >
                    <View className="pt-1.5">
                      <View
                        className={`h-2.5 w-2.5 rounded-full ${
                          notification.unread ? 'bg-destructive' : 'bg-primary/35'
                        }`}
                      />
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="mb-1 flex-row items-center justify-between gap-3">
                        <Text className="min-w-0 flex-1 text-[15px] font-extrabold text-ink">
                          {notification.title}
                        </Text>
                        <View className="rounded-full bg-white px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-muted">
                            {notification.time}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[13px] leading-5 text-muted">
                        {notification.message}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      <LeaderboardModal
        onClose={() => setLeaderboardOpen(false)}
        rows={leaderboardRows}
        visible={leaderboardOpen}
      />
    </View>
  );
}

function getHeroImageSource(heroImage: CultureCityData['heroImage']) {
  if (heroImage === 'lublin') {
    return require('@/assets/images/culture/hero-lublin.jpg');
  }

  return require('@/assets/images/culture/hero-culture.jpg');
}

type LeaderboardRow = {
  id: string;
  name: string;
  shortName: string;
  xp: number;
  rank: number;
  isUserGroup?: boolean;
};

function LeaderboardModal({
  onClose,
  rows,
  visible,
}: {
  onClose: () => void;
  rows: LeaderboardRow[];
  visible: boolean;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stableTopInset = Math.max(insets.top, 44);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = 0;
    }
  }, [translateX, visible]);

  const swipeGesture = Gesture.Pan()
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

  return (
    <Modal animationType="slide" onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <View className="px-5 pb-4" style={{ paddingTop: stableTopInset + 12 }}>
              <Pressable
                onPress={closeWithAnimation}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <ArrowLeft size={20} color="#241C2E" strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 36 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="px-5">
                <View className="mb-4 overflow-hidden rounded-3xl bg-ink">
                  <LinearGradient
                    colors={['rgba(124,58,237,0.78)', 'rgba(36,28,46,0.98)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18 }}
                  >
                    <Text className="text-[12px] font-semibold uppercase tracking-wide text-white/70">
                      Campus race
                    </Text>
                    <Text className="mt-1 font-heading text-[28px] font-extrabold leading-[32px] text-white">
                      {rows[0]?.name} leads with {rows[0]?.xp.toLocaleString()} XP
                    </Text>
                  </LinearGradient>
                </View>

                <View className="gap-3">
                  {rows.map((row) => (
                    <View
                      key={row.id}
                      className={`flex-row items-center gap-3 rounded-2xl border p-3 ${
                        row.isUserGroup
                          ? 'border-accent/40 bg-accent/10'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <View
                        className={`h-11 w-11 items-center justify-center rounded-2xl ${
                          row.rank <= 3 ? 'bg-primary' : 'bg-gray-100'
                        }`}
                      >
                        <Text
                          className={`font-ui text-[15px] font-extrabold ${
                            row.rank <= 3 ? 'text-white' : 'text-muted'
                          }`}
                        >
                          #{row.rank}
                        </Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="min-w-0 flex-1 text-[15px] font-extrabold text-ink">
                            {row.name}
                          </Text>
                          {row.isUserGroup && (
                            <View className="rounded-full bg-accent px-2 py-0.5">
                              <Text className="text-[10px] font-extrabold text-white">YOU</Text>
                            </View>
                          )}
                        </View>
                        <Text className="mt-0.5 text-[12px] font-medium text-muted">
                          {row.shortName}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="font-ui text-[15px] font-extrabold text-primary">
                          {row.xp.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function getLeaderboardRows(cityId: CultureCityData['id']): LeaderboardRow[] {
  if (cityId === 'lublin') {
    return [
      {
        id: 'pollub',
        name: 'Lublin University of Technology',
        shortName: 'Politechnika Lubelska',
        xp: 14820,
        rank: 1,
      },
      {
        id: 'umcs',
        name: 'Maria Curie-Sklodowska University',
        shortName: 'UMCS',
        xp: 13760,
        rank: 2,
        isUserGroup: true,
      },
      {
        id: 'kul',
        name: 'John Paul II Catholic University',
        shortName: 'KUL',
        xp: 12910,
        rank: 3,
      },
      {
        id: 'umlub',
        name: 'Medical University of Lublin',
        shortName: 'UMLub',
        xp: 11140,
        rank: 4,
      },
    ];
  }

  return [
    {
      id: 'ucll',
      name: 'UCLL Applied Sciences',
      shortName: 'UCLL',
      xp: 15480,
      rank: 1,
    },
    {
      id: 'ku-leuven',
      name: 'KU Leuven',
      shortName: 'KU Leuven',
      xp: 14630,
      rank: 2,
      isUserGroup: true,
    },
    {
      id: 'luca',
      name: 'LUCA School of Arts',
      shortName: 'LUCA',
      xp: 11870,
      rank: 3,
    },
    {
      id: 'imec',
      name: 'International Student Houses',
      shortName: 'ISH',
      xp: 10240,
      rank: 4,
    },
  ];
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

function getActivityColor(intensity: number) {
  if (intensity >= 0.78) return '#EF4444';
  if (intensity >= 0.52) return '#F97316';
  return '#F59E0B';
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

  const fallbackCenter = cityData.venues[0]?.coordinates;

  return {
    latitude: fallbackCenter?.latitude ?? 50.8798,
    longitude: fallbackCenter?.longitude ?? 4.7005,
    latitudeDelta: 0.045,
    longitudeDelta: 0.045,
  };
}
