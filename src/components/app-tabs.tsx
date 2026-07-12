import { StatusBar } from 'expo-status-bar';
import { Compass, Home, User } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import ExploreScreen from '@/app/explore';
import HomeScreen from '@/app/index';
import ProfileScreen from '@/app/profile';
import { Colors, FontTokens } from '@/constants/theme';
import { getCultureCityData } from '@/data/culture';
import { useAuth } from '@/providers/auth-provider';

const ACTIVE = Colors.light.primary;
const INACTIVE = '#7D8594';
const TAB_COUNT = 3;

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const { organizerApplicationStatus, user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [organizerEventsVersion, setOrganizerEventsVersion] = useState(0);
  const [eventOpenRequest, setEventOpenRequest] = useState<{
    eventId: string;
    nonce: number;
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

  function goToTab(index: number) {
    setActiveIndex(index);
    translateX.value = withTiming(-index * width, { duration: 220 });
  }

  function openDiscoverEvent(eventId: string) {
    setEventOpenRequest({ eventId, nonce: Date.now() });
    goToTab(1);
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
              organizerApplicationStatus={organizerApplicationStatus}
              onOpenDiscover={() => goToTab(1)}
              onOpenEvent={openDiscoverEvent}
              onOpenProfile={() => goToTab(2)}
            />
          </View>
          <View style={{ width }}>
            <ExploreScreen
              cityData={cityData}
              eventsRefreshKey={organizerEventsVersion}
              openEventId={eventOpenRequest?.eventId}
              openEventNonce={eventOpenRequest?.nonce}
            />
          </View>
          <View style={{ width }}>
            <ProfileScreen
              onEventCreated={() => {
                setOrganizerEventsVersion((version) => version + 1);
                goToTab(1);
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
          onPress={() => goToTab(0)}
        />
        <Pressable
          onPress={() => goToTab(1)}
          style={{
            width: 60,
            height: 60,
            transform: [{ translateY: -14 }],
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 22,
            backgroundColor: ACTIVE,
            shadowColor: ACTIVE,
            shadowOpacity: 0.14,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <Compass size={31} color="#FFFFFF" strokeWidth={2.45} />
        </Pressable>
        <TabButton
          active={activeIndex === 2}
          icon={<User size={24} color={activeIndex === 2 ? ACTIVE : INACTIVE} />}
          label="Profile"
          onPress={() => goToTab(2)}
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
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="min-w-[88px] items-center justify-center gap-1">
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
