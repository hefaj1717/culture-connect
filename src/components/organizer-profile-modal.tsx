import { Image } from 'expo-image';
import {
  Bell,
  BellOff,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  MapPin,
  UserCheck,
  UserPlus,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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

import { BrandImage } from '@/components/brand-image';
import { EmptyState } from '@/components/async-state';
import { CardStyles, Colors } from '@/constants/theme';
import type { CultureEvent } from '@/data/culture';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import {
  fetchOrganizerFollowStatus,
  followOrganizer,
  setOrganizerAnnouncementMuted,
  unfollowOrganizer,
} from '@/lib/organizer-follows';
import type { OrganizerProfile } from '@/lib/organizer-profiles';
import { useAuth } from '@/providers/auth-provider';

type OrganizerProfileModalProps = {
  cityName: string;
  embedded?: boolean;
  events: CultureEvent[];
  staticPresentation?: boolean;
  onClose: () => void;
  onOpenEvent: (event: CultureEvent) => void;
  profile: OrganizerProfile | null;
};

export function OrganizerProfileModal({
  cityName,
  embedded = false,
  events,
  onClose,
  onOpenEvent,
  profile,
  staticPresentation = false,
}: OrganizerProfileModalProps) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stableTopInset = useStableTopInset();
  const translateX = useSharedValue(embedded && !staticPresentation ? width : 0);
  const [followError, setFollowError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [announcementsMuted, setAnnouncementsMuted] = useState(false);
  const [announcementPreferenceLoading, setAnnouncementPreferenceLoading] = useState(false);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);

  useEffect(() => {
    if (profile) {
      if (embedded && !staticPresentation) {
        translateX.value = width;
        translateX.value = withTiming(0, { duration: 220 });
      } else {
        translateX.value = 0;
      }
    }
  }, [embedded, profile, staticPresentation, translateX, width]);

  useEffect(() => {
    let isCurrent = true;

    if (!profile || !user || profile.id === user.id) {
      setFollowError(null);
      setFollowLoading(false);
      setIsFollowing(false);
      setAnnouncementsMuted(false);
      return () => {
        isCurrent = false;
      };
    }

    setFollowLoading(true);
    setFollowError(null);
    void fetchOrganizerFollowStatus(user.id, profile.id).then(
      ({ announcementsMuted: nextAnnouncementsMuted, error, isFollowing: nextIsFollowing }) => {
        if (!isCurrent) return;
        setFollowError(error);
        setIsFollowing(nextIsFollowing);
        setAnnouncementsMuted(nextAnnouncementsMuted);
        setFollowLoading(false);
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [profile, user]);

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
    if (embedded) {
      onOpenEvent(event);
      return;
    }

    translateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onOpenEvent)(event);
      }
    });
  }

  async function toggleFollow() {
    if (!profile || !user || isUpdatingFollow || followLoading) return;

    setIsUpdatingFollow(true);
    setFollowError(null);
    const result = isFollowing
      ? await unfollowOrganizer(user.id, profile.id)
      : await followOrganizer(user.id, profile.id);

    if (result.error) {
      setFollowError(result.error);
    } else {
      const nextIsFollowing = !isFollowing;
      setIsFollowing(nextIsFollowing);
      if (!nextIsFollowing) {
        setAnnouncementsMuted(false);
      }
    }

    setIsUpdatingFollow(false);
  }

  async function toggleAnnouncementPreference() {
    if (!profile || !isFollowing || announcementPreferenceLoading) return;

    setAnnouncementPreferenceLoading(true);
    setFollowError(null);
    const nextMuted = !announcementsMuted;
    const result = await setOrganizerAnnouncementMuted(profile.id, nextMuted);
    if (result.error) {
      setFollowError(result.error);
    } else {
      setAnnouncementsMuted(nextMuted);
    }
    setAnnouncementPreferenceLoading(false);
  }

  if (!profile) return null;

  const organizerBio = getOrganizerBio(profile);
  const organizerLocation = getOrganizerLocation(profile, cityName);
  const canFollow = !!user && user.id !== profile.id;

  const content = (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View className="flex-1 bg-canvas" style={swipeStyle} testID="organizer.detail">
        <ScrollView
          className="flex-1 bg-canvas"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 34,
            paddingTop: stableTopInset + 8,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5">
            <Pressable
              onPress={closeWithAnimation}
              testID="organizer.close"
              className="mb-5 h-12 w-12 items-center justify-center rounded-full active:opacity-80"
              style={{ backgroundColor: Colors.light.backgroundElement }}
            >
              <ArrowLeft size={22} color={Colors.light.primary} strokeWidth={2.6} />
            </Pressable>

            <View
              className="overflow-hidden rounded-feature"
              style={{ backgroundColor: Colors.light.backgroundElement }}
            >
              <View className="flex-row items-start justify-between gap-4 px-5 pb-3 pt-5">
                <View className="min-w-0 flex-1">
                  <View className="self-start flex-row items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1">
                    <CheckCircle2
                      size={13}
                      color={Colors.light.background}
                      fill={Colors.light.success}
                    />
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-success">
                      Verified organizer
                    </Text>
                  </View>
                  <Text className="mt-3 font-heading text-[30px] leading-9 text-ink">
                    {profile.name}
                  </Text>
                  {canFollow ? (
                    <View className="mt-3 self-start gap-2">
                      <Pressable
                        accessibilityLabel={
                          isFollowing ? `Unfollow ${profile.name}` : `Follow ${profile.name}`
                        }
                        disabled={followLoading || isUpdatingFollow}
                        onPress={() => void toggleFollow()}
                        className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${
                          isFollowing ? 'bg-success/15' : 'bg-primary'
                        } ${followLoading || isUpdatingFollow ? 'opacity-55' : 'active:opacity-80'}`}
                      >
                        {isFollowing ? (
                          <UserCheck size={15} color={Colors.light.success} strokeWidth={2.5} />
                        ) : (
                          <UserPlus size={15} color={Colors.light.background} strokeWidth={2.5} />
                        )}
                        <Text
                          className={`text-[12px] font-bold ${
                            isFollowing ? 'text-success' : 'text-white'
                          }`}
                        >
                          {isUpdatingFollow ? 'Saving…' : isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </Pressable>
                      {isFollowing ? (
                        <Pressable
                          accessibilityLabel={
                            announcementsMuted
                              ? `Turn on announcements from ${profile.name}`
                              : `Mute announcements from ${profile.name}`
                          }
                          disabled={announcementPreferenceLoading}
                          onPress={() => void toggleAnnouncementPreference()}
                          className={`flex-row items-center gap-1.5 self-start rounded-full border border-primary/20 px-3 py-2 ${
                            announcementPreferenceLoading ? 'opacity-55' : 'active:opacity-80'
                          }`}
                        >
                          {announcementsMuted ? (
                            <BellOff size={15} color={Colors.light.primary} strokeWidth={2.3} />
                          ) : (
                            <Bell size={15} color={Colors.light.success} strokeWidth={2.3} />
                          )}
                          <Text
                            className={`text-[12px] font-bold ${announcementsMuted ? 'text-primary' : 'text-success'}`}
                          >
                            {announcementPreferenceLoading
                              ? 'Saving…'
                              : announcementsMuted
                                ? 'Announcements muted'
                                : 'Announcements on'}
                          </Text>
                        </Pressable>
                      ) : null}
                      {followError ? (
                        <Text className="mt-1.5 max-w-[210px] text-[11px] leading-4 text-destructive">
                          {followError}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
                <OrganizerAvatar profile={profile} size={68} />
              </View>

              <View className="px-5 pt-3">
                <View className="mb-2 flex-row items-center gap-3">
                  <Text className="font-serifRegular text-[20px] leading-6 text-ink">About</Text>
                  <View className="h-px flex-1 bg-primary/15" />
                </View>
                <Text className="text-[14px] leading-6 text-muted">{organizerBio}</Text>
                <View className="mt-5 flex-row items-start gap-3 border-t border-primary/10 pb-5 pt-4">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <MapPin size={17} color={Colors.light.primary} strokeWidth={2.4} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[13px] font-semibold text-ink" numberOfLines={1}>
                      {organizerLocation.title}
                    </Text>
                    <Text className="mt-0.5 text-[12px] leading-4 text-muted" numberOfLines={2}>
                      {organizerLocation.subtitle}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="mt-6">
              <View className="mb-3 flex-row items-end justify-between">
                <Text className="font-heading text-[27px] leading-8 text-ink">Events</Text>
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
  );

  if (embedded) {
    return content;
  }

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible>
      {content}
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
        <EmptyState
          body={emptyLabel}
          compact
          icon={null}
          title={title === 'Upcoming' ? 'Nothing upcoming yet' : 'No previous events'}
        />
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
      accessibilityLabel={`Open event ${event.title}`}
      onPress={onPress}
      testID={`organizer.event.${event.id}`}
      className="flex-row items-center gap-3 rounded-feature p-3 active:opacity-85"
      style={[CardStyles.compact, { backgroundColor: Colors.light.backgroundElement }]}
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
      <ChevronRight size={18} color={Colors.light.primary} />
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
