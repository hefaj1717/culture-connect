import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgesModal } from '@/components/profile/badges-modal';
import { CreateEventModal } from '@/components/profile/create-event-modal';
import { CreateRewardModal } from '@/components/profile/create-reward-modal';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import {
  DigitalPassportSection,
  OrganizerEventHistoryModal,
  OrganizerToolsSection,
  OrganizerEventHistorySection,
  ProfileActions,
  ProfileRankCard,
  UserActivityHistoryModal,
  UserActivitySection,
  RewardsSection,
} from '@/components/profile/profile-sections';
import { RewardDetailModal } from '@/components/profile/reward-detail-modal';
import {
  type CityId,
  type CultureEvent,
  type RewardPartner,
  defaultCityId,
  getCultureCityData,
} from '@/data/culture';
import { achievementBadges, getXpLevelProgress } from '@/data/profile';
import { useCreateEventForm } from '@/hooks/profile/use-create-event-form';
import { useCreateRewardForm } from '@/hooks/profile/use-create-reward-form';
import { useEditProfileForm } from '@/hooks/profile/use-edit-profile-form';
import { useRewardRedemption } from '@/hooks/profile/use-reward-redemption';
import type { UserEventHistoryItem } from '@/lib/event-history';
import { fetchMyOrganizerEvents, type ManagedOrganizerEvent } from '@/lib/organizer-events';
import { fetchOrganizerRewards } from '@/lib/organizer-rewards';
import { useAuth } from '@/providers/auth-provider';

type ProfileScreenProps = {
  eventsRefreshKey?: number;
  onEventCreated?: () => void;
  onOpenEvent?: (event: CultureEvent) => void;
  onRewardCreated?: () => void;
  rewardsRefreshKey?: number;
  userEventHistory?: UserEventHistoryItem[];
  userXp?: number;
};

