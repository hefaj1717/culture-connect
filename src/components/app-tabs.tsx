import { StatusBar } from 'expo-status-bar';
import { Compass, Home, Route, User } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AuthScreen } from '@/components/auth-screen';
import ExploreScreen from '@/app/explore';
import HomeScreen from '@/app/index';
import ProfileScreen from '@/app/profile';
import QuestsScreen from '@/app/quests';
import { Colors, FontTokens } from '@/constants/theme';
import { getCultureCityData, type CultureEvent } from '@/data/culture';
import {
  buildUserEventHistory,
  fetchUserEventResponses,
  removeUserEventResponse,
  setUserEventResponse,
  type UserEventStatus,
} from '@/lib/event-history';
import { fetchOrganizerEvents } from '@/lib/organizer-events';
import { useAuth } from '@/providers/auth-provider';

const ACTIVE = Colors.light.primary;
const INACTIVE = '#7D8594';
const TAB_COUNT = 4;

export default function AppTabs() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <StatusBar backgroundColor="transparent" style="light" />
        <ActivityIndicator accessibilityLabel="Loading CultureQuest" color="white" />
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar backgroundColor="transparent" style="light" />
        <AuthScreen />
      </View>
    );
  }

  return <AuthenticatedTabs />;
}

function AuthenticatedTabs() {
  const { width } = useWindowDimensions();
  const { organizerApplicationStatus, user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [organizerEventsVersion, setOrganizerEventsVersion] = useState(0);
  const [rewardsRefreshKey, setRewardsRefreshKey] = useState(0);
  const [approvedEvents, setApprovedEvents] = useState<CultureEvent[]>([]);
  const [userXp, setUserXp] = useState(0);
  const [checkedInEventIds, setCheckedInEventIds] = useState<string[]>([]);
  const [eventStatuses, setEventStatuses] = useState<Record<string, UserEventStatus>>({});
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  const checkedInEventIdsRef = useRef(new Set<string>());
  const completedQuestIdsRef = useRef(new Set<string>());
  const [eventOpenRequest, setEventOpenRequest] = useState<{
    eventId: string;
    nonce: number;
  } | null>(null);
  const [eventOpenOverride, setEventOpenOverride] = useState<CultureEvent | null>(null);
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
  const userEventHistory = useMemo(
    () => buildUserEventHistory(approvedEvents, eventStatuses, checkedInEventIds),
    [approvedEvents, checkedInEventIds, eventStatuses],
  );

  useEffect(() => {
    let active = true;

    async function loadApprovedEvents() {
      const result = await fetchOrganizerEvents(cityData.id);
      if (!active) return;

      setApprovedEvents(result.events);
    }

    loadApprovedEvents();

    return () => {
      active = false;
    };
  }, [cityData.id, organizerEventsVersion]);

  useEffect(() => {
    const userId = user?.id;

    if (!userId) {
      setEventStatuses({});
      return;
    }

    const userIdForLoad = userId;
    let active = true;

    async function loadEventResponses() {
      const result = await fetchUserEventResponses(userIdForLoad);
      if (!active) return;

      if (!result.error) {
        setEventStatuses(result.responses);
      }
    }

    loadEventResponses();

    return () => {
      active = false;
    };
  }, [user?.id]);

  function goToTab(index: number) {
    setActiveIndex(index);
    translateX.value = withTiming(-index * width, { duration: 220 });
  }

  function openDiscoverEvent(eventId: string, eventOverride?: CultureEvent) {
    setEventOpenOverride(eventOverride ?? null);
    setEventOpenRequest({ eventId, nonce: Date.now() });
    goToTab(1);
  }

  function awardEventCheckInXp(event: CultureEvent) {
    if (checkedInEventIdsRef.current.has(event.id)) {
      return false;
    }

    checkedInEventIdsRef.current.add(event.id);
    setCheckedInEventIds([...checkedInEventIdsRef.current]);
    setEventStatuses((current) => ({ ...current, [event.id]: 'attended' }));
    if (user?.id) {
      void setUserEventResponse(user.id, event.id, 'attended');
    }
    setUserXp((currentXp) => currentXp + event.xpBonus);
    return true;
  }

  function updateEventStatus(eventId: string, status: UserEventStatus | null) {
    setEventStatuses((current) => {
      const nextStatuses = { ...current };

      if (!status) {
        delete nextStatuses[eventId];
      } else {
        nextStatuses[eventId] = status;
      }

      return nextStatuses;
    });

    if (!user?.id) return;

    if (!status) {
      void removeUserEventResponse(user.id, eventId);
      return;
    }

    void setUserEventResponse(user.id, eventId, status);
  }

  function awardQuestCompletionXp(questId: string, totalXp: number) {
    if (completedQuestIdsRef.current.has(questId)) {
      return false;
    }

    completedQuestIdsRef.current.add(questId);
    setCompletedQuestIds([...completedQuestIdsRef.current]);
    setUserXp((currentXp) => currentXp + totalXp);
    return true;
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
      <StatusBar backgroundColor="transparent" style={activeIndex === 0 ? 'light' : 'dark'} />
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
              events={approvedEvents}
              organizerApplicationStatus={organizerApplicationStatus}
              onOpenDiscover={() => goToTab(1)}
              onOpenEvent={openDiscoverEvent}
              onOpenProfile={() => goToTab(3)}
            />
          </View>
          <View style={{ width }}>
            <ExploreScreen
              checkedInEventIds={checkedInEventIds}
              cityData={cityData}
              events={approvedEvents}
              eventOpenOverride={eventOpenOverride}
              eventsRefreshKey={organizerEventsVersion}
              eventStatuses={eventStatuses}
              onEventCheckIn={awardEventCheckInXp}
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
            />
          </View>
          <View style={{ width }}>
            <ProfileScreen
              eventsRefreshKey={organizerEventsVersion}
              rewardsRefreshKey={rewardsRefreshKey}
              userEventHistory={userEventHistory}
              userXp={userXp}
              onOpenEvent={(event) => openDiscoverEvent(event.id, event)}
              onEventCreated={() => {
                setOrganizerEventsVersion((version) => version + 1);
              }}
              onRewardCreated={() => {
                setRewardsRefreshKey((version) => version + 1);
              }}
            />
          </View>
        </Animated.View>
      </GestureDetector>

      <View
        style={{
          height: 84,
          paddingTop: 8,
          paddingBottom: 18,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        <TabButton
          active={activeIndex === 0}
          icon={<Home size={24} color={activeIndex === 0 ? ACTIVE : INACTIVE} />}
          label="Home"
          position={1}
          onPress={() => goToTab(0)}
        />
        <TabButton
          active={activeIndex === 1}
          icon={
            <Compass size={23} color={activeIndex === 1 ? ACTIVE : INACTIVE} strokeWidth={2.3} />
          }
          label="Discover"
          position={2}
          onPress={() => goToTab(1)}
        />
        <TabButton
          active={activeIndex === 2}
          icon={<Route size={23} color={activeIndex === 2 ? ACTIVE : INACTIVE} strokeWidth={2.3} />}
          label="Quests"
          position={3}
          onPress={() => goToTab(2)}
        />
        <TabButton
          active={activeIndex === 3}
          icon={<User size={24} color={activeIndex === 3 ? ACTIVE : INACTIVE} />}
          label="Profile"
          position={4}
          onPress={() => goToTab(3)}
        />
      </View>
    </View>
  );
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
  onPress,
  position,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
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
      className="min-w-[72px] items-center justify-center gap-1"
    >
      {icon}
      <Text
        style={{
          color: active ? ACTIVE : INACTIVE,
          fontFamily: FontTokens.ui,
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
