import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { startOfMonth } from '@/components/profile/date-time-pickers';
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
  const [eventTime, setEventTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventImageUri, setEventImageUri] = useState<string | null>(null);
  const [eventIsFree, setEventIsFree] = useState(true);
  const [createEventError, setCreateEventError] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedHour, setSelectedHour] = useState(19);
  const [selectedMinute, setSelectedMinute] = useState(0);

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
    setEventTime('');
    setEventDescription('');
    setEventImageUri(null);
    setEventIsFree(true);
    setCreateEventError(null);
    setCalendarMonth(startOfMonth(new Date()));
    setSelectedHour(19);
    setSelectedMinute(0);
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

  async function submitEvent() {
    const normalizedTitle = eventTitle.trim();
    const normalizedDate = eventDate.trim();
    const normalizedTime = eventTime.trim();
    const normalizedDescription = eventDescription.trim();

    if (!userId) {
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
    const result = await createOrganizerEvent(userId, {
      cityId: savedCityId,
      place: selectedPlace,
      title: normalizedTitle,
      description: normalizedDescription,
      category: eventCategory,
      date: normalizedDate,
      time: normalizedTime,
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

  return {
    calendarMonth,
    createEventError,
    createEventOpen,
    creatingEvent,
    datePickerOpen,
    eventCategory,
    eventDate,
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
    selectedPlace,
    selectPlace,
    setCalendarMonth,
    setCreateEventOpen,
    setDatePickerOpen,
    setEventCategory,
    setEventDate,
    setEventDescription,
    setEventImageUri,
    setEventIsFree,
    setEventTime,
    setEventTitle,
    setPlaceQuery,
    setSelectedHour,
    setSelectedMinute,
    setSelectedPlace,
    setTimePickerOpen,
    submitEvent,
    timePickerOpen,
  };
}

function getDefaultEventLanguage(cityId: CityId): EventLanguage {
  return cityId === 'lublin' ? 'pl' : 'en';
}
