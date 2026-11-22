import { ArrowLeft, MapPin, Search } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandImage } from '@/components/brand-image';
import { ScreenHeader } from '@/components/screen-header';
import {
  DatePickerModal,
  TimePickerModal,
  formatEventDate,
  formatTimeUnit,
  startOfMonth,
} from '@/components/profile/date-time-pickers';
import { textLimits } from '@/constants/text-limits';
import { type CityId, getCultureCityData } from '@/data/culture';
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import {
  hasGooglePlacesApiKey,
  type PlaceSearchError,
  type PlaceSuggestion,
} from '@/lib/place-search';
import { type RewardAvailabilityInput } from '@/lib/reward-availability';

type CreateRewardModalProps = {
  createRewardError: string | null;
  creatingReward: boolean;
  isEditingReward?: boolean;
  onChangeRewardDescription: (value: string) => void;
  onChangeRewardUpdateMessage: (value: string) => void;
  onChangeRewardPlaceQuery: (value: string) => void;
  onChangeRewardTitle: (value: string) => void;
  onChangeRewardQc: (value: string) => void;
  onChangeRewardAvailableEndTime: (value: string) => void;
  onChangeRewardAvailableFrom: (value: string) => void;
  onChangeRewardAvailableStartTime: (value: string) => void;
  onChangeRewardAvailableUntil: (value: string) => void;
  onClose: () => void;
  onRetryRewardPlaceSearch: () => void;
  onSelectRewardPlace: (place: PlaceSuggestion) => void;
  onSubmit: () => void;
  rewardAvailability: RewardAvailabilityInput;
  rewardDescription: string;
  rewardUpdateMessage: string;
  rewardPlaceQuery: string;
  rewardPlaceSearchError: PlaceSearchError | null;
  rewardPlaceSuggestions: PlaceSuggestion[];
  rewardTitle: string;
  rewardQc: string;
  organizerAvatarUrl?: string | null;
  organizerInitials: string;
  organizerName: string;
  savedCityId: CityId;
  searchingRewardPlaces: boolean;
  selectedRewardPlace: PlaceSuggestion | null;
  setSelectedRewardPlace: (place: PlaceSuggestion | null) => void;
  stableModalTopInset: number;
  visible: boolean;
};

