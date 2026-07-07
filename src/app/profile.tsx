import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Award,
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
  LogOut,
  MapPin,
  Pencil,
  Plus,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthScreen } from '@/components/auth-screen';
import { CitySelector } from '@/components/city-selector';
import {
  type CityId,
  type EventCategory,
  type EventLanguage,
  defaultCityId,
  eventCategoryLabels,
  getCultureCityData,
  languageLabels,
} from '@/data/culture';
import { createOrganizerEvent } from '@/lib/organizer-events';
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

const achievementBadges = [
  {
    id: 'first-quest',
    title: 'First Quest',
    description: 'Attend your first CultureQuest event.',
    progress: '1 / 1',
    unlocked: true,
    icon: TicketCheck,
    color: '#22C55E',
  },
  {
    id: 'culture-regular',
    title: 'Culture Regular',
    description: 'Attend 10 events across your city.',
    progress: '4 / 10',
    unlocked: false,
    icon: CalendarPlus,
    color: '#24458F',
  },
  {
    id: 'reward-hunter',
    title: 'Reward Hunter',
    description: 'Redeem 10 rewards from local partners.',
    progress: '2 / 10',
    unlocked: false,
    icon: Gift,
    color: '#F59E0B',
  },
  {
    id: 'museum-mind',
    title: 'Museum Mind',
    description: 'Check in at 5 museum or gallery events.',
    progress: '3 / 5',
    unlocked: false,
    icon: Building2,
    color: '#6366F1',
  },
  {
    id: 'city-explorer',
    title: 'City Explorer',
    description: 'Visit 8 different venues in one city.',
    progress: '5 / 8',
    unlocked: false,
    icon: Compass,
    color: '#3B82F6',
  },
  {
    id: 'social-spark',
    title: 'Social Spark',
    description: 'Mark Going on 5 events before attending.',
    progress: '5 / 5',
    unlocked: true,
    icon: Sparkles,
    color: '#EC4899',
  },
  {
    id: 'international-eye',
    title: 'International Eye',
    description: 'Join 3 multilingual or international events.',
    progress: '1 / 3',
    unlocked: false,
    icon: Globe,
    color: '#0EA5E9',
  },
  {
    id: 'coffee-route',
    title: 'Coffee Route',
    description: 'Redeem rewards at 3 cafe partners.',
    progress: '1 / 3',
    unlocked: false,
    icon: Coffee,
    color: '#A16207',
  },
  {
    id: 'top-week',
    title: 'Top 10 Week',
    description: 'Reach the weekly city leaderboard top 10.',
    progress: 'Best: #14',
    unlocked: false,
    icon: Trophy,
    color: '#EAB308',
  },
  {
    id: 'founding-student',
    title: 'Founding Student',
    description: 'Join CultureQuest during the pilot season.',
    progress: 'Unlocked',
    unlocked: true,
    icon: Crown,
    color: '#7C3AED',
  },
];

type ProfileScreenProps = {
  onEventCreated?: () => void;
};

