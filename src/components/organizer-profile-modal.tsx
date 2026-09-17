import { Image } from 'expo-image';
import { ArrowLeft, ChevronRight, MapPin } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/async-state';
import { BrandImage } from '@/components/brand-image';
import { CardStyles } from '@/constants/theme';
import type { CultureEvent } from '@/data/culture';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { OrganizerProfile } from '@/lib/organizer-profiles';

type OrganizerProfileModalProps = {
  cityName: string;
  events: CultureEvent[];
  onClose: () => void;
  onOpenEvent: (event: CultureEvent) => void;
  profile: OrganizerProfile | null;
};

export function OrganizerProfileModal({
  cityName,
  events,
  onClose,
  onOpenEvent,
  profile,
}: OrganizerProfileModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stableTopInset = useStableTopInset();
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (profile) {
      translateX.value = 0;
    }
  }, [profile, translateX]);

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

  const organizerEvents = useMemo(() => {
    if (!profile) {
      return [];
    }

    return events.filter((event) => event.organizerId === profile.id);
  }, [events, profile]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();

    return organizerEvents.filter((event) => {
      const endTime = event.endsAt ? Date.parse(event.endsAt) : null;
      return !endTime || Number.isNaN(endTime) || endTime >= now;
    });
  }, [organizerEvents]);

  const previousEvents = useMemo(() => {
    const now = Date.now();

    return organizerEvents.filter((event) => {
      const endTime = event.endsAt ? Date.parse(event.endsAt) : null;
      return !!endTime && !Number.isNaN(endTime) && endTime < now;
    });
  }, [organizerEvents]);
  function closeWithAnimation() {
    translateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }

  function openOrganizerEvent(event: CultureEvent) {
    translateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onOpenEvent)(event);
      }
    });
  }

  if (!profile) return null;

  const organizerBio = getOrganizerBio(profile);
  const organizerLocation = getOrganizerLocation(profile, cityName);

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: insets.bottom + 34,
              paddingTop: stableTopInset + 8,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="px-5">
              <Pressable
                onPress={closeWithAnimation}
                className="mb-6 h-12 w-12 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <ArrowLeft size={22} color="#756F7B" strokeWidth={2.6} />
              </Pressable>

              <View
                className="overflow-hidden rounded-[32px] border border-primary/10 bg-ink p-5"
                style={CardStyles.elevated}
              >
                <View className="mb-8 flex-row items-start justify-between gap-4">
                  <View className="min-w-0 flex-1">
                    <Text className="text-[11px] font-bold uppercase tracking-[3px] text-white/55">
                      CultureQuest organizer
                    </Text>
                    <Text className="mt-3 font-display text-[38px] leading-[42px] text-white">
                      {profile.name}
                    </Text>
                  </View>
                  <OrganizerAvatar dark profile={profile} size={82} />
                </View>

                <View className="rounded-3xl bg-white/10 p-4">
                  <Text
                    className="text-[12px] font-bold uppercase tracking-[2px]"
                    style={{ color: 'rgba(255,255,255,0.58)' }}
                  >
                    About
                  </Text>
                  <Text
                    className="mt-2 text-[15px] leading-6"
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  >
                    {organizerBio}
                  </Text>

                  <View className="mt-4 flex-row items-start gap-2.5 border-t border-white/10 pt-4">
                    <MapPin size={17} color="rgba(255,255,255,0.72)" strokeWidth={2.4} />
                    <View className="min-w-0 flex-1">
                      <Text className="text-[13px] font-semibold text-white" numberOfLines={1}>
                        {organizerLocation.title}
                      </Text>
                      <Text
                        className="mt-0.5 text-[12px] leading-4"
                        numberOfLines={2}
                        style={{ color: 'rgba(255,255,255,0.68)' }}
                      >
                        {organizerLocation.subtitle}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="mt-7">
                <View className="mb-3 flex-row items-end justify-between">
                  <Text className="font-display text-[30px] leading-9 text-ink">Events</Text>
                  <Text className="pb-1 text-[12px] font-semibold uppercase tracking-wide text-muted">
                    {organizerEvents.length} total
                  </Text>
                </View>

                <OrganizerEventGroup
                  emptyLabel="No upcoming events yet."
                  events={upcomingEvents}
                  onPress={openOrganizerEvent}
                  title="Upcoming"
                />
                <OrganizerEventGroup
                  emptyLabel="No previous events yet."
                  events={previousEvents}
                  onPress={openOrganizerEvent}
                  title="Previous"
                />
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

export function OrganizerAvatar({
  dark = false,
  profile,
  size,
}: {
  dark?: boolean;
  profile: OrganizerProfile;
  size: number;
}) {
  const initials = getOrganizerInitials(profile.name);

  return (
    <View
      className={`shrink-0 overflow-hidden rounded-2xl ${dark ? 'bg-white/10' : 'bg-primary/10'}`}
      style={{ height: size, width: size }}
    >
      {profile.avatarUrl ? (
        <Image source={{ uri: profile.avatarUrl }} style={StyleSheet.absoluteFill} />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text
            className={`font-ui font-extrabold ${dark ? 'text-white' : 'text-primary'}`}
            style={{ fontSize: Math.max(16, size * 0.32) }}
          >
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
}

function OrganizerEventGroup({
  emptyLabel,
  events,
  onPress,
  title,
}: {
  emptyLabel: string;
  events: CultureEvent[];
  onPress: (event: CultureEvent) => void;
  title: string;
}) {
  return (
    <View className="mb-5">
      <Text className="mb-2 text-[11px] font-bold uppercase tracking-[2px] text-muted">
        {title}
      </Text>
      {events.length === 0 ? (
        <EmptyState body={emptyLabel} compact title="No events here yet" />
      ) : (
        <View className="gap-3">
          {events.map((event) => (
            <OrganizerProfileEventRow key={event.id} event={event} onPress={() => onPress(event)} />
          ))}
        </View>
      )}
    </View>
  );
}

function OrganizerProfileEventRow({
  event,
  onPress,
}: {
  event: CultureEvent;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-3xl border border-primary/10 bg-white p-3 active:opacity-85"
      style={CardStyles.compact}
    >
      <View className="h-[72px] w-[72px] overflow-hidden rounded-2xl bg-gray-200">
        <BrandImage
          source={getEventImageSource(event)}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">
          {event.date} · {formatEventTimeRange(event)}
        </Text>
        <Text className="font-ui text-[15px] font-extrabold text-ink" numberOfLines={1}>
          {event.title}
        </Text>
        <Text className="mt-1 text-[12px] text-muted" numberOfLines={1}>
          {event.venueName}
        </Text>
      </View>
      <ChevronRight size={18} color="#756F7B" />
    </Pressable>
  );
}

function getOrganizerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CQ';

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
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

function formatEventTimeRange(event: CultureEvent) {
  return event.endTime ? `${event.time}-${event.endTime}` : event.time;
}

function getOrganizerBio(profile: OrganizerProfile) {
  const trimmedBio = profile.bio.trim();
  if (trimmedBio && trimmedBio !== 'Verified CultureQuest organiser.') {
    return trimmedBio;
  }

  return 'This organiser has not added a public description yet.';
}

function getOrganizerLocation(profile: OrganizerProfile, cityName: string) {
  if (profile.locationName || profile.locationAddress) {
    return {
      title: profile.locationName ?? cityName,
      subtitle: profile.locationAddress ?? 'Main location address not listed yet.',
    };
  }

  return {
    title: `Active in ${cityName}`,
    subtitle: 'No fixed venue listed. This organiser may host events across the city.',
  };
}
