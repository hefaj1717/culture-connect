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
import { textLimits } from '@/constants/text-limits';
import { hasGooglePlacesApiKey, type PlaceSuggestion } from '@/lib/place-search';

type CreateEventModalProps = {
  calendarMonth: Date;
  cityId: CityId;
  createEventError: string | null;
  creatingEvent: boolean;
  datePickerOpen: boolean;
  eventCategory: EventCategory;
  eventDate: string;
  eventDateValue: Date | null;
  eventDescription: string;
  eventEndTime: string;
  eventImageUri: string | null;
  eventIsFree: boolean;
  eventTime: string;
  eventTitle: string;
  edgeSwipeGesture: GestureType;
  isEditingEvent?: boolean;
  onChangeCalendarMonth: (date: Date) => void;
  onChangeEventCategory: (category: EventCategory) => void;
  onChangeEventDescription: (value: string) => void;
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
  onOpenTimePicker: (target: 'end' | 'start') => void;
  onPickEventImage: () => void;
  onRemoveEventImage: () => void;
  onSelectDate: (value: string) => void;
  onSelectDateValue: (value: Date) => void;
  onSelectPlace: (place: PlaceSuggestion) => void;
  onSubmit: () => void;
  placeQuery: string;
  placeSuggestions: PlaceSuggestion[];
  searchingPlaces: boolean;
  selectedEndHour: number;
  selectedEndMinute: number;
  selectedHour: number;
  selectedMinute: number;
  selectedPlace: PlaceSuggestion | null;
  setSelectedPlace: (place: PlaceSuggestion | null) => void;
  stableModalTopInset: number;
  swipeStyle: StyleProp<ViewStyle>;
  timePickerOpen: boolean;
  timePickerTarget: 'end' | 'start';
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
  eventDateValue,
  eventDescription,
  eventEndTime,
  eventImageUri,
  eventIsFree,
  eventTime,
  eventTitle,
  edgeSwipeGesture,
  isEditingEvent = false,
  onChangeCalendarMonth,
  onChangeEventCategory,
  onChangeEventDescription,
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
  onOpenTimePicker,
  onPickEventImage,
  onRemoveEventImage,
  onSelectDate,
  onSelectDateValue,
  onSelectPlace,
  onSubmit,
  placeQuery,
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
      <Animated.View className="flex-1 bg-white" style={swipeStyle}>
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 118,
                paddingTop: stableModalTopInset + 14,
              }}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="always"
              scrollIndicatorInsets={{ bottom: 118 }}
            >
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                className="mb-5 h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel="Close create event"
              >
                <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
              </Pressable>

              {!isEditingEvent && (
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
              )}

              <Text className="mb-2 text-[13px] font-semibold text-ink">Event title</Text>
              <TextInput
                value={eventTitle}
                onChangeText={onChangeEventTitle}
                placeholder="e.g. Student Jazz Night"
                placeholderTextColor="#8B909A"
                maxLength={textLimits.eventTitle}
                className="mb-4 rounded-xl border border-gray-300 px-4 py-3 text-[15px] text-ink"
              />

              <Text className="mb-2 text-[13px] font-semibold text-ink">Event photo</Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  onPickEventImage();
                }}
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
                  onPress={() => {
                    Keyboard.dismiss();
                    onRemoveEventImage();
                  }}
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
                    placeholder={`Search places in ${cityData.name}`}
                    placeholderTextColor="#8B909A"
                    maxLength={textLimits.placeSearch}
                    className="flex-1 text-[15px] text-ink"
                  />
                  {searchingPlaces && <ActivityIndicator color="#7C3AED" size="small" />}
                </View>
                <Text className="mt-2 text-[11px] leading-4 text-muted">
                  {hasGooglePlacesApiKey
                    ? 'Powered by Google Places suggestions.'
                    : 'Google Places key is missing, so place suggestions are unavailable.'}
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
                    onPress={() => {
                      Keyboard.dismiss();
                      onChangeEventCategory(category);
                    }}
                  />
                ))}
              </View>

              <View className="mb-4 gap-3">
                <View>
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
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mb-2 text-[13px] font-semibold text-ink">Starts</Text>
                    <Pressable
                      onPress={() => openTimePicker('start')}
                      className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                    >
                      <Text className={`text-[15px] ${eventTime ? 'text-ink' : 'text-muted'}`}>
                        {eventTime || 'Start time'}
                      </Text>
                    </Pressable>
                  </View>
                  <View className="flex-1">
                    <Text className="mb-2 text-[13px] font-semibold text-ink">Ends</Text>
                    <Pressable
                      onPress={() => openTimePicker('end')}
                      className="h-12 justify-center rounded-xl border border-gray-300 px-4 active:opacity-80"
                    >
                      <Text className={`text-[15px] ${eventEndTime ? 'text-ink' : 'text-muted'}`}>
                        {eventEndTime || 'End time'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {eventDateValue && eventTime && eventEndTime && (
                <View className="mb-4 rounded-2xl bg-canvas px-3 py-2.5">
                  <Text className="text-[12px] font-semibold leading-4 text-muted">
                    QR check-in works only on {eventDate}, from {eventTime} to {eventEndTime}.
                  </Text>
                </View>
              )}

              <Text className="mb-2 text-[13px] font-semibold text-ink">Price</Text>
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
                <Text className="flex-1 text-[12px] font-semibold leading-4 text-muted">
                  Attendees earn {defaultEventXp} XP for this event.
                </Text>
              </View>

              <Text className="mb-2 text-[13px] font-semibold text-ink">Description</Text>
              <TextInput
                value={eventDescription}
                onChangeText={onChangeEventDescription}
                placeholder="What should students know before joining?"
                placeholderTextColor="#8B909A"
                multiline
                textAlignVertical="top"
                maxLength={textLimits.eventDescription}
                className="mb-4 min-h-[112px] rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-5 text-ink"
              />
              <Text className="-mt-3 mb-4 text-right text-[11px] text-muted">
                {eventDescription.length}/{textLimits.eventDescription}
              </Text>

              {createEventError && (
                <Text className="mb-4 text-[13px] font-medium text-destructive">
                  {createEventError}
                </Text>
              )}

              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  onSubmit();
                }}
                disabled={creatingEvent}
                className="h-[52px] items-center justify-center rounded-xl bg-primary active:opacity-85 disabled:opacity-60"
              >
                {creatingEvent ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-[15px] font-semibold text-white">
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
            onSelectDate(formatEventDate(date));
            onSelectDateValue(date);
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
        <GestureDetector gesture={edgeSwipeGesture}>
          <Animated.View className="absolute bottom-0 left-0 top-0 z-50 w-7" />
        </GestureDetector>
      </Animated.View>
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
