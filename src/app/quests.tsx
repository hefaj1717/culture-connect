import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  LockKeyhole,
  MapPin,
  Route,
  Sparkles,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

import { BrandImage } from '@/components/brand-image';
import { Colors } from '@/constants/theme';
import { type CultureCityData, getCultureCityData } from '@/data/culture';

type QuestStop = {
  id: string;
  title: string;
  description: string;
  eta: string;
  completed: boolean;
};

type Quest = {
  id: string;
  title: string;
  theme: string;
  description: string;
  totalXp: number;
  completedStops: number;
  image: 'museum' | 'cafe' | 'theater';
  stops: QuestStop[];
};

type QuestsScreenProps = {
  cityData?: CultureCityData;
};

export default function QuestsScreen({ cityData = getCultureCityData() }: QuestsScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const quests = useMemo(() => getQuestData(cityData.id), [cityData.id]);

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5" style={{ paddingTop: insets.top + 16 }}>
          <View className="mb-5 overflow-hidden rounded-3xl bg-ink">
            <LinearGradient
              colors={['rgba(124,58,237,0.72)', 'rgba(36,28,46,0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20 }}
            >
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Route size={25} color="white" strokeWidth={2.4} />
              </View>
              <Text className="font-heading text-[26px] font-extrabold leading-[30px] text-white">
                Build a city story, one stop at a time.
              </Text>
              <Text className="mt-2 max-w-[280px] text-[13px] leading-5 text-white/80">
                Follow curated paths, check in at each location, and unlock XP when the trail is
                complete.
              </Text>
            </LinearGradient>
          </View>

          <Text className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Active paths
          </Text>

          <View className="gap-4">
            {quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onPress={() => setSelectedQuest(quest)} />
            ))}
          </View>
        </View>
      </ScrollView>

      <QuestDetailModal quest={selectedQuest} onClose={() => setSelectedQuest(null)} />
    </View>
  );
}

function QuestCard({ onPress, quest }: { onPress: () => void; quest: Quest }) {
  const totalStops = quest.stops.length;
  const progressPercent = Math.round((quest.completedStops / totalStops) * 100);

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-primary/10 bg-white active:opacity-90"
    >
      <View className="h-[142px] bg-gray-200">
        <BrandImage
          source={getQuestImageSource(quest.image)}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
          withTextGradient
        >
          <View className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1">
            <Text className="text-[11px] font-bold text-primary">{quest.theme}</Text>
          </View>
          <View className="absolute bottom-4 left-4 right-4">
            <Text className="font-heading text-[24px] font-extrabold leading-[27px] text-white">
              {quest.title}
            </Text>
          </View>
        </BrandImage>
      </View>

      <View className="p-4">
        <Text className="mb-4 text-[13px] leading-5 text-muted" numberOfLines={2}>
          {quest.description}
        </Text>

        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Sparkles size={15} color={Colors.light.primary} strokeWidth={2.4} />
            <Text className="text-[13px] font-extrabold text-primary">+{quest.totalXp} XP</Text>
          </View>
          <Text className="text-[12px] font-semibold text-muted">
            {quest.completedStops} of {totalStops} stops completed
          </Text>
        </View>

        <View className="h-2 overflow-hidden rounded-full bg-primary/10">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      </View>
    </Pressable>
  );
}

