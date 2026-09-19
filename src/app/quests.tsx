import { ArrowLeft, BadgeCheck, Clock3, LockKeyhole, MapPin, X } from 'lucide-react-native';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CardListSkeleton, EmptyState, ErrorState } from '@/components/async-state';
import { BrandImage } from '@/components/brand-image';
import { ScreenHeader } from '@/components/screen-header';
import { CardStyles, Colors } from '@/constants/theme';
import { type CultureCityData, getCultureCityData } from '@/data/culture';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useStableTopInset } from '@/hooks/use-stable-safe-area';
import { fetchApprovedQuests, type Quest, type QuestStop } from '@/lib/quests';

type QuestsScreenProps = {
  cityData?: CultureCityData;
  completedQuestIds?: string[];
  questsRefreshKey?: number;
  onQuestCompleted?: (
    questId: string,
    completionCode: string,
  ) => Promise<{ error?: string; success: boolean }>;
};

export default function QuestsScreen({
  cityData = getCultureCityData(),
  completedQuestIds = [],
  questsRefreshKey = 0,
  onQuestCompleted,
}: QuestsScreenProps) {
  const stableTopInset = useStableTopInset();
  const [approvedQuests, setApprovedQuests] = useState<Quest[]>([]);
  const [questsError, setQuestsError] = useState<string | null>(null);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const quests = useMemo(
    () => applyCompletedQuestState(approvedQuests, completedQuestIds),
    [approvedQuests, completedQuestIds],
  );
  const selectedQuestView = selectedQuest
    ? (quests.find((quest) => quest.id === selectedQuest.id) ?? selectedQuest)
    : null;

  useEffect(() => {
    let active = true;

    async function loadQuests() {
      setQuestsLoading(true);
      const result = await fetchApprovedQuests(cityData.id);
      if (!active) return;

      setApprovedQuests(result.quests);
      setQuestsError(result.error);
      setQuestsLoading(false);
    }

    loadQuests();

    return () => {
      active = false;
    };
  }, [cityData.id, questsRefreshKey]);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5" style={{ paddingTop: stableTopInset + 24 }}>
          <ScreenHeader title="Quests" />
          <Text className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Active paths
          </Text>

          {questsLoading ? (
            <CardListSkeleton count={3} style={{ marginBottom: 16 }} />
          ) : questsError ? (
            <ErrorState
              body="We could not load quests right now. Check your connection and try again."
              style={{ marginBottom: 16 }}
              title="Quests could not load"
            />
          ) : quests.length === 0 ? (
            <EmptyState
              body={`CultureQuest-curated paths for ${cityData.name} will appear here after admin review.`}
              icon={MapPin}
              title="No active quests yet"
            />
          ) : (
            <View className="gap-4">
              {quests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} onPress={() => setSelectedQuest(quest)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <QuestDetailModal
        quest={selectedQuestView}
        onClose={() => setSelectedQuest(null)}
        onCompleteQuest={(quest, completionCode) =>
          onQuestCompleted?.(quest.id, completionCode) ??
          Promise.resolve({ error: 'Quest completion is not available right now.', success: false })
        }
      />
    </View>
  );
}

function QuestCard({ onPress, quest }: { onPress: () => void; quest: Quest }) {
  const layout = useResponsiveLayout();
  const totalStops = quest.stops.length;
  const progressPercent =
    totalStops > 0 ? Math.round((quest.completedStops / totalStops) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-primary/10 bg-surface active:opacity-90"
      style={CardStyles.elevated}
    >
      <View className="bg-gray-200" style={{ height: layout.isSmallPhone ? 126 : 142 }}>
        <BrandImage
          source={getQuestImageSource(quest.image, quest.imageUrl)}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
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
          <Text className="text-[13px] font-extrabold text-primary">+{quest.totalXp} XP</Text>
          <Text className="text-[12px] font-semibold text-muted">
            {quest.completedStops} of {totalStops} stops completed
          </Text>
        </View>

        <View className="h-2 overflow-hidden rounded-full bg-primary/10">
          <View
            className="h-full rounded-full bg-success"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      </View>
    </Pressable>
  );
}

function QuestDetailModal({
  onClose,
  onCompleteQuest,
  quest,
}: {
  onClose: () => void;
  onCompleteQuest: (
    quest: Quest,
    completionCode: string,
  ) => Promise<{ error?: string; success: boolean }>;
  quest: Quest | null;
}) {
  const { width } = useWindowDimensions();
  const stableTopInset = useStableTopInset();
  const translateX = useSharedValue(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

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

  function openCompletionScanner() {
    setScanLocked(false);
    setScanMessage(null);
    setScannerOpen(true);
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanLocked || !quest) return;

    const completionCode = result.data.trim();
    if (!completionCode) {
      setScanMessage('This QR code could not be read. Try again.');
      return;
    }

    setScanLocked(true);
    setCompleting(true);
    const completionResult = await onCompleteQuest(quest, completionCode);
    setCompleting(false);
    if (completionResult.success) {
      setScannerOpen(false);
      setScanMessage(null);
      return;
    }

    setScanMessage(completionResult.error ?? 'This QR code does not complete this quest.');
    setTimeout(() => setScanLocked(false), 1400);
  }

  if (!quest) return null;
  const questCompleted = quest.stops.length > 0 && quest.completedStops >= quest.stops.length;
  const questHasStops = quest.stops.length > 0;

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <ScrollView
            className="flex-1 bg-white"
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="relative h-[270px] bg-gray-200">
              <BrandImage
                source={getQuestImageSource(quest.image, quest.imageUrl)}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
                withTextGradient
              />
              <View
                className="absolute left-0 right-0 top-0 px-5"
                style={{ paddingTop: stableTopInset + 8 }}
              >
                <Pressable
                  onPress={closeWithAnimation}
                  className="h-10 w-10 items-center justify-center rounded-full bg-black/30 active:opacity-80"
                >
                  <ArrowLeft size={21} color="white" strokeWidth={2.6} />
                </Pressable>
              </View>
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
                <Text className="text-[15px] font-extrabold text-primary">
                  {quest.totalXp} XP total
                </Text>
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

              <Pressable
                disabled={questCompleted || !questHasStops}
                onPress={openCompletionScanner}
                className={`mt-2 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl ${
                  questCompleted || !questHasStops ? 'bg-gray-200' : 'bg-primary active:opacity-85'
                }`}
              >
                {questCompleted && (
                  <BadgeCheck size={19} color={Colors.light.textSecondary} strokeWidth={2.4} />
                )}
                <Text
                  className={`font-ui text-[15px] font-extrabold ${
                    questCompleted ? 'text-muted' : 'text-white'
                  }`}
                >
                  {questCompleted
                    ? 'Quest completed'
                    : questHasStops
                      ? `Scan finish QR +${quest.totalXp} XP`
                      : 'Stops coming soon'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <Modal
            animationType="slide"
            onRequestClose={() => setScannerOpen(false)}
            visible={scannerOpen}
          >
            <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
              <View className="flex-row items-center justify-between px-5 py-4">
                <Text className="text-[18px] font-extrabold text-white">Scan finish QR</Text>
                <Pressable
                  onPress={() => setScannerOpen(false)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
                >
                  <X size={20} color="white" />
                </Pressable>
              </View>

              {!permission ? (
                <View className="flex-1 items-center justify-center px-6">
                  <Text className="text-center text-[14px] text-white/80">Loading camera...</Text>
                </View>
              ) : !permission.granted ? (
                <View className="flex-1 items-center justify-center px-6">
                  <Text className="mb-4 text-center text-[15px] leading-5 text-white">
                    Camera access is needed to scan the finish QR code.
                  </Text>
                  <Pressable
                    onPress={requestPermission}
                    className="h-12 items-center justify-center rounded-xl bg-white px-5"
                  >
                    <Text className="text-[14px] font-bold text-ink">Allow camera access</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="flex-1">
                  <CameraView
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
                    style={{ flex: 1 }}
                  />
                  <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-5 py-5">
                    <Text className="text-center text-[14px] font-semibold text-white">
                      {completing
                        ? 'Completing your quest...'
                        : 'Scan the official QR code at the final trail stop.'}
                    </Text>
                    {scanMessage && (
                      <Text className="mt-3 text-center text-[13px] font-semibold text-destructive">
                        {scanMessage}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </SafeAreaView>
          </Modal>
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
            <LockKeyhole size={20} color={Colors.light.disabledIcon} strokeWidth={2.4} />
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
            <Clock3 size={13} color={Colors.light.textSecondary} />
            <Text className="text-[12px] font-medium text-muted">{stop.eta}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <MapPin size={13} color={Colors.light.textSecondary} />
            <Text className="text-[12px] font-medium text-muted">
              {stop.completed ? 'Completed' : 'Upcoming'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function applyCompletedQuestState(quests: Quest[], completedQuestIds: string[]) {
  return quests.map((quest) => {
    if (!completedQuestIds.includes(quest.id)) return quest;

    return {
      ...quest,
      completedStops: quest.stops.length,
      stops: quest.stops.map((stop) => ({ ...stop, completed: true })),
    };
  });
}

function getQuestImageSource(image: Quest['image'], imageUrl?: string) {
  if (imageUrl) {
    return { uri: imageUrl };
  }

  if (image === 'cafe') {
    return require('@/assets/images/culture/venue-cafe.jpg');
  }
  if (image === 'theater') {
    return require('@/assets/images/culture/venue-theater.jpg');
  }

  return require('@/assets/images/culture/venue-museum.jpg');
}
