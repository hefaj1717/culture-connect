import { StatusBar } from 'expo-status-bar';
import { Compass, Home, Route, User, WifiOff } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthScreen } from '@/components/auth-screen';
import { ErrorState } from '@/components/async-state';
import ExploreScreen, { type EventCheckInResult } from '@/app/explore';
import HomeScreen from '@/app/index';
import ProfileScreen from '@/app/profile';
import QuestsScreen from '@/app/quests';
import { Colors, FontTokens } from '@/constants/theme';
import { getCultureCityData, type CultureEvent } from '@/data/culture';
import {
  buildUserEventHistory,
  fetchUserEventResponses,
  getOrganizerEventDatabaseId,
  removeUserEventResponse,
  setUserEventResponse,
  type UserEventStatus,
} from '@/lib/event-history';
import { updateEventEngagementCounts } from '@/lib/event-engagement';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { fetchOrganizerEvents } from '@/lib/organizer-events';
import { completeQuest, fetchCompletedQuestIds } from '@/lib/quest-completions';
import { confirmOrganizerEventAttendance, fetchUserXp } from '@/lib/profile-xp';
import {
  fetchUniversityLeaderboard,
  type UniversityLeaderboardRow,
} from '@/lib/university-leaderboard';
import { useAuth } from '@/providers/auth-provider';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useNetworkStatus } from '@/providers/network-provider';

const ACTIVE = Colors.light.primary;
const INACTIVE = Colors.light.iconInactive;
const TAB_COUNT = 4;

export default function AppTabs() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <StatusBar style="dark" />
        <View className="items-center gap-4" accessibilityLabel="Loading CultureQuest">
          <Text
            style={{ fontFamily: FontTokens.heading, fontSize: 36, letterSpacing: -2 }}
            className="text-ink"
          >
            Culture<Text className="text-accent">Quest</Text>
          </Text>
          <ActivityIndicator color={Colors.light.accent} size="small" />
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar style="light" />
        <AuthScreen />
      </View>
    );
  }

  return <AuthenticatedTabs />;
}

