import { LinearGradient } from 'expo-linear-gradient';
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
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef } from 'react';

import { BrandImage } from '@/components/brand-image';
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
  eventCategoryLabels,
  getCultureCityData,
} from '@/data/culture';
import { hasGooglePlacesApiKey, type PlaceSuggestion } from '@/lib/place-search';

type CreateEventModalProps = {
  calendarMonth: Date;
  cityId: CityId;
  createEventError: string | null;
  creatingEvent: boolean;
  datePickerOpen: boolean;
  eventCategory: EventCategory;
  eventDate: string;
  eventDescription: string;
  eventImageUri: string | null;
  eventIsFree: boolean;
  eventTime: string;
  eventTitle: string;
  gesture: GestureType;
  onChangeCalendarMonth: (date: Date) => void;
  onChangeEventCategory: (category: EventCategory) => void;
  onChangeEventDescription: (value: string) => void;
  onChangeEventIsFree: (value: boolean) => void;
  onChangeEventTime: (value: string) => void;
  onChangeEventTitle: (value: string) => void;
  onChangePlaceQuery: (value: string) => void;
  onChangeSelectedHour: (value: number) => void;
  onChangeSelectedMinute: (value: number) => void;
  onClose: () => void;
  onCloseDatePicker: () => void;
  onCloseTimePicker: () => void;
  onOpenDatePicker: () => void;
  onOpenTimePicker: () => void;
  onPickEventImage: () => void;
  onRemoveEventImage: () => void;
  onSelectDate: (value: string) => void;
  onSelectPlace: (place: PlaceSuggestion) => void;
  onSubmit: () => void;
  placeQuery: string;
  placeSuggestions: PlaceSuggestion[];
  searchingPlaces: boolean;
  selectedHour: number;
  selectedMinute: number;
  selectedPlace: PlaceSuggestion | null;
  setSelectedPlace: (place: PlaceSuggestion | null) => void;
  stableModalTopInset: number;
  swipeStyle: StyleProp<ViewStyle>;
  timePickerOpen: boolean;
  visible: boolean;
};

const eventCategories: EventCategory[] = [
  'exhibition',
  'performance',
  'screening',
  'workshop',
  'festival',
  'concert',
];

