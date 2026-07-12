import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Bell, Flame, Globe, Sparkles, TrendingUp, User, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import MapView, { Circle as MapCircle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type CultureCityData, getCultureCityData, languageLabels } from '@/data/culture';
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
  organizerApplicationStatus?: OrganizerApplicationStatus;
  onOpenDiscover?: () => void;
  onOpenEvent?: (eventId: string) => void;
  onOpenProfile?: () => void;
};

export default function HomeScreen({
  avatarInitials,
  avatarUrl,
  cityData = getCultureCityData(),
  organizerApplicationStatus = 'none',
  onOpenDiscover,
  onOpenEvent,
  onOpenProfile,
}: HomeScreenProps) {
  const happeningNow = cityData.events.slice(0, 3);
  const activitySpots = useMemo(() => {
    const venuesWithEvents = cityData.venues
      .map((venue) => {
        const venueEvents = cityData.events.filter((event) => event.venueId === venue.id);

        return {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          eventCount: venueEvents.length,
          attendeeCount: venueEvents.reduce((total, event) => total + event.attendeeCount, 0),
          nextEvent: venueEvents[0],
          coordinates: venue.coordinates,
        };
      })
      .filter((spot) => spot.eventCount > 0);

    if (venuesWithEvents.length === 0) return [];

    const maxActivity = Math.max(
      ...venuesWithEvents.map((spot) => spot.attendeeCount + spot.eventCount * 35),
      1,
    );

    return venuesWithEvents
      .map((spot) => {
        const activityScore = spot.attendeeCount + spot.eventCount * 35;
        const intensity = activityScore / maxActivity;

        return {
          ...spot,
          activityScore,
          intensity,
          color: getActivityColor(intensity),
          radius: 180 + intensity * 360,
        };
      })
      .sort((a, b) => b.activityScore - a.activityScore);
  }, [cityData]);
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

    return organizerNotification ? [organizerNotification, ...notifications] : notifications;
  }, [organizerApplicationStatus]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
          <Image
            source={getHeroImageSource(cityData.heroImage)}
            contentFit="cover"
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={['rgba(14,28,58,0.16)', 'rgba(14,28,58,0.28)', 'rgba(14,28,58,0.86)']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
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
            <Flame size={14} color="#F4A261" />
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Happening Now
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {happeningNow.map((event) => (
              <Pressable
                onPress={onOpenDiscover}
                className="w-[220px] overflow-hidden rounded-2xl border border-gray-200 bg-white active:opacity-85"
                key={event.id}
              >
                <View className="h-[112px] bg-gray-200">
                  <Image
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
                    <View className="flex-row items-center gap-0.5">
                      <Sparkles size={12} color="#7C3AED" />
                      <Text className="text-[12px] font-bold text-primary">
                        +{event.xpBonus} XP
                      </Text>
                    </View>
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
            ))}
          </ScrollView>
        </View>

        {activitySpots.length > 0 && (
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
                      key={spot.id}
                      onPress={() => setSelectedActivityId(spot.id)}
                      tracksViewChanges={false}
                    >
                      <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-secondary">
                        <View className="h-1.5 w-1.5 rounded-full bg-white" />
                      </View>
                    </Marker>
                  ))}
                </MapView>
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

        <View className="px-5">
          <View className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
            <View className="mb-2 flex-row items-center gap-2">
              <TrendingUp size={16} color="#7C3AED" />
              <Text className="text-[13px] font-semibold text-primary">Level up tip</Text>
            </View>
            <Text className="text-[14px] leading-5 text-ink/80">{cityData.levelTip}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
        transparent
        visible={notificationsOpen}
      >
        <Pressable
          className="flex-1 justify-start bg-black/30 px-4 pt-14"
          onPress={() => setNotificationsOpen(false)}
        >
          <Pressable
            className="overflow-hidden rounded-[26px] bg-white shadow-lg"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="flex-row items-start justify-between px-5 pb-4 pt-5">
              <View>
                <Text className="font-heading text-[22px] font-bold tracking-tight text-ink">
                  Notifications
                </Text>
                <Text className="mt-1 text-[13px] text-muted">
                  {visibleNotifications.filter((notification) => notification.unread).length} new
                  updates
                </Text>
              </View>
              <Pressable
                onPress={() => setNotificationsOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Close notifications"
              >
                <X size={17} color="#756F7B" strokeWidth={2.3} />
              </Pressable>
            </View>

            <View className="border-t border-gray-100">
              {visibleNotifications.map((notification, index) => (
                <Pressable
                  key={notification.id}
                  className="flex-row gap-3 px-5 py-4 active:bg-gray-50"
                  onPress={() => setNotificationsOpen(false)}
                >
                  <View className="pt-1.5">
                    <View
                      className={`h-2.5 w-2.5 rounded-full ${
                        notification.unread ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    />
                  </View>
                  <View
                    className={`min-w-0 flex-1 ${
                      index === visibleNotifications.length - 1
                        ? ''
                        : 'border-b border-gray-100 pb-4'
                    }`}
                  >
                    <View className="mb-1 flex-row items-start justify-between gap-3">
                      <Text className="min-w-0 flex-1 text-[15px] font-semibold text-ink">
                        {notification.title}
                      </Text>
                      <Text className="text-[12px] font-medium text-muted">
                        {notification.time}
                      </Text>
                    </View>
                    <Text className="text-[13px] leading-5 text-muted">{notification.message}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Pressable>
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

function getEventImageSource(event: CultureCityData['events'][number]) {
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
  if (intensity >= 0.78) return '#C2410C';
  if (intensity >= 0.52) return '#F97316';
  return '#FDBA38';
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
