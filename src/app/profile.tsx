import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  BadgeCheck,
  Beer,
  BookOpen,
  Building2,
  Camera,
  CalendarPlus,
  CheckCircle2,
  CircleAlert,
  Coffee,
  Compass,
  Crown,
  Gift,
  Globe,
  MapPin,
  Search,
  Sparkles,
  TicketCheck,
  Trophy,
  User,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { AuthScreen } from '@/components/auth-screen';
import { BrandImage } from '@/components/brand-image';
import { CitySelector } from '@/components/city-selector';
import { Colors } from '@/constants/theme';
import {
  type CityId,
  type EventCategory,
  type EventLanguage,
  type RewardPartner,
  defaultCityId,
  eventCategoryLabels,
  getCultureCityData,
  languageLabels,
} from '@/data/culture';
import { createOrganizerEvent } from '@/lib/organizer-events';
import { hasGooglePlacesApiKey, type PlaceSuggestion, searchPlaces } from '@/lib/place-search';
import { useAuth } from '@/providers/auth-provider';

const eventCategories: EventCategory[] = [
  'exhibition',
  'performance',
  'screening',
  'workshop',
  'festival',
  'concert',
];
const eventLanguages: EventLanguage[] = ['en', 'nl', 'fr', 'pl', 'multilingual'];
const fixedEventXp = 50;
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const timeHours = Array.from({ length: 24 }, (_, index) => index);
const timeMinutes = [0, 15, 30, 45];
const rewardRedeemWindowMs = 5 * 60 * 1000;
const userXp = 1860;

const xpLevels = [
  { name: 'Newcomer', minXp: 0 },
  { name: 'Explorer', minXp: 200 },
  { name: 'Connector', minXp: 600 },
  { name: 'Influencer', minXp: 1200 },
  { name: 'Tastemaker', minXp: 2000 },
  { name: 'City Legend', minXp: 3200 },
];

type RedeemedRewardState = {
  redeemedAt: number;
  used: boolean;
};

const achievementBadges = [
  {
    id: 'first-quest',
    title: 'First Quest',
    description: 'Attend your first CultureQuest event.',
    progress: '1 / 1',
    unlocked: true,
    icon: TicketCheck,
    color: Colors.light.primary,
  },
  {
    id: 'culture-regular',
    title: 'Culture Regular',
    description: 'Attend 10 events across your city.',
    progress: '4 / 10',
    unlocked: false,
    icon: CalendarPlus,
    color: Colors.light.primary,
  },
  {
    id: 'reward-hunter',
    title: 'Reward Hunter',
    description: 'Redeem 10 rewards from local partners.',
    progress: '2 / 10',
    unlocked: false,
    icon: Gift,
    color: Colors.light.primary,
  },
  {
    id: 'museum-mind',
    title: 'Museum Mind',
    description: 'Check in at 5 museum or gallery events.',
    progress: '3 / 5',
    unlocked: false,
    icon: Building2,
    color: Colors.light.primary,
  },
  {
    id: 'city-explorer',
    title: 'City Explorer',
    description: 'Visit 8 different venues in one city.',
    progress: '5 / 8',
    unlocked: false,
    icon: Compass,
    color: Colors.light.primary,
  },
  {
    id: 'social-spark',
    title: 'Social Spark',
    description: 'Mark Going on 5 events before attending.',
    progress: '5 / 5',
    unlocked: true,
    icon: Sparkles,
    color: Colors.light.primary,
  },
  {
    id: 'international-eye',
    title: 'International Eye',
    description: 'Join 3 multilingual or international events.',
    progress: '1 / 3',
    unlocked: false,
    icon: Globe,
    color: Colors.light.primary,
  },
  {
    id: 'coffee-route',
    title: 'Coffee Route',
    description: 'Redeem rewards at 3 cafe partners.',
    progress: '1 / 3',
    unlocked: false,
    icon: Coffee,
    color: Colors.light.primary,
  },
  {
    id: 'top-week',
    title: 'Top 10 Week',
    description: 'Reach the weekly city leaderboard top 10.',
    progress: 'Best: #14',
    unlocked: false,
    icon: Trophy,
    color: Colors.light.primary,
  },
  {
    id: 'founding-student',
    title: 'Founding Student',
    description: 'Join CultureQuest during the pilot season.',
    progress: 'Unlocked',
    unlocked: true,
    icon: Crown,
    color: Colors.light.primary,
  },
];

type ProfileScreenProps = {
  onEventCreated?: () => void;
};