export function CreateRewardModal({
  createRewardError,
  creatingReward,
  isEditingReward = false,
  onChangeRewardDescription,
  onChangeRewardUpdateMessage,
  onChangeRewardAvailableEndTime,
  onChangeRewardAvailableFrom,
  onChangeRewardAvailableStartTime,
  onChangeRewardAvailableUntil,
  onChangeRewardPlaceQuery,
  onChangeRewardTitle,
  onChangeRewardQc,
  onClose,
  onRetryRewardPlaceSearch,
  onSelectRewardPlace,
  onSubmit,
  organizerAvatarUrl,
  organizerInitials,
  organizerName,
  rewardDescription,
  rewardUpdateMessage,
  rewardAvailability,
  rewardPlaceQuery,
  rewardPlaceSearchError,
  rewardPlaceSuggestions,
  rewardTitle,
  rewardQc,
  savedCityId,
  searchingRewardPlaces,
  selectedRewardPlace,
  setSelectedRewardPlace,
  stableModalTopInset,
  visible,
}: CreateRewardModalProps) {
  const cityData = getCultureCityData(savedCityId);
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'from' | 'until'>('from');
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'end' | 'start'>('start');
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const {
    closeWithAnimation,
    gesture: swipeGesture,
    swipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => {
      Keyboard.dismiss();
      onClose();
    },
    visible,
  });

  function focusFormArea(y: number) {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ animated: true, y });
    }, 90);
  }

  function openDatePicker(target: 'from' | 'until') {
    Keyboard.dismiss();
    const selectedDate =
      parseRewardDate(
        target === 'from' ? rewardAvailability.availableFrom : rewardAvailability.availableUntil,
      ) ?? new Date();
    setCalendarMonth(startOfMonth(selectedDate));
    setDatePickerTarget(target);
    setDatePickerOpen(true);
  }

  function openTimePicker(target: 'end' | 'start') {
    Keyboard.dismiss();
    const selectedTime =
      target === 'start'
        ? rewardAvailability.availableStartTime
        : rewardAvailability.availableEndTime;
    const [hour, minute] = parseRewardTime(selectedTime);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setTimePickerTarget(target);
    setTimePickerOpen(true);
  }

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View className="flex-1 bg-canvas" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className="flex-1"
            >
              <ScrollView
                ref={scrollViewRef}
                className="flex-1"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 90,
                  paddingTop: stableModalTopInset + 14,
                }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={{ bottom: 90 }}
              >
                <Pressable
                  onPress={closeWithAnimation}
                  className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close create reward"
                >
                  <ArrowLeft size={21} color="#6B818C" strokeWidth={2.6} />
                </Pressable>

                <ScreenHeader
                  subtitle={
                    isEditingReward
                      ? 'Changes are sent to CultureQuest for approval before students see them.'
                      : 'Set how many CultureQuest Credits students need to unlock this reward. XP remains permanent progress.'
                  }
                  title={isEditingReward ? 'Edit reward' : 'Create reward'}
                />

                <View className="mb-5 rounded-[26px] border border-primary/10 bg-canvas p-4">
                  <View className="flex-row items-center gap-3">
                    <View className="h-16 w-16 overflow-hidden rounded-2xl bg-ink/10">
                      {organizerAvatarUrl ? (
                        <BrandImage
                          className="h-full w-full"
                          contentFit="cover"
                          source={{ uri: organizerAvatarUrl }}
                          withTextGradient={false}
                        />
                      ) : (
                        <View className="h-full w-full items-center justify-center bg-ink">
                          <Text className="font-ui text-[20px] font-extrabold text-white">
                            {organizerInitials}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text className="text-[10px] font-extrabold uppercase tracking-wide text-muted">
                        Reward preview
                      </Text>
                      <Text
                        className="mt-1 font-ui text-[15px] font-extrabold text-ink"
                        numberOfLines={1}
                      >
                        {selectedRewardPlace?.name || organizerName}
                      </Text>
                      <Text
                        className="mt-0.5 text-[12px] font-medium leading-4 text-muted"
                        numberOfLines={2}
                      >
                        {rewardTitle.trim() || 'Your reward title will appear here.'}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text className="mb-2 text-[13px] font-semibold text-ink">Reward title</Text>
                <TextInput
                  value={rewardTitle}
                  onChangeText={onChangeRewardTitle}
                  onFocus={() => focusFormArea(150)}
                  placeholder="e.g. Free espresso after check-in"
                  placeholderTextColor="#8B909A"
                  maxLength={textLimits.rewardTitle}
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />

                <Text className="mb-2 text-[13px] font-semibold text-ink">Reward place</Text>
                <View className="mb-4">
                  <View className="h-12 flex-row items-center gap-3 rounded-xl border border-gray-300 px-4">
                    <Search size={16} color="#6B818C" strokeWidth={2.4} />
                    <TextInput
                      value={rewardPlaceQuery}
                      onChangeText={(value) => {
                        onChangeRewardPlaceQuery(value);
                        setSelectedRewardPlace(null);
                      }}
                      onFocus={() => focusFormArea(260)}
                      placeholder={`Search places in ${cityData.name}`}
                      placeholderTextColor="#8B909A"
                      maxLength={textLimits.placeSearch}
                      className="flex-1 text-[15px] text-ink"
                    />
                    {searchingRewardPlaces && <ActivityIndicator color="#6B818C" size="small" />}
                  </View>
                  <Text className="mt-2 text-[11px] leading-4 text-muted">
                    {hasGooglePlacesApiKey
                      ? 'Powered by Google Places suggestions.'
                      : 'Google Places key is missing, so place suggestions are unavailable.'}
                  </Text>

                  {rewardPlaceSearchError ? (
                    <View className="mt-2 flex-row items-center gap-3 rounded-xl bg-accent/10 px-3 py-2.5">
                      <Text className="min-w-0 flex-1 text-[11px] leading-4 text-ink">
                        {rewardPlaceSearchError.message}
                      </Text>
                      <Pressable
                        onPress={onRetryRewardPlaceSearch}
                        className="rounded-lg bg-accent px-2.5 py-1.5 active:opacity-75"
                        accessibilityLabel="Retry place search"
                      >
                        <Text className="text-[11px] font-bold text-white">Retry</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {selectedRewardPlace && (
                    <View className="mt-2 flex-row gap-3 rounded-xl border border-accent/25 bg-accent/10 p-3">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-accent/15">
                        <MapPin size={16} color="#6B818C" strokeWidth={2.4} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="font-ui text-[13px] font-bold text-ink" numberOfLines={1}>
                          {selectedRewardPlace.name}
                        </Text>
                        <Text className="text-[11px] leading-4 text-muted" numberOfLines={2}>
                          {selectedRewardPlace.address}
                        </Text>
                      </View>
                    </View>
                  )}

                  {rewardPlaceSuggestions.length > 0 && (
                    <View className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                      {rewardPlaceSuggestions.map((place) => (
                        <Pressable
                          key={`${place.source}-${place.id}`}
                          onPress={() => {
                            Keyboard.dismiss();
                            onSelectRewardPlace(place);
                          }}
                          className="flex-row items-start gap-3 border-b border-gray-100 p-3 active:bg-gray-50"
                        >
                          <View className="h-9 w-9 items-center justify-center rounded-full bg-accent/10">
                            <MapPin size={16} color="#6B818C" strokeWidth={2.4} />
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

                <Text className="mb-2 text-[13px] font-semibold text-ink">
                  CultureQuest Credits required to unlock
                </Text>
                <TextInput
                  value={rewardQc}
                  onChangeText={onChangeRewardQc}
                  onFocus={() => focusFormArea(420)}
                  keyboardType="number-pad"
                  placeholder="100"
                  placeholderTextColor="#8B909A"
                  maxLength={textLimits.rewardQc}
                  editable={!isEditingReward}
                  className={`mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink ${
                    isEditingReward ? 'bg-gray-100 text-muted' : ''
                  }`}
                />
                {isEditingReward && (
                  <Text className="-mt-3 mb-4 text-[11px] leading-4 text-muted">
                    Credit cost is kept unchanged while a reward is being reviewed.
                  </Text>
                )}

                <Text className="mb-2 text-[13px] font-semibold text-ink">Redeem availability</Text>
                <View className="mb-4 gap-3">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">From date</Text>
                      <Pressable
                        onPress={() => openDatePicker('from')}
                        className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                      >
                        <Text className="text-[15px] text-ink">
                          {formatRewardDateLabel(rewardAvailability.availableFrom)}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">Until date</Text>
                      <Pressable
                        onPress={() => openDatePicker('until')}
                        className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                      >
                        <Text className="text-[15px] text-ink">
                          {formatRewardDateLabel(rewardAvailability.availableUntil)}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">Starts</Text>
                      <Pressable
                        onPress={() => openTimePicker('start')}
                        className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                      >
                        <Text className="text-[15px] text-ink">
                          {rewardAvailability.availableStartTime}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-[13px] font-semibold text-ink">Ends</Text>
                      <Pressable
                        onPress={() => openTimePicker('end')}
                        className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                      >
                        <Text className="text-[15px] text-ink">
                          {rewardAvailability.availableEndTime}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <View className="rounded-2xl bg-canvas px-3 py-2.5">
                    <Text className="text-[12px] font-semibold leading-4 text-muted">
                      Reward can be redeemed from{' '}
                      {formatRewardDateLabel(rewardAvailability.availableFrom)} to{' '}
                      {formatRewardDateLabel(rewardAvailability.availableUntil)}, from{' '}
                      {rewardAvailability.availableStartTime} to{' '}
                      {rewardAvailability.availableEndTime}.
                    </Text>
                  </View>
                </View>

                <Text className="mb-2 text-[13px] font-semibold text-ink">Description</Text>
                <TextInput
                  value={rewardDescription}
                  onChangeText={onChangeRewardDescription}
                  onFocus={() => focusFormArea(490)}
                  placeholder="What does the student receive and how should staff verify it?"
                  placeholderTextColor="#8B909A"
                  multiline
                  textAlignVertical="top"
                  maxLength={textLimits.rewardDescription}
                  className="mb-4 min-h-[112px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-ink"
                />
                <Text className="-mt-3 mb-4 text-right text-[11px] text-muted">
                  {rewardDescription.length}/{textLimits.rewardDescription}
                </Text>

                {isEditingReward && (
                  <View className="mb-4 rounded-xl bg-primary/5 p-3">
                    <Text className="text-[13px] font-semibold text-ink">
                      Note for review (optional)
                    </Text>
                    <Text className="mt-1 text-[12px] leading-4 text-muted">
                      Tell CultureQuest why the reward changed. This note is included in the review
                      record.
                    </Text>
                    <TextInput
                      value={rewardUpdateMessage}
                      onChangeText={onChangeRewardUpdateMessage}
                      placeholder="For example: redemption hours changed for the new semester."
                      placeholderTextColor="#8B909A"
                      multiline
                      maxLength={textLimits.organizerNote}
                      className="mt-3 min-h-[76px] rounded-xl border border-primary/15 bg-white px-3 py-2 text-[14px] leading-5 text-ink"
                    />
                  </View>
                )}

                {createRewardError && (
                  <Text className="mb-4 text-[13px] font-medium text-destructive">
                    {createRewardError}
                  </Text>
                )}

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onSubmit();
                  }}
                  disabled={creatingReward}
                  className="h-[52px] items-center justify-center rounded-xl bg-accent active:opacity-85"
                >
                  {creatingReward ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-[15px] font-semibold text-white">
                      {isEditingReward ? 'Submit changes' : 'Submit for review'}
                    </Text>
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
              const nextDate = formatRewardDateInput(date);
              if (datePickerTarget === 'from') {
                onChangeRewardAvailableFrom(nextDate);
              } else {
                onChangeRewardAvailableUntil(nextDate);
              }
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
              const nextTime = `${formatTimeUnit(selectedHour)}:${formatTimeUnit(selectedMinute)}`;
              if (timePickerTarget === 'start') {
                onChangeRewardAvailableStartTime(nextTime);
              } else {
                onChangeRewardAvailableEndTime(nextTime);
              }
              setTimePickerOpen(false);
            }}
            visible={timePickerOpen}
          />
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function parseRewardDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRewardDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatRewardDateLabel(value: string) {
  const date = parseRewardDate(value);
  return date ? formatEventDate(date) : 'Choose date';
}

function parseRewardTime(value: string) {
  const [hourValue, minuteValue] = value.split(':');
  const hour = Number.parseInt(hourValue ?? '', 10);
  const minute = Number.parseInt(minuteValue ?? '', 10);
  return [
    Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 9,
    Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0,
  ] as const;
}
