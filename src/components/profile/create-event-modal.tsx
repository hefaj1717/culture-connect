import {
  ArrowLeft,
  CalendarPlus,
  Camera,
  Clapperboard,
  Drama,
  MapPin,
  Music,
  Palette,
  PartyPopper,
  Search,
} from 'lucide-react-native';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type ViewStyle,
  type ScrollViewInstance,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandImage } from '@/components/brand-image';
import { ScreenHeader } from '@/components/screen-header';
import { ChoicePill, type ChoiceIcon } from '@/components/profile/choice-pill';
import {
  DatePickerModal,
  TimePickerModal,
  formatEventDate,
  formatTimeUnit,
} from '@/components/profile/date-time-pickers';
import {
  type CityId,
  type EventCategory,
  defaultEventXp,
  eventCategories,
  eventCategoryLabels,
  getCultureCityData,
} from '@/data/culture';
import { textLimits } from '@/constants/text-limits';
import {
  hasGooglePlacesApiKey,
  type PlaceSearchError,
  type PlaceSuggestion,
} from '@/lib/place-search';
import { Text, TextInput } from '@/components/ui/text';
import { Colors } from '@/constants/theme';

type CreateEventModalProps = {
  calendarMonth: Date;
  cityId: CityId;
  createEventError: string | null;
  creatingEvent: boolean;
  datePickerOpen: boolean;
  datePickerTarget: 'end' | 'start';
  eventCategory: EventCategory;
  eventDate: string;
  eventDateValue: Date | null;
  eventEndDate: string;
  eventEndDateValue: Date | null;
  eventDescription: string;
  eventUpdateMessage: string;
  eventEndTime: string;
  eventImageUri: string | null;
  eventIsFree: boolean;
  eventTime: string;
  eventTitle: string;
  gesture: GestureType;
  isEditingEvent?: boolean;
  onChangeCalendarMonth: (date: Date) => void;
  onChangeEventCategory: (category: EventCategory) => void;
  onChangeEventDescription: (value: string) => void;
  onChangeEventUpdateMessage: (value: string) => void;
  onChangeEventEndTime: (value: string) => void;
  onChangeEventIsFree: (value: boolean) => void;
  onChangeEventTime: (value: string) => void;
  onChangeEventTitle: (value: string) => void;
  onChangePlaceQuery: (value: string) => void;
  onChangeSelectedEndHour: (value: number) => void;
  onChangeSelectedEndMinute: (value: number) => void;
  onChangeSelectedHour: (value: number) => void;
  onChangeSelectedMinute: (value: number) => void;
  onClose: () => void;
  onCloseDatePicker: () => void;
  onCloseTimePicker: () => void;
  onOpenDatePicker: () => void;
  onOpenEndDatePicker: () => void;
  onOpenTimePicker: (target: 'end' | 'start') => void;
  onPickEventImage: () => void;
  onRemoveEventImage: () => void;
  onRetryPlaceSearch: () => void;
  onSelectDate: (value: string) => void;
  onSelectDateValue: (value: Date) => void;
  onSelectEndDate: (value: string) => void;
  onSelectEndDateValue: (value: Date) => void;
  onSelectPlace: (place: PlaceSuggestion) => void;
  onSubmit: () => void;
  placeQuery: string;
  placeSearchError: PlaceSearchError | null;
  placeSuggestions: PlaceSuggestion[];
  searchingPlaces: boolean;
  selectedEndHour: number;
  selectedEndMinute: number;
  selectedHour: number;
  selectedMinute: number;
  selectedPlace: PlaceSuggestion | null;
  setSelectedPlace: (place: PlaceSuggestion | null) => void;
  stableModalTopInset: number;
  swipeStyle: AnimatedStyle<ViewStyle>;
  timePickerOpen: boolean;
  timePickerTarget: 'end' | 'start';
  visible: boolean;
};

