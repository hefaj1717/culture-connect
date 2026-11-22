import { StatusBar } from 'expo-status-bar';
import { Compass, Home, Route, User, WifiOff, type LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthScreen } from '@/components/auth-screen';
import { ErrorState } from '@/components/async-state';
import ExploreScreen, { EventDetailModal, type EventCheckInResult } from '@/app/explore';
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
import { organizerProfileFromEvent } from '@/lib/organizer-profiles';
import { completeQuest, fetchCompletedQuestIds } from '@/lib/quest-completions';
import { confirmOrganizerEventAttendance, fetchUserXp } from '@/lib/profile-xp';
import {
  fetchUniversityLeaderboard,
  type UniversityLeaderboardRow,
} from '@/lib/university-leaderboard';
import { useAuth } from '@/providers/auth-provider';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useNetworkStatus } from '@/providers/network-provider';
import { Text } from '@/components/ui/text';

const ACTIVE = Colors.light.primary;
const INACTIVE = Colors.light.iconInactive;
const TABS: { icon: LucideIcon; label: string }[] = [
  { icon: Home, label: 'Home' },
  { icon: Compass, label: 'Discover' },
  { icon: Route, label: 'Quests' },
  { icon: User, label: 'Profile' },
];
const TAB_COUNT = TABS.length;

export default function AppTabs() {
  const { loading, session } = useAuth();

  if (loading) {
    // The native CultureQuest splash remains visible until authentication has
    // hydrated in the root layout, so rendering another loader would flash.
    return null;
  }

  if (!session) {
    return (
      <View className="flex-1 bg-canvas">
        <StatusBar style="light" />
        <AuthScreen />
      </View>
    );
  }

  return <AuthenticatedTabs />;
}