function AuthenticatedTabs() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const { isOffline } = useNetworkStatus();
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [organizerEventsVersion, setOrganizerEventsVersion] = useState(0);
  const [questsRefreshKey, setQuestsRefreshKey] = useState(0);
  const [rewardsRefreshKey, setRewardsRefreshKey] = useState(0);
  const [approvedEvents, setApprovedEvents] = useState<CultureEvent[]>([]);
  const [approvedEventsError, setApprovedEventsError] = useState<string | null>(null);
  const [approvedEventsLoading, setApprovedEventsLoading] = useState(true);
  const [userXp, setUserXp] = useState(0);
  const [userQc, setUserQc] = useState(0);
  const [universityLeaderboard, setUniversityLeaderboard] = useState<UniversityLeaderboardRow[]>(
    [],
  );
  const [universityLeaderboardError, setUniversityLeaderboardError] = useState<string | null>(null);
  const [universityLeaderboardLoading, setUniversityLeaderboardLoading] = useState(true);
  const [checkedInEventIds, setCheckedInEventIds] = useState<string[]>([]);
  const [eventStatuses, setEventStatuses] = useState<Record<string, UserEventStatus>>({});
  const eventStatusesRef = useRef<Record<string, UserEventStatus>>({});
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  const [userStateError, setUserStateError] = useState<string | null>(null);
  const [userStateLoading, setUserStateLoading] = useState(false);
  const [userStateReloadNonce, setUserStateReloadNonce] = useState(0);
  const checkedInEventIdsRef = useRef(new Set<string>());
  const completedQuestIdsRef = useRef(new Set<string>());
  const [eventOpenRequest, setEventOpenRequest] = useState<{
    eventId: string;
    nonce: number;
    returnTabIndex: number;
  } | null>(null);
  const translateX = useSharedValue(-activeIndex * width);
  const startX = useSharedValue(0);
  const metadataName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name]
    .filter(Boolean)
    .join(' ');
  const avatarInitials = getUserInitials(
    user?.user_metadata?.full_name || metadataName || user?.email,
  );
  const avatarUrl = user?.user_metadata?.avatar_url ?? null;
  const cityData = getCultureCityData(user?.user_metadata?.city_id);
  const publicEvents = useMemo(
    () => approvedEvents.filter((event) => !isEventEnded(event)),
    [approvedEvents],
  );
  const userEventHistory = useMemo(
    () => buildUserEventHistory(approvedEvents, eventStatuses, checkedInEventIds),
    [approvedEvents, checkedInEventIds, eventStatuses],
  );

  useEffect(() => {
    setEventOpenRequest(null);
  }, [cityData.id]);

  useEffect(() => {
    let active = true;

    async function loadApprovedEvents() {
      setApprovedEventsLoading(true);
      const result = await fetchOrganizerEvents(cityData.id);
      if (!active) return;

      setApprovedEvents(result.events);
      setApprovedEventsError(result.error);
      setApprovedEventsLoading(false);
    }

    loadApprovedEvents();

    return () => {
      active = false;
    };
  }, [cityData.id, organizerEventsVersion]);

  useEffect(() => {
    let active = true;

    async function loadUniversityLeaderboard() {
      setUniversityLeaderboardLoading(true);
      const result = await fetchUniversityLeaderboard(cityData.id);
      if (!active) return;

      setUniversityLeaderboard(result.rows);
      setUniversityLeaderboardError(result.error);
      setUniversityLeaderboardLoading(false);
    }

    loadUniversityLeaderboard();

    return () => {
      active = false;
    };
  }, [cityData.id, userXp]);

  useEffect(() => {
    const userId = user?.id;

    if (!userId) {
      eventStatusesRef.current = {};
      setEventStatuses({});
      setUserXp(0);
      setUserQc(0);
      setUserStateError(null);
      setUserStateLoading(false);
      return;
    }

    const userIdForLoad = userId;
    let active = true;

    async function loadUserState() {
      setUserStateLoading(true);
      const [responsesResult, xpResult, questsResult] = await Promise.all([
        fetchUserEventResponses(userIdForLoad),
        fetchUserXp(userIdForLoad),
        fetchCompletedQuestIds(),
      ]);
      if (!active) return;

      const errors = [responsesResult.error, xpResult.error, questsResult.error].filter(
        (error): error is string => !!error,
      );
      setUserStateError(errors[0] ?? null);
      setUserStateLoading(false);

      if (!responsesResult.error) {
        eventStatusesRef.current = responsesResult.responses;
        setEventStatuses(responsesResult.responses);
        const attendedEventIds = Object.entries(responsesResult.responses)
          .filter(([, status]) => status === 'attended')
          .map(([eventId]) => eventId);
        checkedInEventIdsRef.current = new Set(attendedEventIds);
        setCheckedInEventIds(attendedEventIds);
      }

      if (!xpResult.error) {
        setUserXp(xpResult.totalXp);
        setUserQc(xpResult.totalQc);
      }

      if (!questsResult.error) {
        completedQuestIdsRef.current = new Set(questsResult.completedQuestIds);
        setCompletedQuestIds(questsResult.completedQuestIds);
      }
    }

    loadUserState();

    return () => {
      active = false;
    };
  }, [user?.id, userStateReloadNonce]);

  function goToTab(index: number) {
    setActiveIndex(index);
    translateX.value = withTiming(-index * width, { duration: 220 });
  }

  function openDiscoverEvent(eventId: string) {
    setEventOpenRequest({ eventId, nonce: Date.now(), returnTabIndex: activeIndex });
    goToTab(1);
  }

  function closeExternalDiscoverEvent() {
    const returnTabIndex = eventOpenRequest?.returnTabIndex;
    setEventOpenRequest(null);
    if (returnTabIndex !== undefined && returnTabIndex !== 1) {
      goToTab(returnTabIndex);
    }
  }

  async function awardEventCheckInXp(
    event: CultureEvent,
    checkInCode: string,
    location: { latitude: number; longitude: number },
  ): Promise<EventCheckInResult> {
    if (isOffline) {
      Alert.alert('Offline', OFFLINE_ERROR_MESSAGE);
      return { error: OFFLINE_ERROR_MESSAGE, success: false };
    }

    if (checkedInEventIdsRef.current.has(event.id)) {
      return { duplicate: true, success: true, totalXp: userXp, totalQc: userQc, xpEarned: 0, qcEarned: 0 };
    }

    const databaseEventId = getOrganizerEventDatabaseId(event.id);
    if (!databaseEventId) {
      return { error: 'This event is not available for check-in yet.', success: false };
    }

    const result = await confirmOrganizerEventAttendance({
      checkInCode,
      eventId: databaseEventId,
      userLatitude: location.latitude,
      userLongitude: location.longitude,
    });

    if (result.totalXp !== null) {
      setUserXp(result.totalXp);
    }
    if (result.totalQc !== null) setUserQc(result.totalQc);

    if (result.error && !result.duplicate) {
      return {
        error: result.error,
        success: false,
        totalXp: result.totalXp,
        totalQc: result.totalQc,
        xpEarned: result.xpEarned ?? 0,
        qcEarned: result.qcEarned ?? 0,
      };
    }

    // QC is awarded by a database trigger after the secured XP transaction.
    // Reload the balance because legacy check-in RPC responses only include XP.
    if (user?.id && result.totalQc === null) {
      const balance = await fetchUserXp(user.id);
      if (!balance.error) {
        setUserXp(balance.totalXp);
        setUserQc(balance.totalQc);
      }
    }

    const previousStatus = eventStatusesRef.current[event.id] ?? null;
    checkedInEventIdsRef.current.add(event.id);
    setCheckedInEventIds([...checkedInEventIdsRef.current]);
    setApprovedEvents((current) =>
      updateEventEngagementCounts(current, event.id, previousStatus, 'attended'),
    );
    eventStatusesRef.current = { ...eventStatusesRef.current, [event.id]: 'attended' };
    setEventStatuses(eventStatusesRef.current);
    return {
      duplicate: result.duplicate,
      success: true,
      totalXp: result.totalXp,
      totalQc: result.totalQc,
      xpEarned: result.xpEarned ?? 0,
      qcEarned: result.qcEarned ?? 0,
    };
  }

  async function updateEventStatus(eventId: string, status: UserEventStatus | null) {
    if (isOffline) {
      return { error: OFFLINE_ERROR_MESSAGE };
    }

    if (!user?.id) return { error: 'Log in again before changing your RSVP.' };

    const previousStatus = eventStatusesRef.current[eventId] ?? null;
    applyLocalEventStatus(eventId, previousStatus, status);

    const result = status
      ? await setUserEventResponse(user.id, eventId, status)
      : await removeUserEventResponse(user.id, eventId);

    if (result.error) {
      // Restore the last confirmed state only if another RSVP action has not
      // already replaced this optimistic update.
      if ((eventStatusesRef.current[eventId] ?? null) === status) {
        applyLocalEventStatus(eventId, status, previousStatus);
      }
      return result;
    }

    return { error: null };
  }

  function applyLocalEventStatus(
    eventId: string,
    previousStatus: UserEventStatus | null,
    nextStatus: UserEventStatus | null,
  ) {
    setApprovedEvents((current) =>
      updateEventEngagementCounts(current, eventId, previousStatus, nextStatus),
    );
    const nextStatuses = { ...eventStatusesRef.current };

    if (!nextStatus) {
      delete nextStatuses[eventId];
    } else {
      nextStatuses[eventId] = nextStatus;
    }

    eventStatusesRef.current = nextStatuses;
    setEventStatuses(nextStatuses);
  }

  async function awardQuestCompletionXp(questId: string, completionCode: string) {
    if (isOffline) {
      Alert.alert('Offline', OFFLINE_ERROR_MESSAGE);
      return { error: OFFLINE_ERROR_MESSAGE, success: false };
    }

    if (completedQuestIdsRef.current.has(questId)) {
      return { error: 'This quest is already completed.', success: false };
    }

    const result = await completeQuest(questId, completionCode);
    if (result.error) {
      return { error: result.error, success: false };
    }

    completedQuestIdsRef.current.add(questId);
    setCompletedQuestIds([...completedQuestIdsRef.current]);
    if (result.totalXp !== null) {
      setUserXp(result.totalXp);
    }
    if (typeof result.totalQc === 'number') setUserQc(result.totalQc);
    if (user?.id && typeof result.totalQc !== 'number') {
      const balance = await fetchUserXp(user.id);
      if (!balance.error) {
        setUserXp(balance.totalXp);
        setUserQc(balance.totalQc);
      }
    }

    return { success: true };
  }

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-35, 35])
        .onBegin(() => {
          startX.value = translateX.value;
        })
        .onUpdate((event) => {
          const minTranslate = -(TAB_COUNT - 1) * width;
          const maxTranslate = 0;
          const nextTranslate = startX.value + event.translationX;
          translateX.value = Math.max(minTranslate, Math.min(maxTranslate, nextTranslate));
        })
        .onEnd((event) => {
          const projected = translateX.value + event.velocityX * 0.12;
          const nextIndex = Math.min(
            TAB_COUNT - 1,
            Math.max(0, Math.round(Math.abs(projected) / width)),
          );

          translateX.value = withTiming(-nextIndex * width, { duration: 180 });
          runOnJS(setActiveIndex)(nextIndex);
        }),
    [startX, translateX, width],
  );

  const pagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View className="flex-1 bg-white">
      <StatusBar style={activeIndex === 0 ? 'light' : 'dark'} />
      {userStateError && (
        <ErrorState
          body="Showing saved account information where available."
          compact
          icon={WifiOff}
          onAction={userStateLoading ? undefined : () => setUserStateReloadNonce((current) => current + 1)}
          style={{ left: 16, position: 'absolute', right: 16, top: insets.top + 8, zIndex: 20 }}
          title="Some account data could not refresh"
        />
      )}
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            {
              flex: 1,
              width: width * TAB_COUNT,
              flexDirection: 'row',
            },
            pagerStyle,
          ]}
        >
          <View style={{ width }}>
            <HomeScreen
              avatarInitials={avatarInitials}
              avatarUrl={avatarUrl}
              cityData={cityData}
              events={publicEvents}
              eventsError={approvedEventsError}
              eventsLoading={approvedEventsLoading}
              eventStatuses={eventStatuses}
              leaderboard={universityLeaderboard}
              leaderboardError={universityLeaderboardError}
              leaderboardLoading={universityLeaderboardLoading}
              onOpenDiscover={() => goToTab(1)}
              onOpenEvent={openDiscoverEvent}
              onOpenProfile={() => goToTab(3)}
            />
          </View>
          <View style={{ width }}>
            <ExploreScreen
              checkedInEventIds={checkedInEventIds}
              cityData={cityData}
              events={publicEvents}
              eventsError={approvedEventsError}
              eventsLoading={approvedEventsLoading}
              eventsRefreshKey={organizerEventsVersion}
              eventStatuses={eventStatuses}
              onEventCheckIn={awardEventCheckInXp}
              onExternalEventClose={closeExternalDiscoverEvent}
              onEventStatusChange={updateEventStatus}
              openEventId={eventOpenRequest?.eventId}
              openEventNonce={eventOpenRequest?.nonce}
            />
          </View>
          <View style={{ width }}>
            <QuestsScreen
              cityData={cityData}
              completedQuestIds={completedQuestIds}
              onQuestCompleted={awardQuestCompletionXp}
              questsRefreshKey={questsRefreshKey}
            />
          </View>
          <View style={{ width }}>
            <ProfileScreen
              checkedInEventIds={checkedInEventIds}
              eventsRefreshKey={organizerEventsVersion}
              eventStatuses={eventStatuses}
              onEventCheckIn={awardEventCheckInXp}
              onEventStatusChange={updateEventStatus}
              rewardsRefreshKey={rewardsRefreshKey}
              userEventHistory={userEventHistory}
              userXp={userXp}
              userQc={userQc}
              onEventCreated={() => {
                setOrganizerEventsVersion((version) => version + 1);
              }}
              onRewardCreated={() => {
                setRewardsRefreshKey((version) => version + 1);
              }}
              onQuestCreated={() => {
                setQuestsRefreshKey((version) => version + 1);
              }}
              onUserXpChange={setUserXp}
              onUserQcChange={setUserQc}
            />
          </View>
        </Animated.View>
      </GestureDetector>

      {isOffline && (
        <View className="flex-row items-center justify-center gap-2 border-t border-accent/15 bg-ink px-4 py-2">
          <WifiOff size={15} color={Colors.light.accent} strokeWidth={2.4} />
          <Text className="text-center text-[12px] font-semibold text-white" numberOfLines={2}>
            {"You're offline. Some updates will resume when your connection returns."}
          </Text>
        </View>
      )}

      <View
        style={{
          height: layout.tabHeight + Math.max(0, insets.bottom - 18),
          paddingTop: 8,
          paddingBottom: Math.max(14, insets.bottom),
          borderTopWidth: 1,
          borderTopColor: Colors.light.borderSubtle,
          backgroundColor: Colors.light.onPrimary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        <TabButton
          active={activeIndex === 0}
          icon={
            <Home
              size={24}
              color={activeIndex === 0 ? ACTIVE : INACTIVE}
              fill="none"
              strokeWidth={activeIndex === 0 ? 2.6 : 2.2}
            />
          }
          label="Home"
          labelSize={layout.tabLabelSize}
          minWidth={layout.tabMinWidth}
          position={1}
          onPress={() => goToTab(0)}
        />
        <TabButton
          active={activeIndex === 1}
          icon={
            <Compass
              size={23}
              color={activeIndex === 1 ? ACTIVE : INACTIVE}
              fill="none"
              strokeWidth={activeIndex === 1 ? 2.6 : 2.3}
            />
          }
          label="Discover"
          labelSize={layout.tabLabelSize}
          minWidth={layout.tabMinWidth}
          position={2}
          onPress={() => goToTab(1)}
        />
        <TabButton
          active={activeIndex === 2}
          icon={
            <Route
              size={23}
              color={activeIndex === 2 ? ACTIVE : INACTIVE}
              fill="none"
              strokeWidth={activeIndex === 2 ? 2.6 : 2.3}
            />
          }
          label="Quests"
          labelSize={layout.tabLabelSize}
          minWidth={layout.tabMinWidth}
          position={3}
          onPress={() => goToTab(2)}
        />
        <TabButton
          active={activeIndex === 3}
          icon={
            <User
              size={24}
              color={activeIndex === 3 ? ACTIVE : INACTIVE}
              fill="none"
              strokeWidth={activeIndex === 3 ? 2.6 : 2.2}
            />
          }
          label="Profile"
          labelSize={layout.tabLabelSize}
          minWidth={layout.tabMinWidth}
          position={4}
          onPress={() => goToTab(3)}
        />
      </View>
    </View>
  );
}

function isEventEnded(event: CultureEvent) {
  if (!event.endsAt) return false;

  const endsAt = Date.parse(event.endsAt);
  if (Number.isNaN(endsAt)) return false;

  return endsAt <= Date.now();
}

function getUserInitials(value?: string | null) {
  if (!value) return null;

  const name = value.includes('@') ? value.split('@')[0] : value;
  const parts = name
    .replace(/[^a-zA-Z0-9_\s.-]/g, '')
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function TabButton({
  active,
  icon,
  label,
  labelSize,
  minWidth,
  onPress,
  position,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  labelSize: number;
  minWidth: number;
  onPress: () => void;
  position: number;
}) {
  return (
    <Pressable
      accessibilityHint={`Switches to the ${label} tab`}
      accessibilityLabel={`${label}, tab ${position} of ${TAB_COUNT}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="items-center justify-center gap-1"
      style={{ minWidth }}
    >
      {icon}
      <Text
        style={{
          color: active ? ACTIVE : INACTIVE,
          fontFamily: FontTokens.ui,
          fontSize: labelSize,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