export function CreateEventModal({
  calendarMonth,
  cityId,
  createEventError,
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
  gesture,
  isEditingEvent = false,
  onChangeCalendarMonth,
  onChangeEventCategory,
  onChangeEventDescription,
  onChangeEventUpdateMessage,
  onChangeEventEndTime,
  onChangeEventIsFree,
  onChangeEventTime,
  onChangeEventTitle,
  onChangePlaceQuery,
  onChangeSelectedEndHour,
  onChangeSelectedEndMinute,
  onChangeSelectedHour,
  onChangeSelectedMinute,
  onClose,
  onCloseDatePicker,
  onCloseTimePicker,
  onOpenDatePicker,
  onOpenEndDatePicker,
  onOpenTimePicker,
  onPickEventImage,
  onRemoveEventImage,
  onRetryPlaceSearch,
  onSelectDate,
  onSelectDateValue,
  onSelectEndDate,
  onSelectEndDateValue,
  onSelectPlace,
  onSubmit,
  placeQuery,
  placeSearchError,
  placeSuggestions,
  searchingPlaces,
  selectedEndHour,
  selectedEndMinute,
  selectedHour,
  selectedMinute,
  selectedPlace,
  setSelectedPlace,
  stableModalTopInset,
  swipeStyle,
  timePickerOpen,
  timePickerTarget,
  visible,
}: CreateEventModalProps) {
  const cityData = getCultureCityData(cityId);
  const scrollViewRef = useRef<ScrollViewInstance>(null);

  function focusFormArea(y: number) {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ animated: true, y });
    }, 90);
  }

  function openDatePicker() {
    Keyboard.dismiss();
    onOpenDatePicker();
  }

  function openTimePicker(target: 'end' | 'start') {
    Keyboard.dismiss();
    onOpenTimePicker(target);
  }

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          className="flex-1 bg-canvas"
          // An edit is opened after another native modal closes. Keep it at
          // its resting position instead of inheriting a stale swipe offset
          // from the previously dismissed create sheet.
          style={isEditingEvent ? undefined : swipeStyle}
        >
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
                  paddingBottom: 170,
                  paddingTop: stableModalTopInset + 14,
                }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={{ bottom: 170 }}
              >
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                  }}
                  className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-subtle active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close create event"
                >
                  <ArrowLeft size={21} color={Colors.light.textSecondary} strokeWidth={2.6} />
                </Pressable>

                {!isEditingEvent && (
                  <ScreenHeader
                    subtitle="Submit a verified city experience for CultureQuest review."
                    title="Create event"
                  />
                )}

                <Text className="mb-2 text-footnote font-inter-semibold text-ink">Event title</Text>
                <TextInput
                  value={eventTitle}
                  onChangeText={onChangeEventTitle}
                  onFocus={() => focusFormArea(110)}
                  placeholder="e.g. Student Jazz Night"
                  placeholderTextColor={Colors.light.inputPlaceholder}
                  maxLength={textLimits.eventTitle}
                  className="mb-4 rounded-xl border border-line px-4 py-3 text-body text-ink"
                />

                <Text className="mb-2 text-footnote font-inter-semibold text-ink">Event photo</Text>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onPickEventImage();
                  }}
                  className={`mb-4 overflow-hidden rounded-2xl border active:opacity-85 ${
                    eventImageUri ? 'border-line bg-subtle' : 'border-primary/40 bg-primary/5'
                  }`}
                  style={!eventImageUri ? { borderStyle: 'dashed' } : undefined}
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
                      <View className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-primary/15">
                        <Camera size={20} color={Colors.light.textSecondary} strokeWidth={2.4} />
                      </View>
                      <Text className="text-center text-body font-inter-semibold text-primary">
                        Add event photo
                      </Text>
                      <Text className="mt-1 text-center text-caption leading-4 text-muted">
                        Optional. If you skip it, CultureQuest will use a default event image.
                      </Text>
                    </View>
                  )}
                </Pressable>

                {eventImageUri && (
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      onRemoveEventImage();
                    }}
                    className="mb-4 h-10 items-center justify-center rounded-xl border border-line active:opacity-80"
                  >
                    <Text className="text-footnote font-inter-semibold text-muted">Remove photo</Text>
                  </Pressable>
                )}

                <Text className="mb-2 text-footnote font-inter-semibold text-ink">Place or address</Text>
                <View className="mb-4">
                  <View className="h-12 flex-row items-center gap-3 rounded-xl border border-line px-4">
                    <Search size={16} color={Colors.light.textSecondary} strokeWidth={2.4} />
                    <TextInput
                      value={placeQuery}
                      onChangeText={(value) => {
                        onChangePlaceQuery(value);
                        setSelectedPlace(null);
                      }}
                      onFocus={() => focusFormArea(330)}
                      placeholder={`Search places in ${cityData.name}`}
                      placeholderTextColor={Colors.light.inputPlaceholder}
                      maxLength={textLimits.placeSearch}
                      className="flex-1 text-body text-ink"
                    />
                    {searchingPlaces && <ActivityIndicator color={Colors.light.textSecondary} size="small" />}
                  </View>
                  <Text className="mt-2 text-caption leading-4 text-muted">
                    {hasGooglePlacesApiKey
                      ? 'Powered by Google Places suggestions.'
                      : 'Google Places key is missing, so place suggestions are unavailable.'}
                  </Text>

                  {placeSearchError ? (
                    <View className="mt-2 flex-row items-center gap-3 rounded-xl bg-accent/10 px-3 py-2.5">
                      <Text className="min-w-0 flex-1 text-caption leading-4 text-ink">
                        {placeSearchError.message}
                      </Text>
                      <Pressable
                        onPress={onRetryPlaceSearch}
                        className="rounded-xl bg-accent px-2.5 py-1.5 active:opacity-75"
                        accessibilityLabel="Retry place search"
                      >
                        <Text className="text-caption font-inter-semibold text-white">Retry</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {selectedPlace && (
                    <View className="mt-2 flex-row gap-3 rounded-xl border border-primary/25 bg-primary/10 p-3">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                        <MapPin size={16} color={Colors.light.textSecondary} strokeWidth={2.4} />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-footnote font-inter-semibold text-ink" numberOfLines={1}>
                          {selectedPlace.name}
                        </Text>
                        <Text className="text-caption leading-4 text-muted" numberOfLines={2}>
                          {selectedPlace.address}
                        </Text>
                      </View>
                    </View>
                  )}

                  {placeSuggestions.length > 0 && (
                    <View className="mt-2 overflow-hidden rounded-xl border border-line bg-white">
                      {placeSuggestions.map((place) => (
                        <Pressable
                          key={`${place.source}-${place.id}`}
                          onPress={() => {
                            Keyboard.dismiss();
                            onSelectPlace(place);
                          }}
                          className="flex-row items-start gap-3 border-b border-line p-3 active:bg-subtle"
                        >
                          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <MapPin size={16} color={Colors.light.textSecondary} strokeWidth={2.4} />
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text
                              className="text-footnote font-inter-semibold text-ink"
                              numberOfLines={1}
                            >
                              {place.name}
                            </Text>
                            <Text className="text-caption leading-4 text-muted" numberOfLines={2}>
                              {place.address}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <Text className="mb-2 text-footnote font-inter-semibold text-ink">Category</Text>
                <View className="mb-4 flex-row flex-wrap gap-2">
                  {eventCategories.map((category) => (
                    <ChoicePill
                      active={eventCategory === category}
                      icon={getEventCategoryIcon(category)}
                      key={category}
                      label={eventCategoryLabels[category]}
                      onPress={() => {
                        Keyboard.dismiss();
                        onChangeEventCategory(category);
                      }}
                    />
                  ))}
                </View>

                <View className="mb-4 gap-3">
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="mb-2 text-footnote font-inter-semibold text-ink">Starts on</Text>
                      <Pressable onPress={openDatePicker} className="h-12 justify-center rounded-xl border border-line px-4 active:opacity-80">
                        <Text className={`text-body ${eventDate ? 'text-ink' : 'text-muted'}`}>{eventDate || 'Choose date'}</Text>
                      </Pressable>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-footnote font-inter-semibold text-ink">Ends on</Text>
                      <Pressable onPress={onOpenEndDatePicker} className="h-12 justify-center rounded-xl border border-line px-4 active:opacity-80">
                        <Text className={`text-body ${eventEndDate || eventDate ? 'text-ink' : 'text-muted'}`}>{eventEndDate || eventDate || 'Choose date'}</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className="mb-2 text-footnote font-inter-semibold text-ink">Starts</Text>
                      <Pressable
                        onPress={() => openTimePicker('start')}
                        className="h-12 justify-center rounded-xl border border-line px-4 active:opacity-80"
                      >
                        <Text className={`text-body ${eventTime ? 'text-ink' : 'text-muted'}`}>
                          {eventTime || 'Start time'}
                        </Text>
                      </Pressable>
                    </View>
                    <View className="flex-1">
                      <Text className="mb-2 text-footnote font-inter-semibold text-ink">Ends</Text>
                      <Pressable
                        onPress={() => openTimePicker('end')}
                        className="h-12 justify-center rounded-xl border border-line px-4 active:opacity-80"
                      >
                        <Text className={`text-body ${eventEndTime ? 'text-ink' : 'text-muted'}`}>
                          {eventEndTime || 'End time'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {eventDateValue && eventEndDateValue && eventTime && eventEndTime && (
                  <View className="mb-4 rounded-2xl bg-canvas px-3 py-2.5">
                    <Text className="text-caption font-inter-semibold leading-4 text-muted">
                      QR check-in works from {eventDate} {eventTime} until {eventEndDate || eventDate} {eventEndTime}.
                    </Text>
                  </View>
                )}

                <Text className="mb-2 text-footnote font-inter-semibold text-ink">Price</Text>
                <View className="mb-3 flex-row gap-2">
                  <ChoicePill
                    active={eventIsFree}
                    label="Free"
                    onPress={() => {
                      Keyboard.dismiss();
                      onChangeEventIsFree(true);
                    }}
                  />
                  <ChoicePill
                    active={!eventIsFree}
                    label="Paid"
                    onPress={() => {
                      Keyboard.dismiss();
                      onChangeEventIsFree(false);
                    }}
                  />
                </View>
                <View className="mb-4 rounded-2xl bg-primary/5 px-3 py-2.5">
                  <Text className="flex-1 text-caption font-inter-semibold leading-4 text-muted">
                    Attendees earn {defaultEventXp} XP and 5 CultureQuest Credits for this event.
                  </Text>
                </View>

                <Text className="mb-2 text-footnote font-inter-semibold text-ink">Description</Text>
                <TextInput
                  value={eventDescription}
                  onChangeText={onChangeEventDescription}
                  onFocus={() => focusFormArea(680)}
                  placeholder="What should students know before joining?"
                  placeholderTextColor={Colors.light.inputPlaceholder}
                  multiline
                  textAlignVertical="top"
                  maxLength={textLimits.eventDescription}
                  className="mb-4 min-h-[112px] rounded-xl border border-line px-4 py-3 text-body leading-5 text-ink"
                />
                <Text className="-mt-3 mb-4 text-right text-caption text-muted">
                  {eventDescription.length}/{textLimits.eventDescription}
                </Text>

                {isEditingEvent && (
                  <View className="mb-4 rounded-xl bg-primary/5 p-3">
                    <Text className="text-footnote font-inter-semibold text-ink">Note for attendees (optional)</Text>
                    <Text className="mt-1 text-caption leading-4 text-muted">
                      This is sent to people who saved the event only after CultureQuest approves the update.
                    </Text>
                    <TextInput
                      value={eventUpdateMessage}
                      onChangeText={onChangeEventUpdateMessage}
                      placeholder="For example: the time changed because the venue opens later."
                      placeholderTextColor={Colors.light.inputPlaceholder}
                      multiline
                      maxLength={textLimits.organizerNote}
                      className="mt-3 min-h-[76px] rounded-xl border border-line bg-white px-3 py-2 text-body leading-5 text-ink"
                    />
                    <Text className="mt-1 text-right text-caption text-muted">
                      {eventUpdateMessage.length}/{textLimits.organizerNote}
                    </Text>
                  </View>
                )}

                {createEventError && (
                  <Text className="mb-4 text-footnote font-inter-medium text-destructive">
                    {createEventError}
                  </Text>
                )}

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onSubmit();
                  }}
                  disabled={creatingEvent}
                  className="h-[52px] items-center justify-center rounded-xl bg-action active:opacity-85 disabled:opacity-60"
                >
                  {creatingEvent ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-body font-inter-semibold text-white">
                      {isEditingEvent ? 'Submit changes' : 'Submit for review'}
                    </Text>
                  )}
                </Pressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
          <DatePickerModal
            month={calendarMonth}
            onChangeMonth={onChangeCalendarMonth}
            onClose={onCloseDatePicker}
            onSelectDate={(date) => {
              if (datePickerTarget === 'start') {
                onSelectDate(formatEventDate(date));
                onSelectDateValue(date);
                if (!eventEndDateValue || eventEndDateValue < date) {
                  onSelectEndDate(formatEventDate(date));
                  onSelectEndDateValue(date);
                }
              } else {
                onSelectEndDate(formatEventDate(date));
                onSelectEndDateValue(date);
              }
              onCloseDatePicker();
            }}
            visible={datePickerOpen}
          />

          <TimePickerModal
            hour={timePickerTarget === 'start' ? selectedHour : selectedEndHour}
            minute={timePickerTarget === 'start' ? selectedMinute : selectedEndMinute}
            onChangeHour={
              timePickerTarget === 'start' ? onChangeSelectedHour : onChangeSelectedEndHour
            }
            onChangeMinute={
              timePickerTarget === 'start' ? onChangeSelectedMinute : onChangeSelectedEndMinute
            }
            onClose={onCloseTimePicker}
            onConfirm={() => {
              const hour = timePickerTarget === 'start' ? selectedHour : selectedEndHour;
              const minute = timePickerTarget === 'start' ? selectedMinute : selectedEndMinute;
              const nextTime = `${formatTimeUnit(hour)}:${formatTimeUnit(minute)}`;
              if (timePickerTarget === 'start') {
                onChangeEventTime(nextTime);
              } else {
                onChangeEventEndTime(nextTime);
              }
              onCloseTimePicker();
            }}
            visible={timePickerOpen}
          />
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function getEventCategoryIcon(category: EventCategory): ChoiceIcon {
  switch (category) {
    case 'exhibition':
      return Palette;
    case 'performance':
      return Drama;
    case 'screening':
      return Clapperboard;
    case 'workshop':
      return CalendarPlus;
    case 'party':
      return PartyPopper;
    case 'concert':
      return Music;
    default:
      return CalendarPlus;
  }
}