export default function ProfileScreen({ onEventCreated }: ProfileScreenProps = {}) {
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
  const [eventVenueId, setEventVenueId] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>('workshop');
  const [eventLanguage, setEventLanguage] = useState<EventLanguage>('en');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventXp, setEventXp] = useState('50');
  const [eventIsFree, setEventIsFree] = useState(true);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);

  const email = session?.user.email ?? 'Student';
  const metadataName = [
    session?.user.user_metadata?.first_name,
    session?.user.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ');
  const fullName = session?.user.user_metadata?.full_name || metadataName || email.split('@')[0];
  const savedFirstName = session?.user.user_metadata?.first_name || '';
  const savedLastName = session?.user.user_metadata?.last_name || '';
  const savedCityId: CityId =
    session?.user.user_metadata?.city_id === 'lublin' ? 'lublin' : defaultCityId;
  const cityData = getCultureCityData(savedCityId);
  const savedAvatarUrl = session?.user.user_metadata?.avatar_url || null;
  const selectedEventVenue =
    cityData.venues.find((venue) => venue.id === eventVenueId) ?? cityData.venues[0];
  const createEventTranslateX = useSharedValue(0);
  const badgesTranslateX = useSharedValue(0);

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

  useEffect(() => {
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setCityId(savedCityId);
    setAvatarUrl(savedAvatarUrl);
    setEventVenueId(cityData.venues[0]?.id || '');
    setEventLanguage(savedCityId === 'lublin' ? 'pl' : 'en');
  }, [cityData.venues, savedAvatarUrl, savedCityId, savedFirstName, savedLastName]);

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
    setEventVenueId(cityData.venues[0]?.id || '');
    setEventCategory('workshop');
    setEventLanguage(savedCityId === 'lublin' ? 'pl' : 'en');
    setEventDate('');
    setEventTime('');
    setEventDescription('');
    setEventXp('50');
    setEventIsFree(true);
    setCreateEventError(null);
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

  async function submitEvent() {
    const normalizedTitle = eventTitle.trim();
    const normalizedDate = eventDate.trim();
    const normalizedTime = eventTime.trim();
    const normalizedDescription = eventDescription.trim();
    const xpBonus = Number.parseInt(eventXp, 10);

    if (!session?.user.id) {
      setCreateEventError('Log in again before publishing an event.');
      return;
    }
    if (!selectedEventVenue) {
      setCreateEventError('Choose a venue for this event.');
      return;
    }
    if (!normalizedTitle || !normalizedDate || !normalizedTime || !normalizedDescription) {
      setCreateEventError('Fill in title, date, time, and description.');
      return;
    }
    if (!Number.isFinite(xpBonus) || xpBonus < 0 || xpBonus > 500) {
      setCreateEventError('XP must be a number between 0 and 500.');
      return;
    }

    setCreateEventError(null);
    setCreatingEvent(true);
    const result = await createOrganizerEvent(session.user.id, {
      cityId: savedCityId,
      venue: selectedEventVenue,
      title: normalizedTitle,
      description: normalizedDescription,
      category: eventCategory,
      date: normalizedDate,
      time: normalizedTime,
      xpBonus,
      language: eventLanguage,
      isFree: eventIsFree,
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 112 }}>
        <View className="px-5 pt-4 pb-5">
          <Text className="text-[28px] font-bold tracking-tight text-black">Profile</Text>
          <Text className="text-[14px] text-muted">Your CultureQuest progress</Text>
        </View>

        <View className="mx-5 mb-5 rounded-2xl border border-gray-200 bg-white p-5">
          <View className="mb-5 flex-row items-center gap-4">
            <Avatar uri={savedAvatarUrl} size={64} iconSize={28} />
            <View className="min-w-0 flex-1">
              <Text className="text-[20px] font-bold text-black" numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="text-[13px] text-muted" numberOfLines={1}>
                {email}
              </Text>
              <Text className="mt-1 text-[12px] font-semibold text-primary" numberOfLines={1}>
                {cityData.label}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              setProfileError(null);
              setFirstName(savedFirstName);
              setLastName(savedLastName);
              setCityId(savedCityId);
              setAvatarUrl(savedAvatarUrl);
              setEditOpen(true);
            }}
            className="mb-3 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
          >
            <Pencil size={16} color="white" strokeWidth={2.4} />
            <Text className="text-[14px] font-semibold text-white">Edit profile</Text>
          </Pressable>

          {organizerApplicationStatus !== 'none' && (
            <OrganizerStatusCard status={organizerApplicationStatus} />
          )}

          {organizerApplicationStatus === 'approved' && (
            <View className="mb-5 rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <View className="mb-3 flex-row items-start gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary">
                  <CalendarPlus size={18} color="white" strokeWidth={2.4} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-extrabold text-black">Organizer tools</Text>
                  <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                    Create events for {cityData.name}. Published events appear in Discover.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  resetEventForm();
                  setCreateEventOpen(true);
                }}
                className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-primary active:opacity-85"
              >
                <Plus size={17} color="white" strokeWidth={2.4} />
                <Text className="text-[14px] font-semibold text-white">Create event</Text>
              </Pressable>
            </View>
          )}

          <View className="mb-5 flex-row rounded-2xl bg-gray-100 p-4">
            <View className="flex-1 items-center">
              <Text className="text-[22px] font-bold text-black">1,860</Text>
              <Text className="text-[11px] font-medium text-muted">XP</Text>
            </View>
            <View className="w-px bg-gray-200" />
            <View className="flex-1 items-center">
              <View className="flex-row items-center gap-1">
                <Text className="text-[22px] font-bold text-black">8</Text>
                <TicketCheck size={16} color="#24458F" />
              </View>
              <Text className="text-[11px] font-medium text-muted">Events</Text>
            </View>
            <View className="w-px bg-gray-200" />
            <Pressable
              onPress={() => setBadgesOpen(true)}
              className="flex-1 items-center active:opacity-75"
            >
              <Award size={22} color="#3B82F6" />
              <Text className="text-[11px] font-medium text-muted">Badges</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={signOut}
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-gray-200 active:opacity-80"
          >
            <LogOut size={17} color="#60646C" />
            <Text className="text-[14px] font-semibold text-muted">Log out</Text>
          </Pressable>
        </View>

        <View className="px-5">
          <View className="mb-3 flex-row items-center gap-2">
            <Sparkles size={16} color="#24458F" />
            <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Rewards
            </Text>
          </View>

          <View className="gap-3">
            {cityData.rewardPartners.map((reward) => (
              <View key={reward.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-start gap-3">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${reward.color}20` }}
                  >
                    <Gift size={20} color={reward.color} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="mb-1 flex-row items-center gap-2">
                      <Text className="shrink text-[15px] font-bold text-black" numberOfLines={1}>
                        {reward.name}
                      </Text>
                      {!!reward.badge && (
                        <View className="rounded-full bg-secondary/10 px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-secondary">
                            {reward.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="mb-1 text-[13px] text-muted">{reward.discount}</Text>
                    <Text className="text-[12px] font-semibold text-success">
                      {reward.xpCost} XP
                    </Text>
                  </View>
                </View>
              </View>
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
              <View className="mb-6 flex-row items-center justify-between">
                <View>
                  <Text className="text-[26px] font-extrabold text-black">Edit profile</Text>
                  <Text className="mt-0.5 text-[13px] text-muted">Update your public details</Text>
                </View>
                <Pressable
                  onPress={() => setEditOpen(false)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                >
                  <X size={19} color="#5F6675" strokeWidth={2.4} />
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

              <Text className="mb-2 text-[13px] font-semibold text-black">First name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#8B909A"
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="given-name"
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
              />

              <Text className="mb-2 text-[13px] font-semibold text-black">Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor="#8B909A"
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="family-name"
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
              />

              <Text className="mb-2 text-[13px] font-semibold text-black">City</Text>
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
                    <ArrowLeft size={21} color="#5F6675" strokeWidth={2.6} />
                  </Pressable>

                  <View className="mb-6">
                    <Text className="text-[26px] font-extrabold text-black">Create event</Text>
                    <Text className="mt-0.5 text-[13px] text-muted">
                      Publish as an approved CultureQuest organizer
                    </Text>
                  </View>

                  <Text className="mb-2 text-[13px] font-semibold text-black">Event title</Text>
                  <TextInput
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    placeholder="e.g. Student Jazz Night"
                    placeholderTextColor="#8B909A"
                    className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
                  />

                  <Text className="mb-2 text-[13px] font-semibold text-black">Venue</Text>
                  <View className="mb-4 gap-2">
                    {cityData.venues.map((venue) => {
                      const active = eventVenueId === venue.id;
                      return (
                        <Pressable
                          key={venue.id}
                          onPress={() => setEventVenueId(venue.id)}
                          className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                            active ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <MapPin size={16} color="#24458F" strokeWidth={2.4} />
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text className="text-[13px] font-bold text-black" numberOfLines={1}>
                              {venue.name}
                            </Text>
                            <Text className="text-[11px] text-muted" numberOfLines={1}>
                              {venue.address}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text className="mb-2 text-[13px] font-semibold text-black">Category</Text>
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
                      <Text className="mb-2 text-[13px] font-semibold text-black">Date</Text>
                      <TextInput
                        value={eventDate}
                        onChangeText={setEventDate}
                        placeholder="Fri, Apr 12"
                        placeholderTextColor="#8B909A"
                        className="rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-black">Time</Text>
                      <TextInput
                        value={eventTime}
                        onChangeText={setEventTime}
                        placeholder="19:00 - 21:00"
                        placeholderTextColor="#8B909A"
                        className="rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
                      />
                    </View>
                  </View>

                  <Text className="mb-2 text-[13px] font-semibold text-black">Language</Text>
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
                      <Text className="mb-2 text-[13px] font-semibold text-black">XP reward</Text>
                      <TextInput
                        value={eventXp}
                        onChangeText={setEventXp}
                        keyboardType="number-pad"
                        placeholder="50"
                        placeholderTextColor="#8B909A"
                        className="rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-black"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-black">Price</Text>
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

                  <Text className="mb-2 text-[13px] font-semibold text-black">Description</Text>
                  <TextInput
                    value={eventDescription}
                    onChangeText={setEventDescription}
                    placeholder="What should students know before joining?"
                    placeholderTextColor="#8B909A"
                    multiline
                    textAlignVertical="top"
                    className="mb-4 min-h-[112px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-black"
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
                <Pressable
                  onPress={closeBadgesWithAnimation}
                  className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close badges"
                >
                  <ArrowLeft size={21} color="#5F6675" strokeWidth={2.6} />
                </Pressable>

                <View className="mb-5">
                  <Text className="text-[28px] font-extrabold text-black">Badges</Text>
                  <Text className="mt-1 text-[13px] leading-5 text-muted">
                    Milestones for exploring events, venues, and local rewards.
                  </Text>
                </View>

                <View className="mb-5 flex-row rounded-2xl bg-primary/5 p-4">
                  <View className="flex-1 items-center">
                    <Text className="text-[22px] font-extrabold text-black">3</Text>
                    <Text className="text-[11px] font-medium text-muted">Unlocked</Text>
                  </View>
                  <View className="w-px bg-primary/10" />
                  <View className="flex-1 items-center">
                    <Text className="text-[22px] font-extrabold text-black">10</Text>
                    <Text className="text-[11px] font-medium text-muted">Total</Text>
                  </View>
                </View>

                <View className="gap-3">
                  {achievementBadges.map((badge) => {
                    const Icon = badge.icon;

                    return (
                      <View
                        key={badge.id}
                        className={`rounded-2xl border p-4 ${
                          badge.unlocked
                            ? 'border-primary/15 bg-white'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <View className="flex-row items-start gap-3">
                          <View
                            className="h-12 w-12 items-center justify-center rounded-xl"
                            style={{
                              backgroundColor: `${badge.color}${badge.unlocked ? '22' : '14'}`,
                            }}
                          >
                            <Icon
                              size={22}
                              color={badge.unlocked ? badge.color : '#8B909A'}
                              strokeWidth={2.4}
                            />
                          </View>
                          <View className="min-w-0 flex-1">
                            <View className="mb-1 flex-row items-center gap-2">
                              <Text className="shrink text-[15px] font-extrabold text-black">
                                {badge.title}
                              </Text>
                              {badge.unlocked && (
                                <View className="rounded-full bg-success/10 px-2 py-0.5">
                                  <Text className="text-[10px] font-bold text-success">
                                    Unlocked
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="mb-2 text-[12px] leading-4 text-muted">
                              {badge.description}
                            </Text>
                            <Text
                              className={`text-[12px] font-bold ${
                                badge.unlocked ? 'text-primary' : 'text-muted'
                              }`}
                            >
                              {badge.progress}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </GestureDetector>
      </Modal>
    </SafeAreaView>
  );
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

function OrganizerStatusCard({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const color = isApproved ? '#22C55E' : isRejected ? '#EF4444' : '#F59E0B';
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
        <Text className="text-[13px] font-bold text-black">{title}</Text>
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
