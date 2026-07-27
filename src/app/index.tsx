import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { ArrowRight, Bell, CheckCircle2, Globe, User, Users, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import MapView, { Circle as MapCircle, Marker } from 'react-native-maps';

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
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { OrganizerApplicationStatus } from '@/providers/auth-provider';

type HomeScreenProps = {
  avatarInitials?: string | null;
  avatarUrl?: string | null;
  cityData?: CultureCityData;
  events?: CultureEvent[];
  eventsError?: string | null;
  eventsLoading?: boolean;
  eventStatuses?: Record<string, UserEventStatus>;
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
  organizerApplicationStatus = 'none',
  onOpenDiscover,
  onOpenEvent,
  onOpenProfile,
}: HomeScreenProps) {
  const stableTopInset = useStableTopInset();
  const [canShowUserLocation, setCanShowUserLocation] = useState(false);
  const happeningNow = events.slice(0, 3);
  const activitySpots = useMemo(() => {
    const mapSpots = events.reduce<
      {
        id: string;
        name: string;
        address: string;
        eventCount: number;
        attendedCount: number;
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
          interestedCount: engagement.interested,
          nextEvent: event,
          coordinates,
        },
      ];
    }, []);

    if (mapSpots.length === 0) return [];

    const maxActivity = Math.max(
      ...mapSpots.map(
        (spot) => spot.interestedCount * 12 + spot.attendedCount * 24 + spot.eventCount * 35,
      ),
      1,
    );

    return mapSpots
      .map((spot) => {
        const activityScore =
          spot.interestedCount * 12 + spot.attendedCount * 24 + spot.eventCount * 35;
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
        <View className="h-[520px] overflow-hidden bg-ink">
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
            {eventsLoading ? (
              <HomeEventStateCard
                body={`Loading approved events for ${cityData.name}.`}
                title="Loading events"
              />
            ) : eventsError ? (
              <HomeEventStateCard
                body="Check your Supabase connection or apply the latest migrations, then refresh the app."
                title="Events could not load"
              />
            ) : happeningNow.length === 0 ? (
              <View
                className="w-[260px] rounded-2xl border border-primary/10 bg-white p-4"
                style={CardStyles.compact}
              >
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
                  className="w-[220px] overflow-hidden rounded-2xl border border-primary/10 bg-white active:opacity-85"
                  style={CardStyles.compact}
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
                          selectedActivitySpot?.id === spot.id ? spot.color : `${spot.color}22`,
                      }}
                    >
                      <View
                        className={`rounded-full border-2 border-white ${
                          selectedActivitySpot?.id === spot.id ? 'h-4 w-4' : 'h-3.5 w-3.5'
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
                <View className="mb-3">
                  <Text className="font-ui text-[15px] font-bold text-ink">
                    Event activity unavailable
                  </Text>
                  <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                    Approved events could not load from Supabase.
                  </Text>
                </View>
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
                      {selectedActivitySpot.attendedCount.toLocaleString()} attended
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="mb-3">
                  <Text className="font-ui text-[15px] font-bold text-ink">
                    No approved event activity yet
                  </Text>
                  <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                    {eventsLoading
                      ? 'Loading approved organizer events for this city.'
                      : 'Once an organizer event is approved, it will appear on this map.'}
                  </Text>
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
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
        transparent
        visible={notificationsOpen}
      >
        <Pressable className="flex-1 bg-black/35" onPress={() => setNotificationsOpen(false)}>
          <View className="flex-1 justify-start px-4" style={{ paddingTop: stableTopInset + 8 }}>
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
                {visibleNotifications.length === 0 ? (
                  <View className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-5">
                    <Text className="text-[15px] font-extrabold text-ink">No updates yet</Text>
                    <Text className="mt-1 text-[13px] leading-5 text-muted">
                      Account, organizer, and event updates will appear here when they are created.
                    </Text>
                  </View>
                ) : (
                  visibleNotifications.map((notification) => (
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
                  ))
                )}
              </View>
            </Pressable>
          </View>
        </Pressable>
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

function MiniEngagementStat({ icon, value }: { icon: ReactNode; value: number }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-primary/5 px-2 py-1">
      {icon}
      <Text className="text-[10px] font-extrabold text-primary">{value.toLocaleString()}</Text>
    </View>
  );
}

function HomeEventStateCard({ body, title }: { body: string; title: string }) {
  return (
    <View
      className="w-[260px] rounded-2xl border border-primary/10 bg-white p-4"
      style={CardStyles.compact}
    >
      <Text className="font-ui text-[15px] font-extrabold text-ink">{title}</Text>
      <Text className="mt-1 text-[12px] leading-4 text-muted">{body}</Text>
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
