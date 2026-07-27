import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AdminReviewModal } from '@/components/profile/admin-review-modal';
import { AdminManageEventsModal } from '@/components/profile/admin-manage-events-modal';
import { BadgesModal } from '@/components/profile/badges-modal';
import { CreateEventModal } from '@/components/profile/create-event-modal';
import { CreateQuestModal } from '@/components/profile/create-quest-modal';
import { CreateRewardModal } from '@/components/profile/create-reward-modal';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import {
  AccountActionsModal,
  AdminToolsSection,
  DigitalPassportSection,
  OrganizerEventHistoryModal,
  OrganizerToolsSection,
  OrganizerEventHistorySection,
  OrganizerRewardHistoryModal,
  OrganizerRewardHistorySection,
  ProfileRankCard,
  UserActivityHistoryModal,
  UserActivitySection,
  RewardsListModal,
  RewardsSection,
} from '@/components/profile/profile-sections';
import { RewardDetailModal } from '@/components/profile/reward-detail-modal';
import { type CityId, type RewardPartner, defaultCityId, getCultureCityData } from '@/data/culture';
import { achievementBadges, getXpLevelProgress } from '@/data/profile';
import { useAdminModeration } from '@/hooks/profile/use-admin-moderation';
import { useCreateEventForm } from '@/hooks/profile/use-create-event-form';
import { useCreateQuestForm } from '@/hooks/profile/use-create-quest-form';
import { useCreateRewardForm } from '@/hooks/profile/use-create-reward-form';
import { useEditProfileForm } from '@/hooks/profile/use-edit-profile-form';
import { useRewardRedemption } from '@/hooks/profile/use-reward-redemption';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { UserEventHistoryItem } from '@/lib/event-history';
import { fetchMyOrganizerEvents, type ManagedOrganizerEvent } from '@/lib/organizer-events';
import {
  fetchMyOrganizerRewards,
  fetchOrganizerRewards,
  type ManagedOrganizerReward,
} from '@/lib/organizer-rewards';
import { useAuth } from '@/providers/auth-provider';

type ProfileScreenProps = {
  eventsRefreshKey?: number;
  onEventCreated?: () => void;
  onQuestCreated?: () => void;
  onRewardCreated?: () => void;
  onUserXpChange?: (nextXp: number) => void;
  rewardsRefreshKey?: number;
  userEventHistory?: UserEventHistoryItem[];
  userXp?: number;
};