function AuthenticatedTabs() {
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
  const pagerRef = useRef<PagerView>(null);
  const [homeMapInteractive, setHomeMapInteractive] = useState(false);
  // Events opened from Home (cards, map, notifications) are shown in place,
  // without jumping to the Discover tab first.
  const [overlayEventId, setOverlayEventId] = useState<string | null>(null);
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

  const overlayEvent = useMemo(
    () =>
      overlayEventId ? (approvedEvents.find((event) => event.id === overlayEventId) ?? null) : null,
    [approvedEvents, overlayEventId],
  );
  const overlayOrganizerProfile = useMemo(
    () => (overlayEvent ? organizerProfileFromEvent(overlayEvent) : null),
    [overlayEvent],
  );
  const overlayStatus = overlayEventId ? eventStatuses[overlayEventId] : undefined;

  useEffect(() => {
    setOverlayEventId(null);
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
    if (index === activeIndex) return;
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  }

  function handlePageSelected(index: number) {
    setActiveIndex(index);
    // Leaving Home always re-locks the map so swiping back works again.
    if (index !== 0) setHomeMapInteractive(false);
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
      return {
        duplicate: true,
        success: true,
        totalXp: userXp,
        totalQc: userQc,
        xpEarned: 0,
        qcEarned: 0,
      };
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

  return (
    <View className="flex-1 bg-canvas" testID="app.authenticated">
      <StatusBar style={activeIndex === 0 ? 'light' : 'dark'} />
      {userStateError && (
        <ErrorState
          body="Showing saved account information where available."
          compact
          icon={WifiOff}
          onAction={
            userStateLoading ? undefined : () => setUserStateReloadNonce((current) => current + 1)
          }
          style={{ left: 16, position: 'absolute', right: 16, top: insets.top + 8, zIndex: 20 }}
          title="Some account data could not refresh"
        />
      )}
      {/* All tabs stay mounted (and laid out) so their scroll position, state and the
          native map survive tab switches. Swiping horizontally changes tabs; it is paused
          while the Home map is unlocked so map panning does not fight the pager. */}
      <PagerView
        ref={pagerRef}
        initialPage={0}
        offscreenPageLimit={TAB_COUNT - 1}
        onPageSelected={(event) => handlePageSelected(event.nativeEvent.position)}
        overdrag={false}
        scrollEnabled={!homeMapInteractive}
        style={{ flex: 1 }}
      >
        <View collapsable={false} key="tab-0" style={styles.page}>
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
            isActive={activeIndex === 0}
            mapInteractive={homeMapInteractive}
            onMapInteractiveChange={setHomeMapInteractive}
            onOpenEvent={setOverlayEventId}
            onOpenProfile={() => goToTab(3)}
          />
        </View>
        <View collapsable={false} key="tab-1" style={styles.page}>
          <ExploreScreen
            checkedInEventIds={checkedInEventIds}
            cityData={cityData}
            events={publicEvents}
            eventsError={approvedEventsError}
            eventsLoading={approvedEventsLoading}
            eventsRefreshKey={organizerEventsVersion}
            eventStatuses={eventStatuses}
            onEventCheckIn={awardEventCheckInXp}
            onEventStatusChange={updateEventStatus}
          />
        </View>
        <View collapsable={false} key="tab-2" style={styles.page}>
          <QuestsScreen
            cityData={cityData}
            completedQuestIds={completedQuestIds}
            onQuestCompleted={awardQuestCompletionXp}
            questsRefreshKey={questsRefreshKey}
          />
        </View>
        <View collapsable={false} key="tab-3" style={styles.page}>
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
      </PagerView>

      <EventDetailModal
        checkedIn={!!overlayEvent && checkedInEventIds.includes(overlayEvent.id)}
        cityName={cityData.name}
        event={overlayEvent}
        onCheckIn={awardEventCheckInXp}
        onClose={() => setOverlayEventId(null)}
        onToggleStatus={(eventId, status) =>
          updateEventStatus(eventId, eventStatusesRef.current[eventId] === status ? null : status)
        }
        organizerEvents={publicEvents}
        organizerProfile={overlayOrganizerProfile}
        status={
          overlayStatus === 'interested' || overlayStatus === 'going' ? overlayStatus : undefined
        }
      />

      {isOffline && (
        <View className="flex-row items-center justify-center gap-2 border-t border-accent/15 bg-ink px-4 py-2">
          <WifiOff size={15} color={Colors.light.accent} strokeWidth={2.4} />
          <Text
            className="text-center text-caption font-inter-semibold text-white"
            numberOfLines={2}
          >
            {"You're offline. Some updates will resume when your connection returns."}
          </Text>
        </View>
      )}

      <View
        className="flex-row items-start justify-around border-t border-line bg-canvas"
        style={{ paddingBottom: Math.max(10, insets.bottom), paddingTop: 8 }}
      >
        {TABS.map((tab, index) => (
          <TabButton
            active={activeIndex === index}
            icon={tab.icon}
            key={tab.label}
            label={tab.label}
            labelSize={layout.tabLabelSize}
            minWidth={layout.tabMinWidth}
            position={index + 1}
            onPress={() => goToTab(index)}
          />
        ))}
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
  icon: Icon,
  label,
  labelSize,
  minWidth,
  onPress,
  position,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  labelSize: number;
  minWidth: number;
  onPress: () => void;
  position: number;
}) {
  const color = active ? ACTIVE : INACTIVE;

  return (
    <Pressable
      accessibilityHint={`Switches to the ${label} tab`}
      accessibilityLabel={`${label}, tab ${position} of ${TAB_COUNT}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      testID={`tab.${label.toLowerCase()}`}
      onPress={onPress}
      className="items-center gap-1"
      hitSlop={6}
      style={{ minWidth }}
    >
      <View
        className={`h-8 w-14 items-center justify-center rounded-full ${active ? 'bg-primary/10' : ''}`}
      >
        <Icon size={22} color={color} strokeWidth={active ? 2.3 : 2} />
      </View>
      <Text
        style={{
          color,
          fontFamily: active ? FontTokens.ui : FontTokens.caption,
          fontSize: labelSize,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
});
