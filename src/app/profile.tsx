import { useEffect, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';

import { AdminReviewModal } from '@/components/profile/admin-review-modal';
import { BadgesModal } from '@/components/profile/badges-modal';
import { type AchievementBadge } from '@/components/profile/badges';
import { buildPassportAchievements } from '@/components/profile/passport-achievements';
import { EventDetailModal, type EventCheckInResult } from '@/app/explore';
import { InlineToast } from '@/components/inline-toast';
import { AdminManageEventsModal } from '@/components/profile/admin-manage-events-modal';
import { CreateEventModal } from '@/components/profile/create-event-modal';
import { CreateQuestModal } from '@/components/profile/create-quest-modal';
import { CreateRewardModal } from '@/components/profile/create-reward-modal';
import { OrganizerAnnouncementModal } from '@/components/profile/organizer-announcement-modal';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { FollowedOrganizersModal } from '@/components/profile/followed-organizers-modal';
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
import {
  type CityId,
  type CultureEvent,
  type RewardPartner,
  defaultCityId,
  getCultureCityData,
} from '@/data/culture';
import { getXpLevelProgress } from '@/data/profile';
import { useAdminModeration } from '@/hooks/profile/use-admin-moderation';
import { useCreateEventForm } from '@/hooks/profile/use-create-event-form';
import { useCreateQuestForm } from '@/hooks/profile/use-create-quest-form';
import { useCreateRewardForm } from '@/hooks/profile/use-create-reward-form';
import { useEditProfileForm } from '@/hooks/profile/use-edit-profile-form';
import { useRewardRedemption } from '@/hooks/profile/use-reward-redemption';
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import {
  emptyDigitalPassportProgress,
  fetchMyDigitalPassportProgress,
} from '@/lib/digital-passport';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import type { UserEventHistoryItem, UserEventStatus } from '@/lib/event-history';
import {
  fetchFollowedOrganizerProfiles,
  subscribeToOrganizerFollows,
  unfollowOrganizer,
} from '@/lib/organizer-follows';
import { publishOrganizerAnnouncement } from '@/lib/organizer-announcements';
import {
  fetchMyOrganizerEvents,
  fetchOrganizerEvents,
  type ManagedOrganizerEvent,
} from '@/lib/organizer-events';
import type { OrganizerProfile } from '@/lib/organizer-profiles';
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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type ProfileScreenProps = {
  checkedInEventIds?: string[];
  eventsRefreshKey?: number;
  eventStatuses?: Record<string, UserEventStatus>;
  onEventCreated?: () => void;
  onEventCheckIn?: (
    event: CultureEvent,
    checkInCode: string,
    location: { latitude: number; longitude: number },
  ) => Promise<EventCheckInResult>;
  onEventStatusChange?: (
    eventId: string,
    status: UserEventStatus | null,
  ) => Promise<{ error: string | null }>;
  onQuestCreated?: () => void;
  onRewardCreated?: () => void;
  onUserXpChange?: (nextXp: number) => void;
  onUserQcChange?: (nextQc: number) => void;
  rewardsRefreshKey?: number;
  userEventHistory?: UserEventHistoryItem[];
  userXp?: number;
  userQc?: number;
};

export default function ProfileScreen({
  eventsRefreshKey = 0,
  checkedInEventIds = [],
  eventStatuses = {},
  onEventCreated,
  onEventCheckIn,
  onEventStatusChange,
  onQuestCreated,
  onRewardCreated,
  onUserXpChange,
  onUserQcChange,
  rewardsRefreshKey = 0,
  userEventHistory = [],
  userXp = 0,
  userQc = 0,
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
  const [, setMyOrganizerEventsLoading] = useState(false);
  const [myOrganizerRewards, setMyOrganizerRewards] = useState<ManagedOrganizerReward[]>([]);
  const [myOrganizerRewardsError, setMyOrganizerRewardsError] = useState<string | null>(null);
  const [, setMyOrganizerRewardsLoading] = useState(false);
  const [organizerContentRefreshNonce, setOrganizerContentRefreshNonce] = useState(0);
  const [organizerAnnouncementOpen, setOrganizerAnnouncementOpen] = useState(false);
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
  const [followedOrganizers, setFollowedOrganizers] = useState<OrganizerProfile[]>([]);
  const [followedOrganizersError, setFollowedOrganizersError] = useState<string | null>(null);
  const [followedOrganizersLoading, setFollowedOrganizersLoading] = useState(false);
  const [followedOrganizersOpen, setFollowedOrganizersOpen] = useState(false);
  const [selectedFollowedOrganizer, setSelectedFollowedOrganizer] =
    useState<OrganizerProfile | null>(null);
  const [followedOrganizerEvents, setFollowedOrganizerEvents] = useState<CultureEvent[]>([]);
  const [rewardOrganizerProfile, setRewardOrganizerProfile] = useState<OrganizerProfile | null>(
    null,
  );
  const [rewardOrganizerEvents, setRewardOrganizerEvents] = useState<CultureEvent[]>([]);
  const [rewardOrganizerEvent, setRewardOrganizerEvent] = useState<CultureEvent | null>(null);
  const [rewardOrganizerEventProfile, setRewardOrganizerEventProfile] =
    useState<OrganizerProfile | null>(null);
  const [followedOrganizersReloadNonce, setFollowedOrganizersReloadNonce] = useState(0);
  const [adminXpAuditOpen, setAdminXpAuditOpen] = useState(false);
  const [adminXpTransactions, setAdminXpTransactions] = useState<XpTransaction[]>([]);
  const [adminXpTransactionsError, setAdminXpTransactionsError] = useState<string | null>(null);
  const [adminXpTransactionsLoading, setAdminXpTransactionsLoading] = useState(false);
  const [passportProgress, setPassportProgress] = useState(emptyDigitalPassportProgress);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [passportOpen, setPassportOpen] = useState(false);
  const [selectedPassportBadge, setSelectedPassportBadge] = useState<AchievementBadge | null>(null);
  const savedAvatarUrl = session?.user.user_metadata?.avatar_url || null;
  const levelProgress = getXpLevelProgress(userXp);
  const passportBadges = buildPassportAchievements(passportProgress);
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
    onUserQcChange,
    rewards: approvedRewards,
    userId: session?.user.id,
    userQc,
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
    organizerLocationSearchError,
    organizerLocationSuggestions,
    pickAvatar,
    profileError,
    saveProfile,
    searchingOrganizerLocation,
    selectedOrganizerLocation,
    selectOrganizerLocation,
    retryOrganizerLocationSearch,
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
    datePickerTarget,
    eventCategory,
    eventDate,
    eventDateValue,
    eventEndDate,
    eventEndDateValue,
    eventDescription,
    eventUpdateMessage,
    eventEndTime,
    eventImageUri,
    eventIsFree,
    eventTime,
    eventTitle,
    openCreateEvent,
    openEditEvent,
    pickEventImage,
    placeQuery,
    placeSearchError,
    placeSuggestions,
    retryPlaceSearch,
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
    setDatePickerTarget,
    setEventCategory,
    setEventDate,
    setEventDateValue,
    setEventEndDate,
    setEventEndDateValue,
    setEventDescription,
    setEventUpdateMessage,
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
    isEditingReward,
    openCreateReward,
    openEditReward,
    rewardDescription,
    rewardUpdateMessage,
    rewardAvailability,
    rewardPlaceQuery,
    rewardPlaceSearchError,
    rewardPlaceSuggestions,
    retryRewardPlaceSearch,
    rewardTitle,
    rewardQc,
    searchingRewardPlaces,
    selectedRewardPlace,
    selectRewardPlace,
    setCreateRewardOpen,
    setRewardDescription,
    setRewardUpdateMessage,
    setRewardPlaceQuery,
    setRewardTitle,
    setRewardQc,
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
    questAvailableFrom,
    questAvailableUntil,
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
    setQuestAvailableFrom,
    setQuestAvailableUntil,
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
    closeWithAnimation: closePassportWithAnimation,
    gesture: passportSwipeGesture,
    swipeStyle: passportSwipeStyle,
  } = useCardSwipeBack({
    enabled: !selectedPassportBadge,
    onSwipeBack: () => {
      setSelectedPassportBadge(null);
      setPassportOpen(false);
    },
    visible: passportOpen,
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
    enabled: !rewardOrganizerProfile,
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
    let active = true;

    async function loadFollowedOrganizers() {
      if (!session?.user.id) {
        setFollowedOrganizers([]);
        setFollowedOrganizersError(null);
        setFollowedOrganizersLoading(false);
        return;
      }

      setFollowedOrganizersLoading(true);
      const result = await fetchFollowedOrganizerProfiles();
      if (!active) return;

      setFollowedOrganizers(result.profiles);
      setFollowedOrganizersError(result.error);
      setFollowedOrganizersLoading(false);
    }

    void loadFollowedOrganizers();

    return () => {
      active = false;
    };
  }, [followedOrganizersReloadNonce, session?.user.id]);

  useEffect(() => {
    // A profile can be followed from Discover, an event, or a reward while the
    // Profile tab stays mounted in the background. Refetch as soon as that
    // mutation succeeds, instead of making the user restart the app.
    return subscribeToOrganizerFollows(() => {
      setFollowedOrganizersReloadNonce((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setFollowedOrganizersReloadNonce((current) => current + 1);
      }
    });
    return () => subscription.remove();
  }, []);

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

    async function loadPassportProgress() {
      if (!session?.user.id) {
        setPassportProgress(emptyDigitalPassportProgress);
        setPassportError(null);
        return;
      }

      const result = await fetchMyDigitalPassportProgress();
      if (!active) return;
      setPassportProgress(result.progress);
      setPassportError(result.error);
    }

    void loadPassportProgress();
    return () => {
      active = false;
    };
  }, [session?.user.id, userXp]);

  useEffect(() => {
    let active = true;

    async function loadApprovedRewards({ showLoading = false } = {}) {
      if (showLoading) setRewardsLoading(true);
      const result = await fetchOrganizerRewards(savedCityId);
      if (!active) return;

      setApprovedRewards(result.rewards);
      setRewardsError(result.error);
      setRewardsLoading(false);
    }

    void loadApprovedRewards({ showLoading: true });

    // A reward can be moderated from another account while this screen stays mounted.
    // Refresh both on a database change and after the app returns to the foreground so
    // availability times never remain stale in an already-open client.
    const channel = supabase
      .channel(`approved-organizer-rewards:${savedCityId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organizer_rewards' }, () => {
        void loadApprovedRewards();
        setOrganizerContentRefreshNonce((current) => current + 1);
      })
      .subscribe();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadApprovedRewards();
    });

    return () => {
      active = false;
      appStateSubscription.remove();
      void supabase.removeChannel(channel);
    };
  }, [rewardsRefreshKey, savedCityId]);

  useEffect(() => {
    setSelectedReward((current) => {
      if (!current) return current;

      // Keep an open reward detail sheet in sync too, rather than waiting for it
      // to be closed and opened again after an administrator edits availability.
      return approvedRewards.find((reward) => reward.id === current.id) ?? null;
    });
  }, [approvedRewards, setSelectedReward]);

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
      <View className="flex-1 items-center justify-center bg-canvas px-6">
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

  async function removeFollowedOrganizer(organizerId: string) {
    const userId = session?.user.id;
    if (!userId) return { error: 'Log in to manage followed organizers.' };

    const result = await unfollowOrganizer(userId, organizerId);
    if (!result.error) {
      setFollowedOrganizers((current) => current.filter((profile) => profile.id !== organizerId));
    }

    return result;
  }

  async function sendOrganizerAnnouncement(input: {
    body: string;
    eventId: string | null;
    title: string;
  }) {
    const result = await publishOrganizerAnnouncement(input);
    if (!result.error) {
      setNotice('Announcement sent to your followers.');
    }
    return result;
  }

  async function openFollowedOrganizer(profile: OrganizerProfile) {
    setSelectedFollowedOrganizer(profile);
    const result = await fetchOrganizerEvents(savedCityId);
    if (!result.error) setFollowedOrganizerEvents(result.events);
  }

  function openRewardOrganizer(reward: RewardPartner) {
    const profile = organizerProfileFromReward(reward, savedCityId);
    if (!profile) return;

    // Keep the reward open underneath the profile. The profile is rendered as
    // an embedded layer, so back returns to this exact reward without flashing
    // the Profile tab in between.
    setRewardOrganizerProfile(profile);
    setRewardOrganizerEvents([]);
    void fetchOrganizerEvents(profile.cityId).then((result) => {
      if (!result.error) setRewardOrganizerEvents(result.events);
    });
  }

  const rewardOrganizerEventStatus = rewardOrganizerEvent
    ? eventStatuses[rewardOrganizerEvent.id]
    : undefined;
  const rewardOrganizerEventRsvp =
    rewardOrganizerEventStatus === 'interested' || rewardOrganizerEventStatus === 'going'
      ? rewardOrganizerEventStatus
      : undefined;

  return (
    <View className="flex-1 bg-canvas">
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
          userQc={userQc}
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
          userQc={userQc}
        />

        <DigitalPassportSection
          badges={passportBadges}
          error={passportError}
          onOpenAll={() => setPassportOpen(true)}
          onOpenBadge={(badge) => {
            setSelectedPassportBadge(badge);
            setPassportOpen(true);
          }}
        />

        <OrganizerToolsSection
          cityName={cityData.name}
          onCreateAnnouncement={() => setOrganizerAnnouncementOpen(true)}
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
          followedOrganizerCount={followedOrganizers.length}
          history={userEventHistory}
          isOrganizer={isOrganizer}
          onOpenActivity={() => setActivityHistoryOpen(true)}
          onOpenEvents={() => setOrganizerHistoryOpen(true)}
          onOpenFollowing={() => setFollowedOrganizersOpen(true)}
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

      <FollowedOrganizersModal
        activeProfile={selectedFollowedOrganizer}
        activeProfileEvents={followedOrganizerEvents}
        checkedInEventIds={checkedInEventIds}
        error={followedOrganizersError}
        eventStatuses={eventStatuses}
        loading={followedOrganizersLoading}
        onClose={() => setFollowedOrganizersOpen(false)}
        onCloseProfile={() => setSelectedFollowedOrganizer(null)}
        onEventCheckIn={
          onEventCheckIn ??
          (async () => ({ error: 'Check-in is not available right now.', success: false }))
        }
        onEventStatusChange={
          onEventStatusChange ?? (async () => ({ error: 'RSVP is not available right now.' }))
        }
        onOpenProfile={(profile) => void openFollowedOrganizer(profile)}
        onRetry={() => setFollowedOrganizersReloadNonce((current) => current + 1)}
        onUnfollow={removeFollowedOrganizer}
        profiles={followedOrganizers}
        stableModalTopInset={stableModalTopInset}
        visible={followedOrganizersOpen}
      />

      <BadgesModal
        badges={passportBadges}
        gesture={passportSwipeGesture}
        onClose={closePassportWithAnimation}
        onSelectBadge={setSelectedPassportBadge}
        selectedBadge={selectedPassportBadge}
        stableModalTopInset={stableModalTopInset}
        swipeStyle={passportSwipeStyle}
        unlockedBadgeCount={passportBadges.filter((badge) => badge.unlocked).length}
        visible={passportOpen}
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
        onRetryOrganizerLocationSearch={retryOrganizerLocationSearch}
        onSave={saveProfile}
        onSelectOrganizerLocation={selectOrganizerLocation}
        onToggleStudent={setIsStudent}
        organizerBio={organizerBio}
        organizerLocationQuery={organizerLocationQuery}
        organizerLocationSearchError={organizerLocationSearchError}
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
        datePickerTarget={datePickerTarget}
        eventCategory={eventCategory}
        eventDate={eventDate}
        eventDateValue={eventDateValue}
        eventEndDate={eventEndDate}
        eventEndDateValue={eventEndDateValue}
        eventDescription={eventDescription}
        eventUpdateMessage={eventUpdateMessage}
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
        onChangeEventUpdateMessage={setEventUpdateMessage}
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
          setDatePickerTarget('start');
          setDatePickerOpen(true);
        }}
        onOpenEndDatePicker={() => {
          setTimePickerOpen(false);
          setDatePickerTarget('end');
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
        onSelectEndDate={setEventEndDate}
        onSelectEndDateValue={setEventEndDateValue}
        onSelectPlace={selectPlace}
        onSubmit={submitEvent}
        placeQuery={placeQuery}
        placeSearchError={placeSearchError}
        placeSuggestions={placeSuggestions}
        onRetryPlaceSearch={retryPlaceSearch}
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

      <OrganizerAnnouncementModal
        events={myOrganizerEvents}
        onClose={() => setOrganizerAnnouncementOpen(false)}
        onPublish={sendOrganizerAnnouncement}
        stableModalTopInset={stableModalTopInset}
        visible={organizerAnnouncementOpen}
      />

      <CreateRewardModal
        createRewardError={createRewardError}
        creatingReward={creatingReward}
        isEditingReward={isEditingReward}
        onChangeRewardAvailableEndTime={setRewardAvailableEndTime}
        onChangeRewardAvailableFrom={setRewardAvailableFrom}
        onChangeRewardAvailableStartTime={setRewardAvailableStartTime}
        onChangeRewardAvailableUntil={setRewardAvailableUntil}
        onChangeRewardDescription={setRewardDescription}
        onChangeRewardUpdateMessage={setRewardUpdateMessage}
        onChangeRewardPlaceQuery={setRewardPlaceQuery}
        onChangeRewardTitle={setRewardTitle}
        onChangeRewardQc={setRewardQc}
        onClose={() => setCreateRewardOpen(false)}
        onSelectRewardPlace={selectRewardPlace}
        onSubmit={submitReward}
        onRetryRewardPlaceSearch={retryRewardPlaceSearch}
        organizerAvatarUrl={savedAvatarUrl}
        organizerInitials={avatarInitials || 'CQ'}
        organizerName={fullName || 'CultureQuest organiser'}
        rewardAvailability={rewardAvailability}
        rewardDescription={rewardDescription}
        rewardUpdateMessage={rewardUpdateMessage}
        rewardPlaceQuery={rewardPlaceQuery}
        rewardPlaceSearchError={rewardPlaceSearchError}
        rewardPlaceSuggestions={rewardPlaceSuggestions}
        rewardTitle={rewardTitle}
        rewardQc={rewardQc}
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
        onChangeAvailableFrom={setQuestAvailableFrom}
        onChangeAvailableUntil={setQuestAvailableUntil}
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
        questAvailableFrom={questAvailableFrom}
        questAvailableUntil={questAvailableUntil}
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
        checkedInEventIds={checkedInEventIds}
        cityName={
          rewardOrganizerProfile
            ? getCultureCityData(rewardOrganizerProfile.cityId).name
            : cityData.name
        }
        error={xpTransactionsError}
        eventStatuses={eventStatuses}
        history={userEventHistory}
        loading={xpTransactionsLoading}
        onClose={() => setActivityHistoryOpen(false)}
        onEventCheckIn={onEventCheckIn}
        onEventStatusChange={onEventStatusChange}
        stableModalTopInset={stableModalTopInset}
        transactions={xpTransactions}
        visible={activityHistoryOpen}
      />

      <OrganizerEventHistoryModal
        checkedInEventIds={checkedInEventIds}
        cityName={cityData.name}
        events={myOrganizerEvents}
        eventStatuses={eventStatuses}
        onClose={() => setOrganizerHistoryOpen(false)}
        onEditEvent={(event) => {
          setOrganizerHistoryOpen(false);
          openEditEvent(event);
        }}
        onEventCheckIn={onEventCheckIn}
        onEventStatusChange={onEventStatusChange}
        stableModalTopInset={stableModalTopInset}
        visible={organizerHistoryOpen}
      />

      <OrganizerRewardHistoryModal
        onClose={() => setOrganizerRewardsHistoryOpen(false)}
        onEditReward={(reward) => {
          setOrganizerRewardsHistoryOpen(false);
          openEditReward(reward);
        }}
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
        userQc={userQc}
        visible={rewardsListOpen}
      />

      <RewardDetailModal
        cityName={cityData.name}
        detailsExpanded={rewardDetailsExpanded}
        gesture={rewardSwipeGesture}
        onClose={closeRewardWithAnimation}
        onCloseOrganizer={() => setRewardOrganizerProfile(null)}
        onOpenOrganizer={openRewardOrganizer}
        onOpenOrganizerEvent={(event) => {
          if (!rewardOrganizerProfile) return;

          setRewardOrganizerEventProfile(rewardOrganizerProfile);
          setRewardOrganizerProfile(null);
          setRewardOrganizerEvent(event);
        }}
        onRedeem={redeemSelectedReward}
        onToggleDetails={() => setRewardDetailsExpanded((current) => !current)}
        pickupCode={selectedRewardPickupCode}
        remainingMs={selectedRewardRemainingMs}
        reward={selectedReward}
        organizerEvents={rewardOrganizerEvents}
        organizerProfile={rewardOrganizerProfile}
        rewardCanRedeem={selectedRewardCanRedeem}
        rewardIsAvailableNow={selectedRewardIsAvailableNow}
        rewardRedeemError={rewardRedeemError}
        rewardRedeeming={rewardRedeeming}
        rewardIsActive={selectedRewardIsActive}
        rewardIsUsed={selectedRewardIsUsed}
        rewardStateExists={!!selectedRewardState}
        rewardQcNeeded={rewardRedemption.selectedRewardQcNeeded}
        swipeStyle={rewardSwipeStyle}
        userQc={userQc}
      />

      {rewardOrganizerEvent && rewardOrganizerEventProfile ? (
        <EventDetailModal
          checkedIn={checkedInEventIds.includes(rewardOrganizerEvent.id)}
          cityName={getCultureCityData(rewardOrganizerEventProfile.cityId).name}
          event={rewardOrganizerEvent}
          onCheckIn={
            onEventCheckIn ??
            (async () => ({ error: 'Check-in is not available right now.', success: false }))
          }
          onClose={() => {
            setRewardOrganizerEvent(null);
            setRewardOrganizerProfile(rewardOrganizerEventProfile);
            setRewardOrganizerEventProfile(null);
          }}
          onToggleStatus={
            onEventStatusChange ?? (async () => ({ error: 'RSVP is not available right now.' }))
          }
          organizerEvents={rewardOrganizerEvents}
          organizerProfile={rewardOrganizerEventProfile}
          status={rewardOrganizerEventRsvp}
          venue={null}
        />
      ) : null}
    </View>
  );
}

function organizerProfileFromReward(
  reward: RewardPartner,
  fallbackCityId: CityId,
): OrganizerProfile | null {
  if (!reward.organizerId) return null;

  return {
    avatarUrl: reward.organizerAvatarUrl ?? null,
    bio: reward.organizerBio?.trim() || 'Verified CultureQuest organiser.',
    cityId: reward.organizerCityId ?? fallbackCityId,
    id: reward.organizerId,
    locationAddress: reward.organizerLocationAddress ?? null,
    locationCoordinates: reward.organizerLocationCoordinates ?? null,
    locationName: reward.organizerLocationName ?? null,
    name: reward.organizerName?.trim() || 'Verified CultureQuest partner',
  };
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