export function CreateEventModal({
  calendarMonth,
  cityId,
  createEventError,
  creatingEvent,
  datePickerOpen,
  eventCategory,
  eventDate,
  eventDescription,
  eventImageUri,
  eventIsFree,
  eventTime,
  eventTitle,
  gesture,
  onChangeCalendarMonth,
  onChangeEventCategory,
  onChangeEventDescription,
  onChangeEventIsFree,
  onChangeEventTime,
  onChangeEventTitle,
  onChangePlaceQuery,
  onChangeSelectedHour,
  onChangeSelectedMinute,
  onClose,
  onCloseDatePicker,
  onCloseTimePicker,
  onOpenDatePicker,
  onOpenTimePicker,
  onPickEventImage,
  onRemoveEventImage,
  onSelectDate,
  onSelectPlace,
  onSubmit,
  placeQuery,
  placeSuggestions,
  searchingPlaces,
  selectedHour,
  selectedMinute,
  selectedPlace,
  setSelectedPlace,
  stableModalTopInset,
  swipeStyle,
  timePickerOpen,
  visible,
}: CreateEventModalProps) {
  const cityData = getCultureCityData(cityId);
  const scrollViewRef = useRef<ScrollView>(null);

  function focusFormArea(y: number) {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ animated: true, y });
    }, 80);
  }

  function openDatePicker() {
    Keyboard.dismiss();
    onOpenDatePicker();
  }

  function openTimePicker() {
    Keyboard.dismiss();
    onOpenTimePicker();
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              className="flex-1"
            >
              <ScrollView
                ref={scrollViewRef}
                className="flex-1"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 120,
                  paddingTop: stableModalTopInset + 14,
                }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              >
                <Pressable
                  onPress={onClose}
                  className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Close create event"
                >
                  <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                </Pressable>

                <View className="mb-5 overflow-hidden rounded-3xl bg-ink">
                  <LinearGradient
                    colors={['rgba(124,58,237,0.74)', 'rgba(36,28,46,0.98)']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={{ padding: 20 }}
                  >
                    <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                      <CalendarPlus size={24} color="white" strokeWidth={2.4} />
                    </View>
                    <Text className="font-heading text-[29px] font-extrabold leading-[33px] text-white">
                      Create event
                    </Text>
                    <Text className="mt-2 max-w-[290px] text-[13px] leading-5 text-white/80">
                      Submit a verified city experience for CultureQuest review.
                    </Text>
                  </LinearGradient>
                </View>

                <Text className="mb-2 text-[13px] font-semibold text-ink">Event title</Text>
                <TextInput
                  value={eventTitle}
                  onChangeText={onChangeEventTitle}
                  onFocus={() => focusFormArea(150)}
                  placeholder="e.g. Student Jazz Night"
                  placeholderTextColor="#8B909A"
                  className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
                />

                <Text className="mb-2 text-[13px] font-semibold text-ink">Event photo</Text>
                <Pressable
                  onPress={onPickEventImage}
                  className={`mb-4 overflow-hidden rounded-2xl border active:opacity-85 ${
                    eventImageUri ? 'border-gray-200 bg-gray-100' : 'border-primary/40 bg-primary/5'
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
                        <Camera size={20} color="#7C3AED" strokeWidth={2.4} />
                      </View>
                      <Text className="text-center font-ui text-[14px] font-bold text-primary">
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
                    onPress={onRemoveEventImage}
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
                        onChangePlaceQuery(value);
                        setSelectedPlace(null);
                      }}
                      onFocus={() => focusFormArea(390)}
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
                        <Text className="font-ui text-[13px] font-bold text-ink" numberOfLines={1}>
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
                            Keyboard.dismiss();
                            onSelectPlace(place);
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
                      icon={getEventCategoryIcon(category)}
                      key={category}
                      label={eventCategoryLabels[category]}
                      onPress={() => onChangeEventCategory(category)}
                    />
                  ))}
                </View>

                <View className="mb-4 flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mb-2 text-[13px] font-semibold text-ink">Date</Text>
                    <Pressable
                      onPress={openDatePicker}
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
                      onPress={openTimePicker}
                      className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                    >
                      <Text className={`text-[15px] ${eventTime ? 'text-ink' : 'text-muted'}`}>
                        {eventTime || 'Choose time'}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Text className="mb-2 text-[13px] font-semibold text-ink">Price</Text>
                <View className="mb-3 flex-row gap-2">
                  <ChoicePill
                    active={eventIsFree}
                    label="Free"
                    onPress={() => onChangeEventIsFree(true)}
                  />
                  <ChoicePill
                    active={!eventIsFree}
                    label="Paid"
                    onPress={() => onChangeEventIsFree(false)}
                  />
                </View>
                <View className="mb-4 rounded-2xl bg-primary/5 px-3 py-2.5">
                  <Text className="flex-1 text-[12px] font-semibold leading-4 text-muted">
                    Attendees earn {defaultEventXp} XP for this event.
                  </Text>
                </View>

                <Text className="mb-2 text-[13px] font-semibold text-ink">Description</Text>
                <TextInput
                  value={eventDescription}
                  onChangeText={onChangeEventDescription}
                  onFocus={() => focusFormArea(820)}
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
                  onPress={onSubmit}
                  disabled={creatingEvent}
                  className="h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-85 disabled:opacity-60"
                >
                  {creatingEvent ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-[15px] font-semibold text-white">Submit for review</Text>
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
              onSelectDate(formatEventDate(date));
              onCloseDatePicker();
            }}
            visible={datePickerOpen}
          />

          <TimePickerModal
            hour={selectedHour}
            minute={selectedMinute}
            onChangeHour={onChangeSelectedHour}
            onChangeMinute={onChangeSelectedMinute}
            onClose={onCloseTimePicker}
            onConfirm={() => {
              onChangeEventTime(
                `${formatTimeUnit(selectedHour)}:${formatTimeUnit(selectedMinute)}`,
              );
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
    case 'festival':
      return PartyPopper;
    case 'concert':
      return Music;
    default:
      return CalendarPlus;
  }
}
