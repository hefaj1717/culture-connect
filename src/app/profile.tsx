import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgesModal } from '@/components/profile/badges-modal';
import { CreateEventModal } from '@/components/profile/create-event-modal';
import { CreateRewardModal } from '@/components/profile/create-reward-modal';
import { startOfMonth } from '@/components/profile/date-time-pickers';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import {
  DigitalPassportSection,
  OrganizerToolsSection,
  ProfileActions,
  ProfileRankCard,
  RewardsSection,
} from '@/components/profile/profile-sections';
import { RewardDetailModal } from '@/components/profile/reward-detail-modal';
import { Colors } from '@/constants/theme';
import {
  type CityId,
  type EventCategory,
  type EventLanguage,
  type RewardPartner,
  defaultCityId,
  getCultureCityData,
} from '@/data/culture';
import {
  achievementBadges,
  type RedeemedRewardState,
  getXpLevelProgress,
  rewardRedeemWindowMs,
} from '@/data/profile';
import { createOrganizerEvent } from '@/lib/organizer-events';
import { type PlaceSuggestion, searchPlaces } from '@/lib/place-search';
import { useAuth } from '@/providers/auth-provider';

type ProfileScreenProps = {
  onEventCreated?: () => void;
  onRewardCreated?: (reward: RewardPartner) => void;
  organizerRewards?: RewardPartner[];
  userXp?: number;
};