export default function ProfileScreen({
  eventsRefreshKey = 0,
  onEventCreated,
  onOpenEvent,
  onRewardCreated,
  rewardsRefreshKey = 0,
  userEventHistory = [],
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
  const [approvedRewards, setApprovedRewards] = useState<RewardPartner[]>([]);
  const [myOrganizerEvents, setMyOrganizerEvents] = useState<ManagedOrganizerEvent[]>([]);
  const [myOrganizerEventsError, setMyOrganizerEventsError] = useState<string | null>(null);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const savedAvatarUrl = session?.user.user_metadata?.avatar_url || null;
  const levelProgress = getXpLevelProgress(userXp);
  const editProfileForm = useEditProfileForm({
    savedAvatarUrl,
    savedCityId,
    savedFirstName,
    savedLastName,
    updateProfile,
  });
  const createEventForm = useCreateEventForm({
    onEventCreated,
    savedCityId,
    userId: session?.user.id,
  });
  const createRewardForm = useCreateRewardForm({
    onRewardCreated,
    savedCityId,
    userId: session?.user.id,
  });
  const rewardRedemption = useRewardRedemption();
  const {
    avatarUrl,
    cityId,
    editOpen,
    firstName,
    lastName,
    openEditProfile,
    pickAvatar,
    profileError,
    saveProfile,
    savingProfile,
    setCityId,
    setEditOpen,
    setFirstName,
    setLastName,
  } = editProfileForm;
  const {
    calendarMonth,
    createEventError,
    createEventOpen,
    creatingEvent,
    datePickerOpen,
    eventCategory,
    eventDate,
    eventDescription,
    eventImageUri,
    eventIsFree,
    eventTime,
    eventTitle,
    openCreateEvent,
    pickEventImage,
    placeQuery,
    placeSuggestions,
    searchingPlaces,
    selectedHour,
    selectedMinute,
    selectedPlace,
    selectPlace,
    setCalendarMonth,
    setCreateEventOpen,
    setDatePickerOpen,
    setEventCategory,
    setEventDate,
    setEventDescription,
    setEventImageUri,
    setEventIsFree,
    setEventTime,
    setEventTitle,
    setPlaceQuery,
    setSelectedHour,
    setSelectedMinute,
    setSelectedPlace,
    setTimePickerOpen,
    submitEvent,
    timePickerOpen,
  } = createEventForm;
  const {
    createRewardError,
    createRewardOpen,
    creatingReward,
    openCreateReward,
    rewardDescription,
    rewardPlaceQuery,
    rewardPlaceSuggestions,
    rewardTitle,
    rewardXp,
    searchingRewardPlaces,
    selectedRewardPlace,
    selectRewardPlace,
    setCreateRewardOpen,
    setRewardDescription,
    setRewardPlaceQuery,
    setRewardTitle,
    setRewardXp,
    setSelectedRewardPlace,
    submitReward,
  } = createRewardForm;
  const {
    redeemSelectedReward,
    resetRewardDetailState,
    rewardDetailsExpanded,
    selectedReward,
    selectedRewardIsActive,
    selectedRewardIsUsed,
    selectedRewardRemainingMs,
    selectedRewardState,
    setRewardDetailsExpanded,
    setSelectedReward,
  } = rewardRedemption;
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [activityHistoryOpen, setActivityHistoryOpen] = useState(false);
  const [organizerHistoryOpen, setOrganizerHistoryOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<(typeof achievementBadges)[number] | null>(
    null,
  );
  const unlockedBadgeCount = achievementBadges.filter((badge) => badge.unlocked).length;
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
    [createEventTranslateX, setCreateEventOpen, width],
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
    [rewardTranslateX, setSelectedReward, width],
  );

  const rewardSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rewardTranslateX.value }],
  }));

  useEffect(() => {
    if (session?.user.id) {
      refreshOrganizerApplicationStatus();
    }
  }, [refreshOrganizerApplicationStatus, session?.user.id]);

  useEffect(() => {
    let active = true;

    async function loadApprovedRewards() {
      const result = await fetchOrganizerRewards(savedCityId);
      if (!active) return;

      setApprovedRewards(result.rewards);
      setRewardsError(result.error);
    }

    loadApprovedRewards();

    return () => {
      active = false;
    };
  }, [rewardsRefreshKey, savedCityId]);

  useEffect(() => {
    const userId = session?.user.id;

    if (!userId || organizerApplicationStatus !== 'approved') {
      setMyOrganizerEvents([]);
      setMyOrganizerEventsError(null);
      return;
    }

    const userIdForLoad = userId;
    const cityIdForLoad = cityData.id;
    let active = true;

    async function loadMyOrganizerEvents() {
      const result = await fetchMyOrganizerEvents(userIdForLoad, cityIdForLoad);
      if (!active) return;

      setMyOrganizerEvents(result.events);
      setMyOrganizerEventsError(result.error);
    }

    loadMyOrganizerEvents();

    return () => {
      active = false;
    };
  }, [cityData.id, eventsRefreshKey, organizerApplicationStatus, session?.user.id]);

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

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center font-body text-[15px] text-muted">
          Log in to view your profile.
        </Text>
      </View>
    );
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
    resetRewardDetailState();
    rewardTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setSelectedReward)(null);
      }
    });
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

        <ProfileActions onEdit={openEditProfile} onSignOut={signOut} />

        <UserActivitySection
          history={userEventHistory}
          onOpenAll={() => setActivityHistoryOpen(true)}
          onOpenEvent={onOpenEvent}
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
          onCreateEvent={openCreateEvent}
          onCreateReward={openCreateReward}
          status={organizerApplicationStatus}
        />

        {organizerApplicationStatus === 'approved' && (
          <OrganizerEventHistorySection
            error={myOrganizerEventsError}
            events={myOrganizerEvents}
            onOpenAll={() => setOrganizerHistoryOpen(true)}
            onOpenEvent={onOpenEvent}
          />
        )}

        <RewardsSection
          cityName={cityData.name}
          error={rewardsError}
          onSelectReward={setSelectedReward}
          rewards={approvedRewards}
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
        onSelectPlace={selectPlace}
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
        creatingReward={creatingReward}
        onChangeRewardDescription={setRewardDescription}
        onChangeRewardPlaceQuery={setRewardPlaceQuery}
        onChangeRewardTitle={setRewardTitle}
        onChangeRewardXp={setRewardXp}
        onClose={() => setCreateRewardOpen(false)}
        onSelectRewardPlace={selectRewardPlace}
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

      <UserActivityHistoryModal
        history={userEventHistory}
        onClose={() => setActivityHistoryOpen(false)}
        onOpenEvent={(event) => {
          setActivityHistoryOpen(false);
          onOpenEvent?.(event);
        }}
        stableModalTopInset={stableModalTopInset}
        visible={activityHistoryOpen}
      />

      <OrganizerEventHistoryModal
        events={myOrganizerEvents}
        onClose={() => setOrganizerHistoryOpen(false)}
        onOpenEvent={(event) => {
          setOrganizerHistoryOpen(false);
          onOpenEvent?.(event);
        }}
        stableModalTopInset={stableModalTopInset}
        visible={organizerHistoryOpen}
      />

      <RewardDetailModal
        detailsExpanded={rewardDetailsExpanded}
        gesture={rewardSwipeGesture}
        onClose={closeRewardWithAnimation}
        onRedeem={redeemSelectedReward}
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
