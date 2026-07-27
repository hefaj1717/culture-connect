import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { startOfMonth } from '@/components/profile/date-time-pickers';
import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId, type EventCategory, type EventLanguage } from '@/data/culture';
import { createOrganizerEvent } from '@/lib/organizer-events';
import { type PlaceSuggestion, searchPlaces } from '@/lib/place-search';

type UseCreateEventFormInput = {
  onEventCreated?: () => void;
  savedCityId: CityId;
  userId?: string;
};

export function useCreateEventForm({
  onEventCreated,
  savedCityId,
  userId,
}: UseCreateEventFormInput) {
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [eventCategory, setEventCategory] = useState<EventCategory>('workshop');
  const [eventDate, setEventDate] = useState('');
  const [eventDateValue, setEventDateValue] = useState<Date | null>(null);
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventImageUri, setEventImageUri] = useState<string | null>(null);
  const [eventIsFree, setEventIsFree] = useState(true);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'end' | 'start'>('start');
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedHour, setSelectedHour] = useState(19);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedEndHour, setSelectedEndHour] = useState(21);
  const [selectedEndMinute, setSelectedEndMinute] = useState(0);

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

  function resetEventForm() {
    setEventTitle('');
    setPlaceQuery('');
    setPlaceSuggestions([]);
    setSelectedPlace(null);
    setEventCategory('workshop');
    setEventDate('');
    setEventDateValue(null);
    setEventEndTime('');
    setEventTime('');
    setEventDescription('');
    setEventImageUri(null);
    setEventIsFree(true);
    setCreateEventError(null);
    setCalendarMonth(startOfMonth(new Date()));
    setSelectedHour(19);
    setSelectedMinute(0);
    setSelectedEndHour(21);
    setSelectedEndMinute(0);
    setTimePickerTarget('start');
    setDatePickerOpen(false);
    setTimePickerOpen(false);
  }

  function openCreateEvent() {
    resetEventForm();
    setCreateEventOpen(true);
  }

  function selectPlace(place: PlaceSuggestion) {
    setSelectedPlace(place);
    setPlaceQuery(place.name);
    setPlaceSuggestions([]);
  }

  function changeEventTitle(value: string) {
    setEventTitle(limitText(value, textLimits.eventTitle));
  }

  function changeEventDescription(value: string) {
    setEventDescription(limitText(value, textLimits.eventDescription));
  }

  function changePlaceQuery(value: string) {
    setPlaceQuery(limitText(value, textLimits.placeSearch));
  }

  async function submitEvent() {
    const normalizedTitle = limitText(eventTitle.trim(), textLimits.eventTitle);
    const normalizedDate = eventDate.trim();
    const normalizedEndTime = eventEndTime.trim();
    const normalizedTime = eventTime.trim();
    const normalizedDescription = limitText(eventDescription.trim(), textLimits.eventDescription);
    const startsAt = eventDateValue ? buildLocalEventDate(eventDateValue, normalizedTime) : null;
    const endsAt = eventDateValue ? buildLocalEventDate(eventDateValue, normalizedEndTime) : null;

    if (!userId) {
      setCreateEventError('Log in again before publishing an event.');
      return;
    }
    if (!selectedPlace) {
      setCreateEventError('Select a suggested place so attendance can be location-verified.');
      return;
    }
    if (
      !normalizedTitle ||
      !normalizedDate ||
      !normalizedTime ||
      !normalizedEndTime ||
      !normalizedDescription ||
      !startsAt ||
      !endsAt
    ) {
      setCreateEventError('Fill in title, date, start time, end time, and description.');
      return;
    }
    if (endsAt <= startsAt) {
      setCreateEventError('End time must be later than the start time.');
      return;
    }

    setCreateEventError(null);
    setCreatingEvent(true);
    const result = await createOrganizerEvent(userId, {
      cityId: savedCityId,
      place: selectedPlace,
      title: normalizedTitle,
      description: normalizedDescription,
      category: eventCategory,
      date: normalizedDate,
      endTime: normalizedEndTime,
      endsAt: endsAt.toISOString(),
      time: normalizedTime,
      startsAt: startsAt.toISOString(),
      language: getDefaultEventLanguage(savedCityId),
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
    Alert.alert('Event submitted', 'CultureQuest will review it before students can see it.');
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

  return {
    calendarMonth,
    createEventError,
    createEventOpen,
    creatingEvent,
    datePickerOpen,
    eventEndTime,
    eventCategory,
    eventDate,
    eventDateValue,
    eventDescription,
    eventImageUri,
    eventIsFree,
    eventTime,
    eventTitle,
    openCreateEvent,
    pickEventImage,
    placeQuery,
    placeSuggestions,
    resetEventForm,
    searchingPlaces,
    selectedHour,
    selectedMinute,
    selectedEndHour,
    selectedEndMinute,
    selectedPlace,
    selectPlace,
    setCalendarMonth,
    setCreateEventOpen,
    setDatePickerOpen,
    setEventCategory,
    setEventDate,
    setEventDateValue,
    setEventDescription: changeEventDescription,
    setEventEndTime,
    setEventImageUri,
    setEventIsFree,
    setEventTime,
    setEventTitle: changeEventTitle,
    setPlaceQuery: changePlaceQuery,
    setSelectedHour,
    setSelectedMinute,
    setSelectedEndHour,
    setSelectedEndMinute,
    setSelectedPlace,
    setTimePickerOpen,
    setTimePickerTarget,
    submitEvent,
    timePickerOpen,
    timePickerTarget,
  };
}

function getDefaultEventLanguage(cityId: CityId): EventLanguage {
  return cityId === 'lublin' ? 'pl' : 'en';
}

function buildLocalEventDate(date: Date, time: string) {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const nextDate = new Date(date);
  nextDate.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return nextDate;
}