export default function ProfileScreen({ onEventCreated }: ProfileScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const {
    organizerApplicationStatus,
    refreshOrganizerApplicationStatus,
    session,
    signOut,
    updateProfile,
  } = useAuth();
  const router = useRouter();
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
  const [eventLanguage, setEventLanguage] = useState<EventLanguage>('en');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventImageUri, setEventImageUri] = useState<string | null>(null);
  const [eventIsFree, setEventIsFree] = useState(true);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardPartner | null>(null);
  const [redeemedRewards, setRedeemedRewards] = useState<Record<string, RedeemedRewardState>>({});
  const unlockedBadgeCount = achievementBadges.filter((badge) => badge.unlocked).length;
  const totalBadgeCount = achievementBadges.length;
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
    setEventLanguage(savedCityId === 'lublin' ? 'pl' : 'en');
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

  const selectedRewardState = selectedReward ? redeemedRewards[selectedReward.id] : undefined;
  const selectedRewardIsUsed = !!selectedRewardState?.used;
  const selectedRewardIsActive = !!selectedRewardState && !selectedRewardIsUsed;
  const selectedRewardRemainingMs =
    selectedRewardState && !selectedRewardIsUsed
      ? Math.max(0, rewardRedeemWindowMs - (rewardNow - selectedRewardState.redeemedAt))
      : 0;

  if (!session) {
    return <AuthScreen onCancel={() => router.replace('/')} />;
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
    setEventLanguage(savedCityId === 'lublin' ? 'pl' : 'en');
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

  function closeCreateEventWithAnimation() {
    createEventTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setCreateEventOpen)(false);
      }
    });
  }

  function closeBadgesWithAnimation() {
    badgesTranslateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setBadgesOpen)(false);
      }
    });
  }

  function closeRewardWithAnimation() {
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
      language: eventLanguage,
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
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 112 }}>
        <View
          className="mx-5 mb-5 rounded-[28px] border border-gray-200 bg-white p-4"
          style={{ marginTop: insets.top + 24 }}
        >
          <View className="mb-5 flex-row items-center gap-4">
            <RankAvatar
              initials={avatarInitials}
              progressPercent={levelProgress.progressPercent}
              uri={savedAvatarUrl}
            />

            <View className="min-w-0 flex-1">
              <View className="mb-1 flex-row flex-wrap items-center gap-2">
                <Text
                  className="font-heading text-[29px] font-extrabold leading-[33px] text-ink"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {fullName}
                </Text>
                {organizerApplicationStatus === 'approved' && <OrganizerVerifiedBadge compact />}
              </View>
              <Text className="text-[13px] font-medium text-muted" numberOfLines={1}>
                {levelProgress.currentLevel.name} · {cityData.label}
              </Text>
            </View>
          </View>

          <View className="mb-4 rounded-2xl bg-canvas p-4">
            <View className="mb-3 flex-row items-end justify-between gap-4">
              <View>
                <View className="mb-1 flex-row items-center gap-1.5">
                  <Sparkles size={15} color={Colors.light.primary} strokeWidth={2.4} />
                  <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Total XP
                  </Text>
                </View>
                <Text className="font-ui text-[34px] font-extrabold leading-[38px] text-ink">
                  {userXp.toLocaleString()}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-right text-[12px] font-semibold leading-4 text-muted">
                  {levelProgress.nextLevel
                    ? `${levelProgress.xpToNext.toLocaleString()} XP to ${
                        levelProgress.nextLevel.name
                      }`
                    : 'Top city rank reached'}
                </Text>
                <Text className="mt-1 text-[13px] font-extrabold text-primary">
                  {Math.round(levelProgress.progressPercent)}%
                </Text>
              </View>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-primary/10">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${levelProgress.progressPercent}%` }}
              />
            </View>
          </View>
        </View>

        <View className="mx-5 mb-6">
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => {
                setProfileError(null);
                setFirstName(savedFirstName);
                setLastName(savedLastName);
                setCityId(savedCityId);
                setAvatarUrl(savedAvatarUrl);
                setEditOpen(true);
              }}
              className="h-12 flex-1 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
            >
              <Text className="text-[14px] font-semibold text-white">Edit profile</Text>
            </Pressable>

            <Pressable
              onPress={signOut}
              className="h-12 flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 active:opacity-80"
            >
              <Text className="text-[14px] font-semibold text-muted">Log out</Text>
            </Pressable>
          </View>
        </View>

        <View className="mb-6">
          <View className="mb-3 flex-row items-center justify-between px-5">
            <Text className="font-heading text-[22px] font-extrabold text-ink">
              Digital Passport
            </Text>
            <Pressable onPress={() => setBadgesOpen(true)} className="active:opacity-75">
              <Text className="text-[12px] font-semibold text-primary">View all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {achievementBadges.slice(0, 8).map((badge) => (
              <PassportBadge badge={badge} key={badge.id} />
            ))}
          </ScrollView>
        </View>

        {organizerApplicationStatus !== 'none' && (
          <View className="mb-6 px-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-heading text-[22px] font-extrabold text-ink">
                Organizer Tools
              </Text>
              {organizerApplicationStatus === 'approved' && (
                <View className="flex-row items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1">
                  <BadgeCheck size={14} color={Colors.light.accent} fill={Colors.light.accent} />
                  <Text className="text-[11px] font-bold text-ink">Approved</Text>
                </View>
              )}
            </View>

            {organizerApplicationStatus === 'approved' ? (
              <View className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
                <View className="mb-4 flex-row items-start justify-between gap-4">
                  <View className="min-w-0 flex-1">
                    <Text className="font-heading text-[20px] font-extrabold text-ink">
                      Event maker tools
                    </Text>
                    <Text className="mt-1 text-[13px] leading-5 text-muted">
                      Create and publish events for {cityData.name}.
                    </Text>
                  </View>
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <BadgeCheck size={18} color="white" fill="white" />
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    resetEventForm();
                    setCreateEventOpen(true);
                  }}
                  className="h-11 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
                >
                  <Text className="text-[14px] font-semibold text-white">Create event</Text>
                </Pressable>
              </View>
            ) : (
              <OrganizerStatusCard status={organizerApplicationStatus} />
            )}
          </View>
        )}

        <View className="px-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-heading text-[22px] font-extrabold text-ink">Rewards</Text>
            <Text className="text-[11px] font-semibold text-primary">{cityData.name}</Text>
          </View>

          <View className="gap-3">
            {cityData.rewardPartners.map((reward, index) => (
              <RewardPartnerRow
                key={reward.id}
                reward={reward}
                onPress={() => setSelectedReward(reward)}
                variantIndex={index}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setEditOpen(false)} visible={editOpen}>
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            >
              <View className="mb-6 flex-row justify-end">
                <Pressable
                  onPress={() => setEditOpen(false)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                >
                  <X size={19} color="#756F7B" strokeWidth={2.4} />
                </Pressable>
              </View>

              <View className="mb-7 items-center">
                <Pressable onPress={pickAvatar} className="items-center active:opacity-85">
                  <View className="relative">
                    <Avatar uri={avatarUrl} size={104} iconSize={42} />
                    <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary">
                      <Camera size={17} color="white" strokeWidth={2.4} />
                    </View>
                  </View>
                  <Text className="mt-3 text-[14px] font-semibold text-primary">
                    Change profile photo
                  </Text>
                </Pressable>
              </View>

              <Text className="mb-2 text-[13px] font-semibold text-ink">First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#8B909A"
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="given-name"
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
              />

              <Text className="mb-2 text-[13px] font-semibold text-ink">Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor="#8B909A"
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="family-name"
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
              />

              <Text className="mb-2 text-[13px] font-semibold text-ink">City</Text>
              <View className="mb-5">
                <CitySelector value={cityId} onChange={setCityId} />
              </View>

              <Text className="mb-6 text-[12px] leading-4 text-muted">
                Profile photos are stored on this device for now. Cloud avatar uploads will be added
                when we set up production storage.
              </Text>

              {profileError && (
                <Text className="mb-4 text-[13px] font-medium text-destructive">
                  {profileError}
                </Text>
              )}

              <Pressable
                onPress={saveProfile}
                disabled={savingProfile}
                className="h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-85"
              >
                {savingProfile ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-[15px] font-semibold text-white">Save changes</Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeCreateEventWithAnimation}
        visible={createEventOpen}
      >
        <GestureDetector gesture={createEventSwipeGesture}>
          <Animated.View className="flex-1 bg-white" style={createEventSwipeStyle}>
            <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
              >
                <ScrollView
                  className="flex-1"
                  contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                >
                  <Pressable
                    onPress={closeCreateEventWithAnimation}
                    className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Close create event"
                  >
                    <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                  </Pressable>

                  <Text className="mb-2 text-[13px] font-semibold text-ink">Event title</Text>
                  <TextInput
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    placeholder="e.g. Student Jazz Night"
                    placeholderTextColor="#8B909A"
                    className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                  />

                  <Text className="mb-2 text-[13px] font-semibold text-ink">Event photo</Text>
                  <Pressable
                    onPress={pickEventImage}
                    className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 active:opacity-85"
                  >
                    {eventImageUri ? (
                      <BrandImage
                        source={{ uri: eventImageUri }}
                        contentFit="cover"
                        style={{ height: 150, width: '100%' }}
                        withTextGradient
                      />
                    ) : (
                      <View className="h-[150px] items-center justify-center px-5">
                        <View className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                          <Camera size={20} color="#7C3AED" strokeWidth={2.4} />
                        </View>
                        <Text className="text-center font-ui text-[14px] font-bold text-ink">
                          Add event photo
                        </Text>
                        <Text className="mt-1 text-center text-[12px] leading-4 text-muted">
                          Optional. If you skip it, CultureQuest will use a default event image.
                        </Text>
                      </View>
                    )}
                  </Pressable>

                  {eventImageUri && (
                    <Pressable
                      onPress={() => setEventImageUri(null)}
                      className="mb-4 h-10 items-center justify-center rounded-xl border border-gray-200 active:opacity-80"
                    >
                      <Text className="text-[13px] font-semibold text-muted">Remove photo</Text>
                    </Pressable>
                  )}

                  <Text className="mb-2 text-[13px] font-semibold text-ink">Place or address</Text>
                  <View className="mb-4">
                    <View className="h-12 flex-row items-center gap-3 rounded-xl border border-gray-300 px-4">
                      <Search size={16} color="#756F7B" strokeWidth={2.4} />
                      <TextInput
                        value={placeQuery}
                        onChangeText={(value) => {
                          setPlaceQuery(value);
                          setSelectedPlace(null);
                        }}
                        placeholder={`Search places in ${cityData.name}`}
                        placeholderTextColor="#8B909A"
                        className="flex-1 text-[15px] text-ink"
                      />
                      {searchingPlaces && <ActivityIndicator color="#7C3AED" size="small" />}
                    </View>
                    <Text className="mt-2 text-[11px] leading-4 text-muted">
                      {hasGooglePlacesApiKey
                        ? 'Powered by Google Places suggestions.'
                        : 'Google Places key is missing, so only saved city venues are shown.'}
                    </Text>

                    {selectedPlace && (
                      <View className="mt-2 flex-row gap-3 rounded-xl border border-primary/25 bg-primary/10 p-3">
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                          <MapPin size={16} color="#7C3AED" strokeWidth={2.4} />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text
                            className="font-ui text-[13px] font-bold text-ink"
                            numberOfLines={1}
                          >
                            {selectedPlace.name}
                          </Text>
                          <Text className="text-[11px] leading-4 text-muted" numberOfLines={2}>
                            {selectedPlace.address}
                          </Text>
                        </View>
                      </View>
                    )}

                    {placeSuggestions.length > 0 && (
                      <View className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                        {placeSuggestions.map((place) => (
                          <Pressable
                            key={`${place.source}-${place.id}`}
                            onPress={() => {
                              setSelectedPlace(place);
                              setPlaceQuery(place.name);
                              setPlaceSuggestions([]);
                            }}
                            className="flex-row items-start gap-3 border-b border-gray-100 p-3 active:bg-gray-50"
                          >
                            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                              <MapPin size={16} color="#7C3AED" strokeWidth={2.4} />
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text
                                className="font-ui text-[13px] font-bold text-ink"
                                numberOfLines={1}
                              >
                                {place.name}
                              </Text>
                              <Text className="text-[11px] leading-4 text-muted" numberOfLines={2}>
                                {place.address}
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text className="mb-2 text-[13px] font-semibold text-ink">Category</Text>
                  <View className="mb-4 flex-row flex-wrap gap-2">
                    {eventCategories.map((category) => (
                      <ChoicePill
                        active={eventCategory === category}
                        key={category}
                        label={eventCategoryLabels[category]}
                        onPress={() => setEventCategory(category)}
                      />
                    ))}
                  </View>

                  <View className="mb-4 flex-row gap-3">
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">Date</Text>
                      <Pressable
                        onPress={() => setDatePickerOpen(true)}
                        className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                      >
                        <Text className={`text-[15px] ${eventDate ? 'text-ink' : 'text-muted'}`}>
                          {eventDate || 'Choose date'}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">Time</Text>
                      <Pressable
                        onPress={() => setTimePickerOpen(true)}
                        className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                      >
                        <Text className={`text-[15px] ${eventTime ? 'text-ink' : 'text-muted'}`}>
                          {eventTime || 'Choose time'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text className="mb-2 text-[13px] font-semibold text-ink">Language</Text>
                  <View className="mb-4 flex-row flex-wrap gap-2">
                    {eventLanguages.map((language) => (
                      <ChoicePill
                        active={eventLanguage === language}
                        key={language}
                        label={languageLabels[language]}
                        onPress={() => setEventLanguage(language)}
                      />
                    ))}
                  </View>

                  <View className="mb-4 flex-row gap-3">
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">XP reward</Text>
                      <View className="h-12 justify-center rounded-xl border border-gray-200 bg-gray-100 px-4">
                        <Text className="font-ui text-[15px] font-bold text-ink">
                          {fixedEventXp} XP
                        </Text>
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">Price</Text>
                      <View className="flex-row gap-2">
                        <ChoicePill
                          active={eventIsFree}
                          label="Free"
                          onPress={() => setEventIsFree(true)}
                        />
                        <ChoicePill
                          active={!eventIsFree}
                          label="Paid"
                          onPress={() => setEventIsFree(false)}
                        />
                      </View>
                    </View>
                  </View>

                  <Text className="mb-2 text-[13px] font-semibold text-ink">Description</Text>
                  <TextInput
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    placeholder="What should students know before joining?"
                    placeholderTextColor="#8B909A"
                    multiline
                    textAlignVertical="top"
                    className="mb-4 min-h-[112px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-ink"
                  />

                  {createEventError && (
                    <Text className="mb-4 text-[13px] font-medium text-destructive">
                      {createEventError}
                    </Text>
                  )}

                  <Pressable
                    onPress={submitEvent}
                    disabled={creatingEvent}
                    className="h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-85 disabled:opacity-60"
                  >
                    {creatingEvent ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-[15px] font-semibold text-white">Publish event</Text>
                    )}
                  </Pressable>
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
            <DatePickerModal
              month={calendarMonth}
              onChangeMonth={setCalendarMonth}
              onClose={() => setDatePickerOpen(false)}
              onSelectDate={(date) => {
                setEventDate(formatEventDate(date));
                setDatePickerOpen(false);
              }}
              visible={datePickerOpen}
            />

            <TimePickerModal
              hour={selectedHour}
              minute={selectedMinute}
              onChangeHour={setSelectedHour}
              onChangeMinute={setSelectedMinute}
              onClose={() => setTimePickerOpen(false)}
              onConfirm={() => {
                setEventTime(`${formatTimeUnit(selectedHour)}:${formatTimeUnit(selectedMinute)}`);
                setTimePickerOpen(false);
              }}
              visible={timePickerOpen}
            />
          </Animated.View>
        </GestureDetector>
      </Modal>

      <Modal animationType="slide" onRequestClose={closeBadgesWithAnimation} visible={badgesOpen}>
        <GestureDetector gesture={badgesSwipeGesture}>
          <Animated.View className="flex-1 bg-white" style={badgesSwipeStyle}>
            <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="mb-5 flex-row items-center justify-between">
                  <Pressable
                    onPress={closeBadgesWithAnimation}
                    className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Close badges"
                  >
                    <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                  </Pressable>
                  <View className="rounded-full bg-primary/10 px-3 py-1.5">
                    <Text className="text-[12px] font-extrabold text-primary">
                      {unlockedBadgeCount} / {totalBadgeCount} completed
                    </Text>
                  </View>
                </View>

                <View className="gap-3">
                  {achievementBadges.map((badge) => (
                    <BadgeProgressRow badge={badge} key={badge.id} />
                  ))}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeRewardWithAnimation}
        visible={!!selectedReward}
      >
        {selectedReward && (
          <GestureDetector gesture={rewardSwipeGesture}>
            <Animated.View className="flex-1 bg-white" style={rewardSwipeStyle}>
              <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
                <ScrollView
                  className="flex-1"
                  contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
                  showsVerticalScrollIndicator={false}
                >
                  <Pressable
                    onPress={closeRewardWithAnimation}
                    className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Close reward"
                  >
                    <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                  </Pressable>

                  <View className="mb-5">
                    <Text className="font-heading text-[28px] font-extrabold text-ink">
                      {selectedReward.name}
                    </Text>
                    <Text className="mt-1 text-[13px] leading-5 text-muted">
                      {selectedReward.location}
                    </Text>
                  </View>

                  <View className="mb-5 rounded-2xl border border-gray-200 bg-white p-5">
                    <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                      Reward
                    </Text>
                    <Text className="font-stat text-[22px] font-extrabold text-ink">
                      {selectedReward.discount}
                    </Text>
                    <Text className="mt-3 text-[13px] leading-5 text-muted">
                      Unlock this reward with CultureQuest XP, then show the pickup screen to staff
                      before ordering or paying.
                    </Text>
                  </View>

                  <View className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <View className="border-b border-gray-100 p-4">
                      <Text className="mb-1 text-[13px] font-bold text-ink">How to redeem</Text>
                      <Text className="text-[13px] leading-5 text-muted">
                        1. Visit {selectedReward.name}.
                      </Text>
                      <Text className="text-[13px] leading-5 text-muted">
                        2. Tap Redeem when you are with staff.
                      </Text>
                      <Text className="text-[13px] leading-5 text-muted">
                        3. Show the confirmation card before the reward is applied.
                      </Text>
                    </View>
                    <View className="p-4">
                      <Text className="mb-1 text-[13px] font-bold text-ink">Unlock condition</Text>
                      <Text className="text-[13px] leading-5 text-muted">
                        {selectedReward.condition}
                      </Text>
                    </View>
                  </View>

                  <View className="mb-5 rounded-2xl bg-gray-100 p-5">
                    <View className="mb-4 flex-row items-center justify-between">
                      <View>
                        <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                          Pickup screen
                        </Text>
                        <Text className="mt-1 font-ui text-[15px] font-bold text-ink">
                          {selectedRewardIsUsed
                            ? 'Coupon already used'
                            : selectedRewardIsActive
                              ? 'Show this to staff'
                              : 'Redeem with staff'}
                        </Text>
                      </View>
                      <View
                        className={`rounded-full px-3 py-1 ${
                          selectedRewardIsUsed
                            ? 'bg-gray-200'
                            : selectedRewardIsActive
                              ? 'bg-primary/10'
                              : 'bg-white'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            selectedRewardIsUsed
                              ? 'text-muted'
                              : selectedRewardIsActive
                                ? 'text-primary'
                                : 'text-muted'
                          }`}
                        >
                          {selectedRewardIsUsed
                            ? 'Used'
                            : selectedRewardIsActive
                              ? formatRewardTime(selectedRewardRemainingMs)
                              : 'Not redeemed'}
                        </Text>
                      </View>
                    </View>

                    <View className="rounded-2xl border border-dashed border-gray-300 bg-white p-5">
                      <Text className="mb-2 text-center text-[12px] font-semibold uppercase tracking-wide text-muted">
                        CultureQuest reward
                      </Text>
                      <Text className="text-center font-heading text-[20px] font-extrabold text-ink">
                        {selectedReward.discount}
                      </Text>
                      {selectedRewardIsActive && (
                        <Text className="mt-3 text-center font-stat text-[30px] font-extrabold tracking-widest text-primary">
                          {getRewardPickupCode(selectedReward)}
                        </Text>
                      )}
                      {!selectedRewardState && (
                        <Text className="mt-4 text-center text-[16px] font-bold text-muted">
                          Code hidden until redeem
                        </Text>
                      )}
                      {selectedRewardIsUsed && (
                        <Text className="mt-4 text-center text-[16px] font-bold text-muted">
                          This coupon has already been used.
                        </Text>
                      )}
                      <Text className="mt-2 text-center text-[12px] leading-4 text-muted">
                        {selectedRewardIsActive
                          ? `Valid for ${formatRewardTime(selectedRewardRemainingMs)} at ${
                              selectedReward.name
                            }. Staff confirms before applying the reward.`
                          : selectedRewardIsUsed
                            ? 'The reward code is no longer visible after use.'
                            : 'Tap Redeem only when you are ready to show this screen to staff.'}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => {
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
                    disabled={!!selectedRewardState}
                    className={`h-[52px] items-center justify-center rounded-xl active:opacity-85 ${
                      selectedRewardState ? 'bg-gray-200' : 'bg-primary'
                    }`}
                  >
                    <Text
                      className={`text-[15px] font-semibold ${
                        selectedRewardState ? 'text-muted' : 'text-white'
                      }`}
                    >
                      {selectedRewardIsUsed
                        ? 'Coupon already used'
                        : selectedRewardIsActive
                          ? 'Coupon active'
                          : 'Redeem'}
                    </Text>
                  </Pressable>
                </ScrollView>
              </SafeAreaView>
            </Animated.View>
          </GestureDetector>
        )}
      </Modal>
    </View>
  );
}

function getRewardPickupCode(reward: RewardPartner) {
  return `CQ-${
    reward.id
      .replace(/[^a-z0-9]/gi, '')
      .slice(-4)
      .toUpperCase() || 'REWD'
  }`;
}

function formatRewardTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getXpLevelProgress(xp: number) {
  const currentLevel = [...xpLevels].reverse().find((level) => xp >= level.minXp) ?? xpLevels[0];
  const currentIndex = xpLevels.findIndex((level) => level.name === currentLevel.name);
  const nextLevel = xpLevels[currentIndex + 1] ?? null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel,
      progressPercent: 100,
      xpToNext: 0,
    };
  }

  const levelSpan = nextLevel.minXp - currentLevel.minXp;
  const xpInsideLevel = xp - currentLevel.minXp;
  const progressPercent = Math.min(100, Math.max(0, (xpInsideLevel / levelSpan) * 100));

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    xpToNext: nextLevel.minXp - xp,
  };
}

function RankAvatar({
  initials,
  progressPercent,
  uri,
}: {
  initials: string | null;
  progressPercent: number;
  uri?: string | null;
}) {
  return (
    <View className="relative h-[90px] w-[90px] items-center justify-center">
      <ProgressRing progressPercent={progressPercent} size={90} strokeWidth={6} />
      <View className="h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-full bg-white/15">
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={{ height: 70, width: 70 }} />
        ) : (
          <View className="h-[70px] w-[70px] items-center justify-center bg-primary">
            <Text className="font-ui text-[22px] font-extrabold text-white">
              {initials ?? 'CQ'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ProgressRing({
  progressPercent,
  size,
  strokeWidth,
}: {
  progressPercent: number;
  size: number;
  strokeWidth: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <Svg height={size} style={{ position: 'absolute' }} width={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        r={radius}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={strokeWidth}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        r={radius}
        stroke={Colors.light.accent}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function PassportBadge({ badge }: { badge: (typeof achievementBadges)[number] }) {
  return (
    <Pressable
      className={`w-[104px] rounded-3xl p-3 active:opacity-80 ${
        badge.unlocked ? 'bg-primary/10' : 'bg-gray-100'
      }`}
    >
      <BadgeIcon badge={badge} className="mb-3 h-14 w-14 rounded-2xl" iconSize={25} />
      <Text
        className={`font-ui text-[12px] font-bold leading-4 ${
          badge.unlocked ? 'text-ink' : 'text-muted'
        }`}
        numberOfLines={2}
      >
        {badge.title}
      </Text>
      <Text className="mt-1 text-[10px] font-semibold text-muted" numberOfLines={1}>
        {badge.unlocked ? 'Unlocked' : badge.progress}
      </Text>
    </Pressable>
  );
}

function BadgeProgressRow({ badge }: { badge: (typeof achievementBadges)[number] }) {
  const progress = getBadgeProgress(badge.progress);
  const hasProgress = !badge.unlocked && progress !== null;
  const progressPercent = progress
    ? Math.min(100, Math.max(0, (progress.current / progress.total) * 100))
    : 0;

  return (
    <View
      className={`rounded-3xl border p-4 ${
        badge.unlocked ? 'border-primary/15 bg-primary/5' : 'border-gray-200 bg-white'
      }`}
    >
      <View className="flex-row items-start gap-3">
        <BadgeIcon badge={badge} className="h-12 w-12 rounded-2xl" iconSize={22} />
        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-start justify-between gap-3">
            <Text
              className={`shrink font-ui text-[15px] font-extrabold ${
                badge.unlocked ? 'text-ink' : 'text-muted'
              }`}
            >
              {badge.title}
            </Text>
            <View
              className={`rounded-full px-2 py-0.5 ${
                badge.unlocked ? 'bg-primary/10' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-[10px] font-extrabold ${
                  badge.unlocked ? 'text-primary' : 'text-muted'
                }`}
              >
                {badge.unlocked ? 'Unlocked' : badge.progress}
              </Text>
            </View>
          </View>
          <Text className="text-[12px] leading-4 text-muted">{badge.description}</Text>
          {hasProgress && (
            <View className="mt-3">
              <View className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function BadgeIcon({
  badge,
  className,
  iconSize,
}: {
  badge: (typeof achievementBadges)[number];
  className: string;
  iconSize: number;
}) {
  const Icon = badge.icon;

  return (
    <View
      className={`items-center justify-center ${badge.unlocked ? 'bg-primary' : 'bg-gray-200'} ${className}`}
    >
      <Icon
        size={iconSize}
        color={badge.unlocked ? 'white' : '#9CA3AF'}
        strokeWidth={2.4}
        fill={badge.unlocked ? 'rgba(255,255,255,0.16)' : 'transparent'}
      />
    </View>
  );
}

function getBadgeProgress(progress: string) {
  const match = progress.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;

  return {
    current: Number(match[1]),
    total: Number(match[2]),
  };
}

function RewardPartnerRow({
  onPress,
  reward,
  variantIndex,
}: {
  onPress: () => void;
  reward: RewardPartner;
  variantIndex: number;
}) {
  const RewardIcon = getRewardIcon(reward);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-3xl border border-gray-200 bg-white p-3 active:bg-gray-50"
    >
      <View className="h-[76px] w-[76px] overflow-hidden rounded-2xl">
        <BrandImage
          className="h-full w-full"
          source={getRewardImageSource(reward, variantIndex)}
          withTextGradient
        >
          <View className="absolute bottom-2 left-2 h-8 w-8 items-center justify-center rounded-full bg-white/90">
            <RewardIcon size={16} color={Colors.light.primary} strokeWidth={2.5} />
          </View>
        </BrandImage>
      </View>

      <View className="min-w-0 flex-1">
        <View className="mb-1 flex-row items-start justify-between gap-2">
          <Text className="min-w-0 flex-1 font-ui text-[15px] font-bold text-ink" numberOfLines={1}>
            {reward.name}
          </Text>
          <Text className="font-stat text-[13px] font-extrabold text-primary">
            {reward.xpCost} XP
          </Text>
        </View>
        <Text className="mb-1 text-[12px] text-muted" numberOfLines={1}>
          {reward.location}
        </Text>
        <Text className="text-[13px] leading-5 text-ink" numberOfLines={2}>
          {reward.discount}
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-[11px] font-medium text-muted" numberOfLines={1}>
            {reward.condition}
          </Text>
          <Text className="text-[12px] font-semibold text-primary">View</Text>
        </View>
      </View>
    </Pressable>
  );
}

function OrganizerVerifiedBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-1 rounded-full bg-secondary ${
        compact ? 'px-1.5 py-1' : 'px-2 py-1'
      }`}
    >
      <BadgeCheck size={13} color="white" fill="white" strokeWidth={2.3} />
      {!compact && (
        <Text className="text-[10px] font-bold uppercase tracking-wide text-white">Approved</Text>
      )}
    </View>
  );
}

function getRewardIcon(reward: RewardPartner) {
  if (reward.category === 'bookstore' || reward.name.toLowerCase().includes('book')) {
    return BookOpen;
  }
  if (reward.name.toLowerCase().includes('browar') || reward.name.toLowerCase().includes('brew')) {
    return Beer;
  }
  if (reward.category === 'cafe') {
    return Coffee;
  }

  return Gift;
}

function getRewardImageSource(reward: RewardPartner, variantIndex: number) {
  if (reward.category === 'cafe') {
    return require('@/assets/images/culture/venue-cafe.jpg');
  }
  if (reward.name.toLowerCase().includes('browar') || reward.name.toLowerCase().includes('brew')) {
    return require('@/assets/images/culture/venue-theater.jpg');
  }
  if (reward.category === 'bookstore' || reward.name.toLowerCase().includes('book')) {
    return require('@/assets/images/culture/venue-museum.jpg');
  }

  return variantIndex % 2 === 0
    ? require('@/assets/images/culture/venue-cafe.jpg')
    : require('@/assets/images/culture/venue-museum.jpg');
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

function ChoicePill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-2 ${
        active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'
      }`}
    >
      <Text className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function DatePickerModal({
  month,
  onChangeMonth,
  onClose,
  onSelectDate,
  visible,
}: {
  month: Date;
  onChangeMonth: (date: Date) => void;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  visible: boolean;
}) {
  const days = getCalendarDays(month);

  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-50 justify-center bg-black/35 px-5">
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className="rounded-2xl bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => onChangeMonth(addMonths(month, -1))}
            className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          >
            <Text className="text-[20px] font-bold text-primary">‹</Text>
          </Pressable>
          <Text className="text-[17px] font-extrabold text-ink">
            {monthNames[month.getMonth()]} {month.getFullYear()}
          </Text>
          <Pressable
            onPress={() => onChangeMonth(addMonths(month, 1))}
            className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          >
            <Text className="text-[20px] font-bold text-primary">›</Text>
          </Pressable>
        </View>

        <View className="mb-2 flex-row">
          {weekdayLabels.map((day) => (
            <Text
              className="flex-1 text-center text-[11px] font-bold uppercase text-muted"
              key={day}
            >
              {day}
            </Text>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {days.map((date, index) => {
            const disabled = !date || isBeforeToday(date);

            return (
              <Pressable
                disabled={disabled}
                key={date ? date.toISOString() : `empty-${index}`}
                onPress={() => date && onSelectDate(date)}
                style={{ width: '14.2857%' }}
                className="aspect-square items-center justify-center p-1 disabled:opacity-35"
              >
                {date && (
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-[13px] font-bold text-primary">{date.getDate()}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TimePickerModal({
  hour,
  minute,
  onChangeHour,
  onChangeMinute,
  onClose,
  onConfirm,
  visible,
}: {
  hour: number;
  minute: number;
  onChangeHour: (hour: number) => void;
  onChangeMinute: (minute: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-50 justify-center bg-black/35 px-5">
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className="rounded-2xl bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[19px] font-extrabold text-ink">Choose time</Text>
          <Text className="text-[17px] font-extrabold text-primary">
            {formatTimeUnit(hour)}:{formatTimeUnit(minute)}
          </Text>
        </View>

        <View className="mb-4 flex-row gap-3">
          <ScrollView className="max-h-[220px] flex-1 rounded-xl bg-gray-100">
            {timeHours.map((nextHour) => (
              <Pressable
                key={nextHour}
                onPress={() => onChangeHour(nextHour)}
                className={`items-center py-3 ${
                  hour === nextHour ? 'bg-primary' : 'border-b border-white'
                }`}
              >
                <Text
                  className={`text-[16px] font-bold ${
                    hour === nextHour ? 'text-white' : 'text-ink'
                  }`}
                >
                  {formatTimeUnit(nextHour)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView className="max-h-[220px] flex-1 rounded-xl bg-gray-100">
            {timeMinutes.map((nextMinute) => (
              <Pressable
                key={nextMinute}
                onPress={() => onChangeMinute(nextMinute)}
                className={`items-center py-3 ${
                  minute === nextMinute ? 'bg-primary' : 'border-b border-white'
                }`}
              >
                <Text
                  className={`text-[16px] font-bold ${
                    minute === nextMinute ? 'text-white' : 'text-ink'
                  }`}
                >
                  {formatTimeUnit(nextMinute)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Pressable
          onPress={onConfirm}
          className="h-12 items-center justify-center rounded-xl bg-primary active:opacity-85"
        >
          <Text className="text-[14px] font-semibold text-white">Set time</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const days: (Date | null)[] = Array.from({ length: startOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), day));
  }

  return days;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isBeforeToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const comparisonDate = new Date(date);
  comparisonDate.setHours(0, 0, 0, 0);
  return comparisonDate < today;
}

function formatEventDate(date: Date) {
  return `${weekdayLabels[(date.getDay() + 6) % 7]}, ${monthNames[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

function formatTimeUnit(value: number) {
  return value.toString().padStart(2, '0');
}

function OrganizerStatusCard({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const color = isApproved ? '#F4A261' : isRejected ? '#EF4444' : '#F4A261';
  const Icon = isApproved ? CheckCircle2 : isRejected ? CircleAlert : Building2;
  const title = isApproved
    ? 'Organizer approved'
    : isRejected
      ? 'Organizer application rejected'
      : 'Organizer application pending';
  const message = isApproved
    ? 'Your institution has been approved. Event creation tools are next.'
    : isRejected
      ? 'Your organizer request was not approved. Contact CultureQuest support before applying again.'
      : 'CultureQuest admin must approve the institution before event creation is enabled.';

  return (
    <View
      className="mb-3 flex-row gap-3 rounded-xl border p-3"
      style={{
        backgroundColor: `${color}14`,
        borderColor: `${color}35`,
      }}
    >
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={17} color={color} strokeWidth={2.4} />
      </View>
      <View className="flex-1">
        <Text className="font-ui text-[13px] font-bold text-ink">{title}</Text>
        <Text className="mt-0.5 text-[12px] leading-4 text-muted">{message}</Text>
      </View>
    </View>
  );
}

function Avatar({ uri, size, iconSize }: { uri?: string | null; size: number; iconSize: number }) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-primary"
      style={{ height: size, width: size }}
    >
      {uri ? (
        <Image source={{ uri }} contentFit="cover" style={{ height: size, width: size }} />
      ) : (
        <User size={iconSize} color="white" strokeWidth={2.2} />
      )}
    </View>
  );
}