export default function ProfileScreen({
  onEventCreated,
  onRewardCreated,
  organizerRewards = [],
  userXp = 0,
}: ProfileScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const stableModalTopInset = Math.max(insets.top, 44);
  const {
    organizerApplicationStatus,
    refreshOrganizerApplicationStatus,
    session,
    signOut,
    updateProfile,
  } = useAuth();
  const { width } = useWindowDimensions();
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cityId, setCityId] = useState<CityId>(defaultCityId);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [eventCategory, setEventCategory] = useState<EventCategory>('workshop');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventImageUri, setEventImageUri] = useState<string | null>(null);
  const [eventIsFree, setEventIsFree] = useState(true);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createRewardOpen, setCreateRewardOpen] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardPlaceQuery, setRewardPlaceQuery] = useState('');
  const [rewardPlaceSuggestions, setRewardPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedRewardPlace, setSelectedRewardPlace] = useState<PlaceSuggestion | null>(null);
  const [searchingRewardPlaces, setSearchingRewardPlaces] = useState(false);
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardXp, setRewardXp] = useState('100');
  const [createRewardError, setCreateRewardError] = useState<string | null>(null);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<(typeof achievementBadges)[number] | null>(
    null,
  );
  const [selectedReward, setSelectedReward] = useState<RewardPartner | null>(null);
  const [rewardDetailsExpanded, setRewardDetailsExpanded] = useState(false);
  const [redeemedRewards, setRedeemedRewards] = useState<Record<string, RedeemedRewardState>>({});
  const unlockedBadgeCount = achievementBadges.filter((badge) => badge.unlocked).length;
  const [rewardNow, setRewardNow] = useState(() => Date.now());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedHour, setSelectedHour] = useState(19);
  const [selectedMinute, setSelectedMinute] = useState(0);

  const email = session?.user.email ?? 'Student';
  const metadataName = [
    session?.user.user_metadata?.first_name,
    session?.user.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ');
  const fullName = session?.user.user_metadata?.full_name || metadataName || email.split('@')[0];
  const avatarInitials = getUserInitials(fullName || email);
  const savedFirstName = session?.user.user_metadata?.first_name || '';
  const savedLastName = session?.user.user_metadata?.last_name || '';
  const savedCityId: CityId =
    session?.user.user_metadata?.city_id === 'lublin' ? 'lublin' : defaultCityId;
  const cityData = getCultureCityData(savedCityId);
  const visibleRewards = useMemo(
    () => [...organizerRewards, ...cityData.rewardPartners],
    [cityData.rewardPartners, organizerRewards],
  );
  const savedAvatarUrl = session?.user.user_metadata?.avatar_url || null;
  const levelProgress = getXpLevelProgress(userXp);
  const createEventTranslateX = useSharedValue(0);
  const badgesTranslateX = useSharedValue(0);
  const rewardTranslateX = useSharedValue(0);

  const createEventSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-999, 18])
        .failOffsetY([-35, 35])
        .onUpdate((event) => {
          createEventTranslateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldClose = createEventTranslateX.value > width * 0.28 || event.velocityX > 700;

          if (shouldClose) {
            createEventTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(setCreateEventOpen)(false);
              }
            });
            return;
          }

          createEventTranslateX.value = withTiming(0, { duration: 180 });
        }),
    [createEventTranslateX, width],
  );

  const createEventSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: createEventTranslateX.value }],
  }));

  const badgesSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-999, 18])
        .failOffsetY([-35, 35])
        .onUpdate((event) => {
          badgesTranslateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldClose = badgesTranslateX.value > width * 0.28 || event.velocityX > 700;

          if (shouldClose) {
            badgesTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(setBadgesOpen)(false);
              }
            });
            return;
          }

          badgesTranslateX.value = withTiming(0, { duration: 180 });
        }),
    [badgesTranslateX, width],
  );

  const badgesSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: badgesTranslateX.value }],
  }));

  const rewardSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-999, 18])
        .failOffsetY([-35, 35])
        .onUpdate((event) => {
          rewardTranslateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldClose = rewardTranslateX.value > width * 0.28 || event.velocityX > 700;

          if (shouldClose) {
            rewardTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(setSelectedReward)(null);
              }
            });
            return;
          }

          rewardTranslateX.value = withTiming(0, { duration: 180 });
        }),
    [rewardTranslateX, width],
  );

  const rewardSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rewardTranslateX.value }],
  }));

  useEffect(() => {
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setCityId(savedCityId);
    setAvatarUrl(savedAvatarUrl);
  }, [savedAvatarUrl, savedCityId, savedFirstName, savedLastName]);

  useEffect(() => {
    if (session?.user.id) {
      refreshOrganizerApplicationStatus();
    }
  }, [refreshOrganizerApplicationStatus, session?.user.id]);

  useEffect(() => {
    if (createEventOpen) {
      createEventTranslateX.value = 0;
    }
  }, [createEventOpen, createEventTranslateX]);

  useEffect(() => {
    if (badgesOpen) {
      badgesTranslateX.value = 0;
    }
  }, [badgesOpen, badgesTranslateX]);

  useEffect(() => {
    if (selectedReward) {
      rewardTranslateX.value = 0;
    }
  }, [rewardTranslateX, selectedReward]);

  useEffect(() => {
    if (!selectedReward) return;

    const interval = setInterval(() => {
      const nextNow = Date.now();
      setRewardNow(nextNow);
      setRedeemedRewards((current) => {
        const rewardState = current[selectedReward.id];
        if (!rewardState || rewardState.used) return current;
        if (nextNow - rewardState.redeemedAt < rewardRedeemWindowMs) return current;

        return {
          ...current,
          [selectedReward.id]: {
            ...rewardState,
            used: true,
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedReward]);

  useEffect(() => {
    let active = true;

    async function loadPlaceSuggestions() {
      if (selectedPlace && placeQuery === selectedPlace.name) {
        setPlaceSuggestions([]);
        setSearchingPlaces(false);
        return;
      }

      if (placeQuery.trim().length < 2) {
        setPlaceSuggestions([]);
        setSearchingPlaces(false);
        return;
      }

      setSearchingPlaces(true);
      const suggestions = await searchPlaces(placeQuery, savedCityId);
      if (!active) return;

      setPlaceSuggestions(suggestions);
      setSearchingPlaces(false);
    }

    loadPlaceSuggestions();

    return () => {
      active = false;
    };
  }, [placeQuery, savedCityId, selectedPlace]);

  useEffect(() => {
    let active = true;

    async function loadRewardPlaceSuggestions() {
      if (selectedRewardPlace && rewardPlaceQuery === selectedRewardPlace.name) {
        setRewardPlaceSuggestions([]);
        setSearchingRewardPlaces(false);
        return;
      }

      if (rewardPlaceQuery.trim().length < 2) {
        setRewardPlaceSuggestions([]);
        setSearchingRewardPlaces(false);
        return;
      }

      setSearchingRewardPlaces(true);
      const suggestions = await searchPlaces(rewardPlaceQuery, savedCityId);
      if (!active) return;

      setRewardPlaceSuggestions(suggestions);
      setSearchingRewardPlaces(false);
    }

    loadRewardPlaceSuggestions();

    return () => {
      active = false;
    };
  }, [rewardPlaceQuery, savedCityId, selectedRewardPlace]);

  const selectedRewardState = selectedReward ? redeemedRewards[selectedReward.id] : undefined;
  const selectedRewardIsUsed = !!selectedRewardState?.used;
  const selectedRewardIsActive = !!selectedRewardState && !selectedRewardIsUsed;
  const selectedRewardRemainingMs =
    selectedRewardState && !selectedRewardIsUsed
      ? Math.max(0, rewardRedeemWindowMs - (rewardNow - selectedRewardState.redeemedAt))
      : 0;

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center font-body text-[15px] text-muted">
          Log in to view your profile.
        </Text>
      </View>
    );
  }

  async function pickAvatar() {
    setProfileError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUrl(result.assets[0]?.uri ?? null);
    }
  }

  async function saveProfile() {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();

    if (!normalizedFirstName || !normalizedLastName) {
      setProfileError('Please enter your first and last name.');
      return;
    }

    setProfileError(null);
    setSavingProfile(true);
    const result = await updateProfile({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      cityId,
      avatarUrl,
    });
    setSavingProfile(false);

    if (result.error) {
      setProfileError(result.error);
      return;
    }

    setEditOpen(false);
  }

  function resetEventForm() {
    setEventTitle('');
    setPlaceQuery('');
    setPlaceSuggestions([]);
    setSelectedPlace(null);
    setEventCategory('workshop');
    setEventDate('');
    setEventTime('');
    setEventDescription('');
    setEventImageUri(null);
    setEventIsFree(true);
    setCreateEventError(null);
    setCalendarMonth(startOfMonth(new Date()));
    setSelectedHour(19);
    setSelectedMinute(0);
  }

  function resetRewardForm() {
    setRewardTitle('');
    setRewardPlaceQuery('');
    setRewardPlaceSuggestions([]);
    setSelectedRewardPlace(null);
    setSearchingRewardPlaces(false);
    setRewardDescription('');
    setRewardXp('100');
    setCreateRewardError(null);
  }

  function closeCreateEventWithAnimation() {
    createEventTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setCreateEventOpen)(false);
      }
    });
  }

  function closeBadgesWithAnimation() {
    setSelectedBadge(null);
    badgesTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setBadgesOpen)(false);
      }
    });
  }

  function closeRewardWithAnimation() {
    setRewardDetailsExpanded(false);
    rewardTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setSelectedReward)(null);
      }
    });
  }

  async function submitEvent() {
    const normalizedTitle = eventTitle.trim();
    const normalizedDate = eventDate.trim();
    const normalizedTime = eventTime.trim();
    const normalizedDescription = eventDescription.trim();

    if (!session?.user.id) {
      setCreateEventError('Log in again before publishing an event.');
      return;
    }
    if (!selectedPlace) {
      setCreateEventError('Select a suggested place so attendance can be location-verified.');
      return;
    }
    if (!normalizedTitle || !normalizedDate || !normalizedTime || !normalizedDescription) {
      setCreateEventError('Fill in title, date, time, and description.');
      return;
    }

    setCreateEventError(null);
    setCreatingEvent(true);
    const result = await createOrganizerEvent(session.user.id, {
      cityId: savedCityId,
      place: selectedPlace,
      title: normalizedTitle,
      description: normalizedDescription,
      category: eventCategory,
      date: normalizedDate,
      time: normalizedTime,
      language: getDefaultEventLanguage(savedCityId),
      isFree: eventIsFree,
      imageUri: eventImageUri,
    });
    setCreatingEvent(false);

    if (result.error) {
      setCreateEventError(result.error);
      return;
    }

    setCreateEventOpen(false);
    resetEventForm();
    onEventCreated?.();
    Alert.alert('Event published', 'Your event is now visible in Discover.');
  }

  function submitReward() {
    const normalizedTitle = rewardTitle.trim();
    const normalizedDescription = rewardDescription.trim();
    const normalizedXp = Number.parseInt(rewardXp.trim(), 10);

    if (!normalizedTitle || !normalizedDescription) {
      setCreateRewardError('Fill in reward title, place, and description.');
      return;
    }
    if (!selectedRewardPlace) {
      setCreateRewardError('Select a suggested place for this reward.');
      return;
    }
    if (!Number.isFinite(normalizedXp) || normalizedXp <= 0) {
      setCreateRewardError('Enter a valid XP amount.');
      return;
    }

    const createdReward: RewardPartner = {
      id: `organizer-reward-${Date.now()}`,
      name: selectedRewardPlace.name,
      category: 'cafe',
      location: selectedRewardPlace.address,
      discount: normalizedTitle,
      description: normalizedDescription,
      condition: `Unlock at ${normalizedXp} XP`,
      xpCost: normalizedXp,
      isPopular: false,
      badge: 'Organizer',
      color: Colors.light.primary,
    };

    onRewardCreated?.(createdReward);
    setCreateRewardOpen(false);
    resetRewardForm();
    Alert.alert('Reward created', 'Your reward is now visible in Rewards.');
  }

  async function pickEventImage() {
    setCreateEventError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose an event photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.82,
    });

    if (!result.canceled) {
      setEventImageUri(result.assets[0]?.uri ?? null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112, paddingTop: 24 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ProfileRankCard
          avatarInitials={avatarInitials}
          avatarUrl={savedAvatarUrl}
          cityLabel={cityData.label}
          fullName={fullName}
          levelProgress={levelProgress}
          organizerStatus={organizerApplicationStatus}
          userXp={userXp}
        />

        <ProfileActions
          onEdit={() => {
            setProfileError(null);
            setFirstName(savedFirstName);
            setLastName(savedLastName);
            setCityId(savedCityId);
            setAvatarUrl(savedAvatarUrl);
            setEditOpen(true);
          }}
          onSignOut={signOut}
        />

        <DigitalPassportSection
          badges={achievementBadges}
          onOpenAll={() => setBadgesOpen(true)}
          onOpenBadge={(badge) => {
            setSelectedBadge(badge);
            setBadgesOpen(true);
          }}
        />

        <OrganizerToolsSection
          cityName={cityData.name}
          onCreateEvent={() => {
            resetEventForm();
            setCreateEventOpen(true);
          }}
          onCreateReward={() => {
            resetRewardForm();
            setCreateRewardOpen(true);
          }}
          status={organizerApplicationStatus}
        />

        <RewardsSection
          cityName={cityData.name}
          onSelectReward={setSelectedReward}
          rewards={visibleRewards}
        />
      </ScrollView>

      <EditProfileModal
        avatarInitials={avatarInitials}
        avatarUrl={avatarUrl}
        cityId={cityId}
        firstName={firstName}
        lastName={lastName}
        onChangeAvatar={pickAvatar}
        onChangeCity={setCityId}
        onChangeFirstName={setFirstName}
        onChangeLastName={setLastName}
        onClose={() => setEditOpen(false)}
        onSave={saveProfile}
        profileError={profileError}
        savingProfile={savingProfile}
        visible={editOpen}
      />

      <CreateEventModal
        calendarMonth={calendarMonth}
        cityId={savedCityId}
        createEventError={createEventError}
        creatingEvent={creatingEvent}
        datePickerOpen={datePickerOpen}
        eventCategory={eventCategory}
        eventDate={eventDate}
        eventDescription={eventDescription}
        eventImageUri={eventImageUri}
        eventIsFree={eventIsFree}
        eventTime={eventTime}
        eventTitle={eventTitle}
        gesture={createEventSwipeGesture}
        onChangeCalendarMonth={setCalendarMonth}
        onChangeEventCategory={setEventCategory}
        onChangeEventDescription={setEventDescription}
        onChangeEventIsFree={setEventIsFree}
        onChangeEventTime={setEventTime}
        onChangeEventTitle={setEventTitle}
        onChangePlaceQuery={setPlaceQuery}
        onChangeSelectedHour={setSelectedHour}
        onChangeSelectedMinute={setSelectedMinute}
        onClose={closeCreateEventWithAnimation}
        onCloseDatePicker={() => setDatePickerOpen(false)}
        onCloseTimePicker={() => setTimePickerOpen(false)}
        onOpenDatePicker={() => setDatePickerOpen(true)}
        onOpenTimePicker={() => setTimePickerOpen(true)}
        onPickEventImage={pickEventImage}
        onRemoveEventImage={() => setEventImageUri(null)}
        onSelectDate={setEventDate}
        onSelectPlace={(place) => {
          setSelectedPlace(place);
          setPlaceQuery(place.name);
          setPlaceSuggestions([]);
        }}
        onSubmit={submitEvent}
        placeQuery={placeQuery}
        placeSuggestions={placeSuggestions}
        searchingPlaces={searchingPlaces}
        selectedHour={selectedHour}
        selectedMinute={selectedMinute}
        selectedPlace={selectedPlace}
        setSelectedPlace={setSelectedPlace}
        stableModalTopInset={stableModalTopInset}
        swipeStyle={createEventSwipeStyle}
        timePickerOpen={timePickerOpen}
        visible={createEventOpen}
      />

      <CreateRewardModal
        createRewardError={createRewardError}
        onChangeRewardDescription={setRewardDescription}
        onChangeRewardPlaceQuery={setRewardPlaceQuery}
        onChangeRewardTitle={setRewardTitle}
        onChangeRewardXp={setRewardXp}
        onClose={() => setCreateRewardOpen(false)}
        onSelectRewardPlace={(place) => {
          setSelectedRewardPlace(place);
          setRewardPlaceQuery(place.name);
          setRewardPlaceSuggestions([]);
        }}
        onSubmit={submitReward}
        rewardDescription={rewardDescription}
        rewardPlaceQuery={rewardPlaceQuery}
        rewardPlaceSuggestions={rewardPlaceSuggestions}
        rewardTitle={rewardTitle}
        rewardXp={rewardXp}
        savedCityId={savedCityId}
        searchingRewardPlaces={searchingRewardPlaces}
        selectedRewardPlace={selectedRewardPlace}
        setSelectedRewardPlace={setSelectedRewardPlace}
        stableModalTopInset={stableModalTopInset}
        visible={createRewardOpen}
      />

      <BadgesModal
        badges={achievementBadges}
        gesture={badgesSwipeGesture}
        itemWidth={(width - 64) / 3}
        onClose={closeBadgesWithAnimation}
        onSelectBadge={setSelectedBadge}
        selectedBadge={selectedBadge}
        stableModalTopInset={stableModalTopInset}
        swipeStyle={badgesSwipeStyle}
        unlockedBadgeCount={unlockedBadgeCount}
        visible={badgesOpen}
      />

      <RewardDetailModal
        detailsExpanded={rewardDetailsExpanded}
        gesture={rewardSwipeGesture}
        onClose={closeRewardWithAnimation}
        onRedeem={() => {
          if (!selectedReward) return;

          const redeemedAt = Date.now();
          setRewardNow(redeemedAt);
          setRedeemedRewards((current) => ({
            ...current,
            [selectedReward.id]: {
              redeemedAt,
              used: false,
            },
          }));
        }}
        onToggleDetails={() => setRewardDetailsExpanded((current) => !current)}
        remainingMs={selectedRewardRemainingMs}
        reward={selectedReward}
        rewardIsActive={selectedRewardIsActive}
        rewardIsUsed={selectedRewardIsUsed}
        rewardStateExists={!!selectedRewardState}
        swipeStyle={rewardSwipeStyle}
      />
    </SafeAreaView>
  );
}

function getUserInitials(value?: string | null) {
  if (!value) return null;

  const parts = value
    .replace(/[^a-zA-Z0-9_\s.-]/g, '')
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getDefaultEventLanguage(cityId: CityId): EventLanguage {
  return cityId === 'lublin' ? 'pl' : 'en';
}
