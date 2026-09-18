import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AdminReviewModal } from '@/components/profile/admin-review-modal';
import { InlineToast } from '@/components/inline-toast';
import { AdminManageEventsModal } from '@/components/profile/admin-manage-events-modal';
import { CreateEventModal } from '@/components/profile/create-event-modal';
import { CreateQuestModal } from '@/components/profile/create-quest-modal';
import { CreateRewardModal } from '@/components/profile/create-reward-modal';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import {
  AccountActionsModal,
  AdminXpAuditModal,
  AdminToolsSection,
  DigitalPassportSection,
  OrganizerEventHistoryModal,
  OrganizerToolsSection,
  OrganizerRewardHistoryModal,
  ProfileHistoryList,
  ProfileRankCard,
  UserActivityHistoryModal,
  RewardsListModal,
  RewardsSection,
  UniversityAffiliationSection,
} from '@/components/profile/profile-sections';
import { RewardDetailModal } from '@/components/profile/reward-detail-modal';
import { type CityId, type RewardPartner, defaultCityId, getCultureCityData } from '@/data/culture';
import { getXpLevelProgress } from '@/data/profile';
import { useAdminModeration } from '@/hooks/profile/use-admin-moderation';
import { useCreateEventForm } from '@/hooks/profile/use-create-event-form';
import { useCreateQuestForm } from '@/hooks/profile/use-create-quest-form';
import { useCreateRewardForm } from '@/hooks/profile/use-create-reward-form';
import { useEditProfileForm } from '@/hooks/profile/use-edit-profile-form';
import { useRewardRedemption } from '@/hooks/profile/use-reward-redemption';
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { UserEventHistoryItem } from '@/lib/event-history';
import { fetchMyOrganizerEvents, type ManagedOrganizerEvent } from '@/lib/organizer-events';
import {
  fetchMyOrganizerRewards,
  fetchOrganizerRewards,
  type ManagedOrganizerReward,
} from '@/lib/organizer-rewards';
import {
  fetchMyUniversityMembership,
  type UserUniversityMembership,
} from '@/lib/university-leaderboard';
import { fetchXpTransactions, type XpTransaction } from '@/lib/xp-transactions';
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
  const [notice, setNotice] = useState<string | null>(null);
  const stableModalTopInset = useStableTopInset();
  const {
    organizerApplicationStatus,
    refreshOrganizerApplicationStatus,
    hasRole,
    session,
    signOut,
    updateProfile,
  } = useAuth();
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
  const [myOrganizerEventsLoading, setMyOrganizerEventsLoading] = useState(false);
  const [myOrganizerRewards, setMyOrganizerRewards] = useState<ManagedOrganizerReward[]>([]);
  const [myOrganizerRewardsError, setMyOrganizerRewardsError] = useState<string | null>(null);
  const [myOrganizerRewardsLoading, setMyOrganizerRewardsLoading] = useState(false);
  const [organizerContentRefreshNonce, setOrganizerContentRefreshNonce] = useState(0);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [universityMembership, setUniversityMembership] = useState<UserUniversityMembership | null>(
    null,
  );
  const [universityMembershipError, setUniversityMembershipError] = useState<string | null>(null);
  const [universityMembershipReloadNonce, setUniversityMembershipReloadNonce] = useState(0);
  const [xpTransactions, setXpTransactions] = useState<XpTransaction[]>([]);
  const [xpTransactionsError, setXpTransactionsError] = useState<string | null>(null);
  const [xpTransactionsLoading, setXpTransactionsLoading] = useState(false);
  const [adminXpAuditOpen, setAdminXpAuditOpen] = useState(false);
  const [adminXpTransactions, setAdminXpTransactions] = useState<XpTransaction[]>([]);
  const [adminXpTransactionsError, setAdminXpTransactionsError] = useState<string | null>(null);
  const [adminXpTransactionsLoading, setAdminXpTransactionsLoading] = useState(false);
  const savedAvatarUrl = session?.user.user_metadata?.avatar_url || null;
  const levelProgress = getXpLevelProgress(userXp);
  const editProfileForm = useEditProfileForm({
    onUniversityMembershipSaved: setUniversityMembership,
    savedAvatarUrl,
    savedCityId,
    savedFirstName,
    savedLastName,
    savedOrganizerBio,
    savedOrganizerLocationAddress,
    savedOrganizerLocationLatitude,
    savedOrganizerLocationLongitude,
    savedOrganizerLocationName,
    savedUniversityMembership: universityMembership,
    updateProfile,
  });
  const createEventForm = useCreateEventForm({
    onEventCreated: () => {
      setOrganizerContentRefreshNonce((current) => current + 1);
      onEventCreated?.();
    },
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
    onNotice: setNotice,
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
    isStudent,
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
    setIsStudent,
    setCityId,
    setEditOpen,
    setFirstName,
    setLastName,
    setOrganizerBio,
    setStudentEmail,
    setUniversityId,
    studentEmail,
    universityId,
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
    openEditEvent,
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
    isEditingEvent,
  } = createEventForm;
  const {
    createRewardError,
    createRewardOpen,
    creatingReward,
    openCreateReward,
    rewardDescription,
    rewardAvailability,
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
    setRewardAvailableEndTime,
    setRewardAvailableFrom,
    setRewardAvailableStartTime,
    setRewardAvailableUntil,
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
    adminManageRewards,
    adminReviewError,
    adminReviewLoading,
    adminReviewOpen,
    deleteEvent,
    deleteReward,
    openAdminManageEvents,
    openAdminReview,
    pendingEvents,
    pendingRewards,
    refreshManagedEvents,
    refreshPendingContent,
    reviewContent,
    reviewingContentId,
    saveManagedEvent,
    saveManagedReward,
    savingManagedEventId,
    savingManagedRewardId,
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
    selectedRewardIsAvailableNow,
    selectedRewardIsUsed,
    selectedRewardPickupCode,
    selectedRewardRemainingMs,
    selectedRewardState,
    selectedRewardXpNeeded,
    setRewardDetailsExpanded,
    setSelectedReward,
  } = rewardRedemption;
  const [activityHistoryOpen, setActivityHistoryOpen] = useState(false);
  const [accountActionsOpen, setAccountActionsOpen] = useState(false);
  const [organizerHistoryOpen, setOrganizerHistoryOpen] = useState(false);
  const [organizerRewardsHistoryOpen, setOrganizerRewardsHistoryOpen] = useState(false);
  const [rewardsListOpen, setRewardsListOpen] = useState(false);
  const {
    closeWithAnimation: closeCreateEventWithAnimation,
    gesture: createEventSwipeGesture,
    swipeStyle: createEventSwipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => setCreateEventOpen(false),
    visible: createEventOpen,
  });
  const {
    closeWithAnimation: closeCreateQuestWithAnimation,
    gesture: createQuestSwipeGesture,
    swipeStyle: createQuestSwipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => setCreateQuestOpen(false),
    visible: createQuestOpen,
  });
  const {
    closeWithAnimation: closeAdminReviewWithAnimation,
    gesture: adminReviewSwipeGesture,
    swipeStyle: adminReviewSwipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => setAdminReviewOpen(false),
    visible: adminReviewOpen,
  });
  const {
    closeWithAnimation: closeRewardWithAnimation,
    gesture: rewardSwipeGesture,
    swipeStyle: rewardSwipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => {
      resetRewardDetailState();
      setSelectedReward(null);
    },
    visible: !!selectedReward,
  });

  useEffect(() => {
    if (session?.user.id) {
      refreshOrganizerApplicationStatus();
    }
  }, [refreshOrganizerApplicationStatus, session?.user.id]);

  useEffect(() => {
    let active = true;

    async function loadUniversityMembership() {
      if (!session?.user.id) {
        setUniversityMembership(null);
        setUniversityMembershipError(null);
        return;
      }

      const result = await fetchMyUniversityMembership();
      if (!active) return;

      setUniversityMembership(result.membership);
      setUniversityMembershipError(result.error);
    }

    loadUniversityMembership();

    return () => {
      active = false;
    };
  }, [session?.user.id, universityMembershipReloadNonce]);

  useEffect(() => {
    const userId = session?.user.id;

    if (!userId) {
      setXpTransactions([]);
      setXpTransactionsError(null);
      setXpTransactionsLoading(false);
      return;
    }

    let active = true;

    async function loadXpTransactions() {
      setXpTransactionsLoading(true);
      const result = await fetchXpTransactions({ limit: 30, userId });
      if (!active) return;

      setXpTransactions(result.transactions);
      setXpTransactionsError(result.error);
      setXpTransactionsLoading(false);
    }

    loadXpTransactions();

    return () => {
      active = false;
    };
  }, [session?.user.id, userXp]);

  useEffect(() => {
    let active = true;

    async function loadApprovedRewards() {
      setRewardsLoading(true);
      const result = await fetchOrganizerRewards(savedCityId);
      if (!active) return;

      setApprovedRewards(result.rewards);
      setRewardsError(result.error);
      setRewardsLoading(false);
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
      setMyOrganizerEventsLoading(false);
      setMyOrganizerRewards([]);
      setMyOrganizerRewardsError(null);
      setMyOrganizerRewardsLoading(false);
      return;
    }

    const userIdForLoad = userId;
    const cityIdForLoad = cityData.id;
    let active = true;

    async function loadMyOrganizerContent() {
      setMyOrganizerEventsLoading(true);
      setMyOrganizerRewardsLoading(true);
      const [eventsResult, rewardsResult] = await Promise.all([
        fetchMyOrganizerEvents(userIdForLoad, cityIdForLoad),
        fetchMyOrganizerRewards(userIdForLoad, cityIdForLoad),
      ]);
      if (!active) return;

      setMyOrganizerEvents(eventsResult.events);
      setMyOrganizerEventsError(eventsResult.error);
      setMyOrganizerEventsLoading(false);
      setMyOrganizerRewards(rewardsResult.rewards);
      setMyOrganizerRewardsError(rewardsResult.error);
      setMyOrganizerRewardsLoading(false);
    }

    loadMyOrganizerContent();

    return () => {
      active = false;
    };
  }, [
    cityData.id,
    eventsRefreshKey,
    organizerApplicationStatus,
    organizerContentRefreshNonce,
    session?.user.id,
  ]);

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center font-body text-[15px] text-muted">
          Log in to view your profile.
        </Text>
      </View>
    );
  }

  async function openAdminXpAudit() {
    setAdminXpAuditOpen(true);
    await refreshAdminXpAudit();
  }

  async function refreshAdminXpAudit() {
    if (!isAdmin) return;

    setAdminXpTransactionsLoading(true);
    const result = await fetchXpTransactions({ limit: 60 });
    setAdminXpTransactions(result.transactions);
    setAdminXpTransactionsError(result.error);
    setAdminXpTransactionsLoading(false);
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112, paddingTop: stableModalTopInset + 8 }}
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

        <UniversityAffiliationSection
          error={universityMembershipError}
          membership={universityMembership}
          onRetry={() => setUniversityMembershipReloadNonce((current) => current + 1)}
        />

        <RewardsSection
          cityName={cityData.name}
          error={rewardsError ?? rewardRedemptionsError}
          loading={rewardsLoading}
          onOpenAll={() => setRewardsListOpen(true)}
          onSelectReward={setSelectedReward}
          redeemedRewards={redeemedRewards}
          rewards={approvedRewards}
          userXp={userXp}
        />

        <DigitalPassportSection badges={[]} />

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
            onOpenXpAudit={openAdminXpAudit}
            onOpenReview={openAdminReview}
            pendingCount={pendingEvents.length + pendingRewards.length}
          />
        )}

        <ProfileHistoryList
          events={myOrganizerEvents}
          eventsError={myOrganizerEventsError}
          history={userEventHistory}
          onOpenActivity={() => setActivityHistoryOpen(true)}
          onOpenEvents={() => setOrganizerHistoryOpen(true)}
          onOpenRewards={() => setOrganizerRewardsHistoryOpen(true)}
          rewards={myOrganizerRewards}
          rewardsError={myOrganizerRewardsError}
          transactions={xpTransactions}
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
        isStudent={isStudent}
        isOrganizer={isOrganizer}
        lastName={lastName}
        onChangeAvatar={pickAvatar}
        onChangeCity={setCityId}
        onChangeFirstName={setFirstName}
        onChangeLastName={setLastName}
        onChangeOrganizerBio={setOrganizerBio}
        onChangeOrganizerLocationQuery={changeOrganizerLocationQuery}
        onChangeStudentEmail={setStudentEmail}
        onChangeUniversity={setUniversityId}
        onClose={() => setEditOpen(false)}
        onSave={saveProfile}
        onSelectOrganizerLocation={selectOrganizerLocation}
        onToggleStudent={setIsStudent}
        organizerBio={organizerBio}
        organizerLocationQuery={organizerLocationQuery}
        organizerLocationSuggestions={organizerLocationSuggestions}
        profileError={profileError}
        searchingOrganizerLocation={searchingOrganizerLocation}
        selectedOrganizerLocation={selectedOrganizerLocation}
        savingProfile={savingProfile}
        studentEmail={studentEmail}
        universityId={universityId}
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
        isEditingEvent={isEditingEvent}
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
        onChangeRewardAvailableEndTime={setRewardAvailableEndTime}
        onChangeRewardAvailableFrom={setRewardAvailableFrom}
        onChangeRewardAvailableStartTime={setRewardAvailableStartTime}
        onChangeRewardAvailableUntil={setRewardAvailableUntil}
        onChangeRewardDescription={setRewardDescription}
        onChangeRewardPlaceQuery={setRewardPlaceQuery}
        onChangeRewardTitle={setRewardTitle}
        onChangeRewardXp={setRewardXp}
        onClose={() => setCreateRewardOpen(false)}
        onSelectRewardPlace={selectRewardPlace}
        onSubmit={submitReward}
        organizerAvatarUrl={savedAvatarUrl}
        organizerInitials={avatarInitials || 'CQ'}
        organizerName={fullName || 'CultureQuest organiser'}
        rewardAvailability={rewardAvailability}
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
        onDeleteReward={deleteReward}
        onRefresh={refreshManagedEvents}
        onSaveEvent={saveManagedEvent}
        onSaveReward={saveManagedReward}
        rewards={adminManageRewards}
        savingEventId={savingManagedEventId}
        savingRewardId={savingManagedRewardId}
        stableModalTopInset={stableModalTopInset}
        visible={adminManageEventsOpen}
      />

      <AdminXpAuditModal
        error={adminXpTransactionsError}
        loading={adminXpTransactionsLoading}
        onClose={() => setAdminXpAuditOpen(false)}
        onRefresh={refreshAdminXpAudit}
        stableModalTopInset={stableModalTopInset}
        transactions={adminXpTransactions}
        visible={adminXpAuditOpen}
      />

      <InlineToast message={notice} onDismiss={() => setNotice(null)} />
      <UserActivityHistoryModal
        error={xpTransactionsError}
        history={userEventHistory}
        loading={xpTransactionsLoading}
        onClose={() => setActivityHistoryOpen(false)}
        stableModalTopInset={stableModalTopInset}
        transactions={xpTransactions}
        visible={activityHistoryOpen}
      />

      <OrganizerEventHistoryModal
        events={myOrganizerEvents}
        onClose={() => setOrganizerHistoryOpen(false)}
        onEditEvent={(event) => {
          setOrganizerHistoryOpen(false);
          openEditEvent(event);
        }}
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
        rewardIsAvailableNow={selectedRewardIsAvailableNow}
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