function QuestDetailModal({ onClose, quest }: { onClose: () => void; quest: Quest | null }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (quest) {
      translateX.value = 0;
    }
  }, [quest, translateX]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-999, 18])
    .failOffsetY([-35, 35])
    .onUpdate((event) => {
      translateX.value = Math.max(0, event.translationX);
    })
    .onEnd((event) => {
      const shouldClose = translateX.value > width * 0.28 || event.velocityX > 700;

      if (shouldClose) {
        translateX.value = withTiming(width, { duration: 180 }, (finished) => {
          if (finished) {
            runOnJS(onClose)();
          }
        });
        return;
      }

      translateX.value = withTiming(0, { duration: 180 });
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function closeWithAnimation() {
    translateX.value = withTiming(width, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }

  if (!quest) return null;

  return (
    <Modal animationType="slide" onRequestClose={closeWithAnimation} visible>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <ScrollView
            className="flex-1 bg-white"
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="relative h-[270px] bg-gray-200">
              <BrandImage
                source={getQuestImageSource(quest.image)}
                contentFit="cover"
                style={StyleSheet.absoluteFillObject}
                withTextGradient
              />
              <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 px-5">
                <Pressable
                  onPress={closeWithAnimation}
                  className="mt-2 h-10 w-10 items-center justify-center rounded-full bg-black/30 active:opacity-80"
                >
                  <ArrowLeft size={21} color="white" strokeWidth={2.6} />
                </Pressable>
              </SafeAreaView>
              <View className="absolute bottom-5 left-5 right-5">
                <Text className="mb-2 text-[12px] font-bold uppercase tracking-wide text-white/80">
                  {quest.theme}
                </Text>
                <Text className="font-heading text-[30px] font-extrabold leading-[34px] text-white">
                  {quest.title}
                </Text>
              </View>
            </View>

            <View className="px-5 pt-5">
              <View className="mb-5 flex-row items-center justify-between rounded-2xl bg-primary/10 p-4">
                <View className="flex-row items-center gap-2">
                  <Sparkles size={18} color={Colors.light.primary} strokeWidth={2.5} />
                  <Text className="text-[15px] font-extrabold text-primary">
                    {quest.totalXp} XP total
                  </Text>
                </View>
                <Text className="text-[13px] font-semibold text-muted">
                  {quest.completedStops}/{quest.stops.length} stops
                </Text>
              </View>

              <Text className="mb-3 font-heading text-[23px] font-extrabold text-ink">
                Trail stops
              </Text>

              <View className="gap-3">
                {quest.stops.map((stop, index) => (
                  <QuestStopRow
                    isLast={index === quest.stops.length - 1}
                    key={stop.id}
                    stop={stop}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function QuestStopRow({ isLast, stop }: { isLast: boolean; stop: QuestStop }) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View
          className={`h-11 w-11 items-center justify-center rounded-2xl ${
            stop.completed ? 'bg-primary' : 'bg-gray-100'
          }`}
        >
          {stop.completed ? (
            <BadgeCheck size={22} color="white" fill="rgba(255,255,255,0.18)" strokeWidth={2.4} />
          ) : (
            <LockKeyhole size={20} color="#9CA3AF" strokeWidth={2.4} />
          )}
        </View>
        {!isLast && <View className="my-1 h-10 w-px bg-gray-200" />}
      </View>

      <View className="min-w-0 flex-1 pb-4">
        <Text
          className={`font-ui text-[15px] font-bold ${stop.completed ? 'text-ink' : 'text-muted'}`}
        >
          {stop.title}
        </Text>
        <Text className="mt-1 text-[13px] leading-5 text-muted">{stop.description}</Text>
        <View className="mt-2 flex-row items-center gap-4">
          <View className="flex-row items-center gap-1">
            <Clock3 size={13} color="#756F7B" />
            <Text className="text-[12px] font-medium text-muted">{stop.eta}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <MapPin size={13} color="#756F7B" />
            <Text className="text-[12px] font-medium text-muted">
              {stop.completed ? 'Completed' : 'Upcoming'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function getQuestData(cityId: CultureCityData['id']): Quest[] {
  if (cityId === 'lublin') {
    return [
      {
        id: 'lublin-modernist-trail',
        title: 'The Modernist Architecture Trail',
        theme: 'Architecture',
        description:
          'A walk through Lublin facades, student landmarks, and bold post-war details hiding in plain sight.',
        totalXp: 250,
        completedStops: 2,
        image: 'museum',
        stops: [
          {
            id: 'cs1',
            title: 'Plac Litewski start',
            description: 'Begin at the main square and read the trail briefing.',
            eta: '5 min',
            completed: true,
          },
          {
            id: 'cs2',
            title: 'Centre for Culture facade',
            description: 'Find the geometric entry detail and scan the location marker.',
            eta: '8 min',
            completed: true,
          },
          {
            id: 'cs3',
            title: 'Old Town contrast point',
            description: 'Compare the route notes with the older city fabric nearby.',
            eta: '12 min',
            completed: false,
          },
          {
            id: 'cs4',
            title: 'Student cafe checkpoint',
            description: 'Finish with a partner cafe stop and unlock the quest XP.',
            eta: '10 min',
            completed: false,
          },
        ],
      },
      {
        id: 'lublin-night-culture',
        title: 'After-Class Culture Loop',
        theme: 'Student night',
        description:
          'Three evening stops for film, small gigs, and a cafe reward after the last check-in.',
        totalXp: 180,
        completedStops: 1,
        image: 'cafe',
        stops: [
          {
            id: 'ns1',
            title: 'Bookland Lublin',
            description: 'Pick up the first clue from the staff counter.',
            eta: '6 min',
            completed: true,
          },
          {
            id: 'ns2',
            title: 'Perlowy Browar',
            description: 'Check the event board and save one upcoming concert.',
            eta: '10 min',
            completed: false,
          },
          {
            id: 'ns3',
            title: 'Heca Cafe',
            description: 'Scan the final QR and unlock the route reward.',
            eta: '7 min',
            completed: false,
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'leuven-modernist-trail',
      title: 'The Modernist Architecture Trail',
      theme: 'Architecture',
      description:
        'A curated route from campus corners to cultural venues that shaped Leuven’s modern student life.',
      totalXp: 250,
      completedStops: 2,
      image: 'museum',
      stops: [
        {
          id: 'ms1',
          title: 'University Library steps',
          description: 'Start with the city skyline and read the route intro.',
          eta: '5 min',
          completed: true,
        },
        {
          id: 'ms2',
          title: 'M-Museum Leuven',
          description: 'Find the courtyard perspective and confirm the stop.',
          eta: '9 min',
          completed: true,
        },
        {
          id: 'ms3',
          title: 'STUK Arts Centre',
          description: 'Spot the contemporary performance posters by the entry.',
          eta: '12 min',
          completed: false,
        },
        {
          id: 'ms4',
          title: '30CC Cultural Centre',
          description: 'Finish the trail with the city programme board.',
          eta: '8 min',
          completed: false,
        },
        {
          id: 'ms5',
          title: 'Cafe reward stop',
          description: 'Claim the final check-in and unlock your quest XP.',
          eta: '6 min',
          completed: false,
        },
      ],
    },
    {
      id: 'leuven-first-weekend',
      title: 'First Weekend Explorer',
      theme: 'Newcomer',
      description: 'A compact trail for students who want the city to feel familiar before Monday.',
      totalXp: 160,
      completedStops: 0,
      image: 'theater',
      stops: [
        {
          id: 'fw1',
          title: 'STUK welcome board',
          description: 'Save one performance and scan the entry marker.',
          eta: '7 min',
          completed: false,
        },
        {
          id: 'fw2',
          title: 'M-Museum quick visit',
          description: 'Check in near the entrance and browse the highlighted room.',
          eta: '14 min',
          completed: false,
        },
        {
          id: 'fw3',
          title: 'Student cafe finish',
          description: 'End the loop with a partner reward preview.',
          eta: '6 min',
          completed: false,
        },
      ],
    },
  ];
}

function getQuestImageSource(image: Quest['image']) {
  if (image === 'cafe') {
    return require('@/assets/images/culture/venue-cafe.jpg');
  }
  if (image === 'theater') {
    return require('@/assets/images/culture/venue-theater.jpg');
  }

  return require('@/assets/images/culture/venue-museum.jpg');
}