export default function ProfileScreen({
  eventsRefreshKey = 0,
  onEventCreated,
  onQuestCreated,
  onRewardCreated,
  onUserXpChange,
  rewardsRefreshKey = 0,
  userEventHistory = [],
  userXp = 0,
}: ProfileScreenProps = {}) {
  const stableModalTopInset = useStableTopInset();
  const {
    organizerApplicationStatus,
    refreshOrganizerApplicationStatus,
    hasRole,
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
  const savedOrganizerBio = session?.user.user_metadata?.organizer_bio || '';
  const savedOrganizerLocationAddress =
    session?.user.user_metadata?.organizer_location_address || null;
  const savedOrganizerLocationLatitude =
    typeof session?.user.user_metadata?.organizer_location_latitude === 'number'
      ? session.user.user_metadata.organizer_location_latitude
      : null;
  const savedOrganizerLocationLongitude =
    typeof session?.user.user_metadata?.organizer_location_longitude === 'number'
      ? session.user.user_metadata.organizer_location_longitude
      : null;
  const savedOrganizerLocationName = session?.user.user_metadata?.organizer_location_name || null;
  const cityData = getCultureCityData(savedCityId);
  const isAdmin = hasRole('admin');
  const isOrganizer = organizerApplicationStatus === 'approved' || hasRole('organizer');
  const [approvedRewards, setApprovedRewards] = useState<RewardPartner[]>([]);
  const [myOrganizerEvents, setMyOrganizerEvents] = useState<ManagedOrganizerEvent[]>([]);
  const [myOrganizerEventsError, setMyOrganizerEventsError] = useState<string | null>(null);
  const [myOrganizerRewards, setMyOrganizerRewards] = useState<ManagedOrganizerReward[]>([]);
  const [myOrganizerRewardsError, setMyOrganizerRewardsError] = useState<string | null>(null);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const savedAvatarUrl = session?.user.user_metadata?.avatar_url || null;
  const levelProgress = getXpLevelProgress(userXp);
  const editProfileForm = useEditProfileForm({
    savedAvatarUrl,
    savedCityId,
    savedFirstName,
    savedLastName,
    savedOrganizerBio,
    savedOrganizerLocationAddress,
    savedOrganizerLocationLatitude,
    savedOrganizerLocationLongitude,
    savedOrganizerLocationName,
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
  const createQuestForm = useCreateQuestForm({
    onQuestCreated,
    savedCityId,
    userId: session?.user.id,
  });
  const adminModeration = useAdminModeration({
    isAdmin,
    onContentReviewed: () => {
      onEventCreated?.();
      onRewardCreated?.();
    },
    userId: session?.user.id,
  });
  const rewardRedemption = useRewardRedemption({
    onUserXpChange,
    rewards: approvedRewards,
    userId: session?.user.id,
    userXp,
  });
  const {
    avatarUrl,
    cityId,
    editOpen,
    firstName,
    lastName,
    changeOrganizerLocationQuery,
    openEditProfile,
    organizerBio,
    organizerLocationQuery,
    organizerLocationSuggestions,
    pickAvatar,
    profileError,
    saveProfile,
    searchingOrganizerLocation,
    selectedOrganizerLocation,
    selectOrganizerLocation,
    savingProfile,
    setCityId,
    setEditOpen,
    setFirstName,
    setLastName,
    setOrganizerBio,
  } = editProfileForm;
  const {
    calendarMonth,
    createEventError,
    createEventOpen,
    creatingEvent,
    datePickerOpen,
    eventCategory,
    eventDate,
    eventDateValue,
    eventDescription,
    eventEndTime,
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
    selectedEndHour,
    selectedEndMinute,
    selectedPlace,
    selectPlace,
    setCalendarMonth,
    setCreateEventOpen,
    setDatePickerOpen,
    setEventCategory,
    setEventDate,
    setEventDateValue,
    setEventDescription,
    setEventEndTime,
    setEventImageUri,
    setEventIsFree,
    setEventTime,
    setEventTitle,
    setPlaceQuery,
    setSelectedHour,
    setSelectedMinute,
    setSelectedEndHour,
    setSelectedEndMinute,
    setSelectedPlace,
    setTimePickerOpen,
    setTimePickerTarget,
    submitEvent,
    timePickerOpen,
    timePickerTarget,
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
    addQuestStop,
    createQuestError,
    createQuestOpen,
    creatingQuest,
    openCreateQuest,
    pickQuestImage,
    questCityId,
    questDescription,
    questImageUri,
    questStatus,
    questStops,
    questTheme,
    questTitle,
    questXp,
    removeQuestStop,
    setCreateQuestOpen,
    setQuestCityId,
    setQuestDescription,
    setQuestImageUri,
    setQuestStatus,
    setQuestTheme,
    setQuestTitle,
    setQuestXp,
    submitQuest,
    updateQuestStop,
  } = createQuestForm;
  const {
    adminManageEvents,
    adminManageEventsError,
    adminManageEventsLoading,
    adminManageEventsOpen,
    adminReviewError,
    adminReviewLoading,
    adminReviewOpen,
    deleteEvent,
    openAdminManageEvents,
    openAdminReview,
    pendingEvents,
    pendingRewards,
    refreshManagedEvents,
    refreshPendingContent,
    reviewContent,
    reviewingContentId,
    saveManagedEvent,
    savingManagedEventId,
    setAdminManageEventsOpen,
    setAdminReviewOpen,
  } = adminModeration;
  const {
    redeemedRewards,
    redeemSelectedReward,
    resetRewardDetailState,
    rewardDetailsExpanded,
    rewardRedeemError,
    rewardRedeeming,
    rewardRedemptionsError,
    selectedReward,
    selectedRewardCanRedeem,
    selectedRewardIsActive,
    selectedRewardIsUsed,
    selectedRewardPickupCode,
    selectedRewardRemainingMs,
    selectedRewardState,
    selectedRewardXpNeeded,
    setRewardDetailsExpanded,
    setSelectedReward,
  } = rewardRedemption;
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [activityHistoryOpen, setActivityHistoryOpen] = useState(false);
  const [accountActionsOpen, setAccountActionsOpen] = useState(false);
  const [organizerHistoryOpen, setOrganizerHistoryOpen] = useState(false);
  const [organizerRewardsHistoryOpen, setOrganizerRewardsHistoryOpen] = useState(false);
  const [rewardsListOpen, setRewardsListOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<(typeof achievementBadges)[number] | null>(
    null,
  );
  const sortedAchievementBadges = useMemo(
    () =>
      [...achievementBadges].sort(
        (first, second) => Number(second.unlocked) - Number(first.unlocked),
      ),
    [],
  );
  const unlockedBadgeCount = achievementBadges.filter((badge) => badge.unlocked).length;
  const createEventTranslateX = useSharedValue(0);
  const createQuestTranslateX = useSharedValue(0);
  const adminReviewTranslateX = useSharedValue(0);
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

  const createQuestSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-999, 18])
        .failOffsetY([-35, 35])
        .onUpdate((event) => {
          createQuestTranslateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldClose = createQuestTranslateX.value > width * 0.28 || event.velocityX > 700;

          if (shouldClose) {
            createQuestTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(setCreateQuestOpen)(false);
              }
            });
            return;
          }

          createQuestTranslateX.value = withTiming(0, { duration: 180 });
        }),
    [createQuestTranslateX, setCreateQuestOpen, width],
  );

  const createQuestSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: createQuestTranslateX.value }],
  }));

  const adminReviewSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-999, 18])
        .failOffsetY([-35, 35])
        .onUpdate((event) => {
          adminReviewTranslateX.value = Math.max(0, event.translationX);
        })
        .onEnd((event) => {
          const shouldClose = adminReviewTranslateX.value > width * 0.28 || event.velocityX > 700;

          if (shouldClose) {
            adminReviewTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
              if (finished) {
                runOnJS(setAdminReviewOpen)(false);
              }
            });
            return;
          }

          adminReviewTranslateX.value = withTiming(0, { duration: 180 });
        }),
    [adminReviewTranslateX, setAdminReviewOpen, width],
  );

  const adminReviewSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: adminReviewTranslateX.value }],
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
      setMyOrganizerRewards([]);
      setMyOrganizerRewardsError(null);
      return;
    }

    const userIdForLoad = userId;
    const cityIdForLoad = cityData.id;
    let active = true;

    async function loadMyOrganizerContent() {
      const [eventsResult, rewardsResult] = await Promise.all([
        fetchMyOrganizerEvents(userIdForLoad, cityIdForLoad),
        fetchMyOrganizerRewards(userIdForLoad, cityIdForLoad),
      ]);
      if (!active) return;

      setMyOrganizerEvents(eventsResult.events);
      setMyOrganizerEventsError(eventsResult.error);
      setMyOrganizerRewards(rewardsResult.rewards);
      setMyOrganizerRewardsError(rewardsResult.error);
    }

    loadMyOrganizerContent();

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
    if (createQuestOpen) {
      createQuestTranslateX.value = 0;
    }
  }, [createQuestOpen, createQuestTranslateX]);

  useEffect(() => {
    if (adminReviewOpen) {
      adminReviewTranslateX.value = 0;
    }
  }, [adminReviewOpen, adminReviewTranslateX]);

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

  function closeCreateQuestWithAnimation() {
    createQuestTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setCreateQuestOpen)(false);
      }
    });
  }

  function closeAdminReviewWithAnimation() {
    adminReviewTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setAdminReviewOpen)(false);
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
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112, paddingTop: stableModalTopInset + 24 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ProfileRankCard
          avatarInitials={avatarInitials}
          avatarUrl={savedAvatarUrl}
          cityLabel={cityData.label}
          fullName={fullName}
          levelProgress={levelProgress}
          onOpenSettings={() => setAccountActionsOpen(true)}
          organizerStatus={organizerApplicationStatus}
          userXp={userXp}
        />

        <RewardsSection
          cityName={cityData.name}
          error={rewardsError ?? rewardRedemptionsError}
          onOpenAll={() => setRewardsListOpen(true)}
          onSelectReward={setSelectedReward}
          redeemedRewards={redeemedRewards}
          rewards={approvedRewards}
          userXp={userXp}
        />

        <DigitalPassportSection
          badges={sortedAchievementBadges}
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

        {isAdmin && (
          <AdminToolsSection
            onCreateQuest={openCreateQuest}
            onManageEvents={openAdminManageEvents}
            onOpenReview={openAdminReview}
            pendingCount={pendingEvents.length + pendingRewards.length}
          />
        )}

        {organizerApplicationStatus === 'approved' && (
          <>
            <OrganizerEventHistorySection
              error={myOrganizerEventsError}
              events={myOrganizerEvents}
              onOpenAll={() => setOrganizerHistoryOpen(true)}
            />
            <OrganizerRewardHistorySection
              error={myOrganizerRewardsError}
              onOpenAll={() => setOrganizerRewardsHistoryOpen(true)}
              rewards={myOrganizerRewards}
            />
          </>
        )}

        <UserActivitySection
          history={userEventHistory}
          onOpenAll={() => setActivityHistoryOpen(true)}
        />
      </ScrollView>

      <AccountActionsModal
        onClose={() => setAccountActionsOpen(false)}
        onEdit={openEditProfile}
        onSignOut={signOut}
        visible={accountActionsOpen}
      />

      <EditProfileModal
        avatarInitials={avatarInitials}
        avatarUrl={avatarUrl}
        cityId={cityId}
        firstName={firstName}
        isOrganizer={isOrganizer}
        lastName={lastName}
        onChangeAvatar={pickAvatar}
        onChangeCity={setCityId}
        onChangeFirstName={setFirstName}
        onChangeLastName={setLastName}
        onChangeOrganizerBio={setOrganizerBio}
        onChangeOrganizerLocationQuery={changeOrganizerLocationQuery}
        onClose={() => setEditOpen(false)}
        onSave={saveProfile}
        onSelectOrganizerLocation={selectOrganizerLocation}
        organizerBio={organizerBio}
        organizerLocationQuery={organizerLocationQuery}
        organizerLocationSuggestions={organizerLocationSuggestions}
        profileError={profileError}
        searchingOrganizerLocation={searchingOrganizerLocation}
        selectedOrganizerLocation={selectedOrganizerLocation}
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
        eventDateValue={eventDateValue}
        eventDescription={eventDescription}
        eventEndTime={eventEndTime}
        eventImageUri={eventImageUri}
        eventIsFree={eventIsFree}
        eventTime={eventTime}
        eventTitle={eventTitle}
        gesture={createEventSwipeGesture}
        onChangeCalendarMonth={setCalendarMonth}
        onChangeEventCategory={setEventCategory}
        onChangeEventDescription={setEventDescription}
        onChangeEventEndTime={setEventEndTime}
        onChangeEventIsFree={setEventIsFree}
        onChangeEventTime={setEventTime}
        onChangeEventTitle={setEventTitle}
        onChangePlaceQuery={setPlaceQuery}
        onChangeSelectedHour={setSelectedHour}
        onChangeSelectedMinute={setSelectedMinute}
        onChangeSelectedEndHour={setSelectedEndHour}
        onChangeSelectedEndMinute={setSelectedEndMinute}
        onClose={closeCreateEventWithAnimation}
        onCloseDatePicker={() => setDatePickerOpen(false)}
        onCloseTimePicker={() => setTimePickerOpen(false)}
        onOpenDatePicker={() => {
          setTimePickerOpen(false);
          setDatePickerOpen(true);
        }}
        onOpenTimePicker={(target) => {
          setDatePickerOpen(false);
          setTimePickerTarget(target);
          setTimePickerOpen(true);
        }}
        onPickEventImage={pickEventImage}
        onRemoveEventImage={() => setEventImageUri(null)}
        onSelectDate={setEventDate}
        onSelectDateValue={setEventDateValue}
        onSelectPlace={selectPlace}
        onSubmit={submitEvent}
        placeQuery={placeQuery}
        placeSuggestions={placeSuggestions}
        searchingPlaces={searchingPlaces}
        selectedHour={selectedHour}
        selectedMinute={selectedMinute}
        selectedEndHour={selectedEndHour}
        selectedEndMinute={selectedEndMinute}
        selectedPlace={selectedPlace}
        setSelectedPlace={setSelectedPlace}
        stableModalTopInset={stableModalTopInset}
        swipeStyle={createEventSwipeStyle}
        timePickerOpen={timePickerOpen}
        timePickerTarget={timePickerTarget}
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

      <CreateQuestModal
        createQuestError={createQuestError}
        creatingQuest={creatingQuest}
        gesture={createQuestSwipeGesture}
        onAddStop={addQuestStop}
        onChangeCity={setQuestCityId}
        onChangeDescription={setQuestDescription}
        onChangeStatus={setQuestStatus}
        onChangeStop={updateQuestStop}
        onChangeTheme={setQuestTheme}
        onChangeTitle={setQuestTitle}
        onChangeXp={setQuestXp}
        onClose={closeCreateQuestWithAnimation}
        onPickQuestImage={pickQuestImage}
        onRemoveQuestImage={() => setQuestImageUri(null)}
        onRemoveStop={removeQuestStop}
        onSubmit={submitQuest}
        questCityId={questCityId}
        questDescription={questDescription}
        questImageUri={questImageUri}
        questStatus={questStatus}
        questStops={questStops}
        questTheme={questTheme}
        questTitle={questTitle}
        questXp={questXp}
        stableModalTopInset={stableModalTopInset}
        swipeStyle={createQuestSwipeStyle}
        visible={createQuestOpen}
      />

      <AdminReviewModal
        error={adminReviewError}
        events={pendingEvents}
        gesture={adminReviewSwipeGesture}
        loading={adminReviewLoading}
        onClose={closeAdminReviewWithAnimation}
        onDeleteEvent={deleteEvent}
        onRefresh={refreshPendingContent}
        onReview={reviewContent}
        rewards={pendingRewards}
        reviewingContentId={reviewingContentId}
        stableModalTopInset={stableModalTopInset}
        swipeStyle={adminReviewSwipeStyle}
        visible={adminReviewOpen}
      />

      <AdminManageEventsModal
        error={adminManageEventsError}
        events={adminManageEvents}
        loading={adminManageEventsLoading}
        onClose={() => setAdminManageEventsOpen(false)}
        onDeleteEvent={deleteEvent}
        onRefresh={refreshManagedEvents}
        onSaveEvent={saveManagedEvent}
        savingEventId={savingManagedEventId}
        stableModalTopInset={stableModalTopInset}
        visible={adminManageEventsOpen}
      />

      <BadgesModal
        badges={sortedAchievementBadges}
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
        stableModalTopInset={stableModalTopInset}
        visible={activityHistoryOpen}
      />

      <OrganizerEventHistoryModal
        events={myOrganizerEvents}
        onClose={() => setOrganizerHistoryOpen(false)}
        stableModalTopInset={stableModalTopInset}
        visible={organizerHistoryOpen}
      />

      <OrganizerRewardHistoryModal
        onClose={() => setOrganizerRewardsHistoryOpen(false)}
        rewards={myOrganizerRewards}
        stableModalTopInset={stableModalTopInset}
        visible={organizerRewardsHistoryOpen}
      />

      <RewardsListModal
        cityName={cityData.name}
        onClose={() => setRewardsListOpen(false)}
        onSelectReward={setSelectedReward}
        redeemedRewards={redeemedRewards}
        rewards={approvedRewards}
        stableModalTopInset={stableModalTopInset}
        userXp={userXp}
        visible={rewardsListOpen}
      />

      <RewardDetailModal
        detailsExpanded={rewardDetailsExpanded}
        gesture={rewardSwipeGesture}
        onClose={closeRewardWithAnimation}
        onRedeem={redeemSelectedReward}
        onToggleDetails={() => setRewardDetailsExpanded((current) => !current)}
        pickupCode={selectedRewardPickupCode}
        remainingMs={selectedRewardRemainingMs}
        reward={selectedReward}
        rewardCanRedeem={selectedRewardCanRedeem}
        rewardRedeemError={rewardRedeemError}
        rewardRedeeming={rewardRedeeming}
        rewardIsActive={selectedRewardIsActive}
        rewardIsUsed={selectedRewardIsUsed}
        rewardStateExists={!!selectedRewardState}
        rewardXpNeeded={selectedRewardXpNeeded}
        swipeStyle={rewardSwipeStyle}
        userXp={userXp}
      />
    </View>
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
