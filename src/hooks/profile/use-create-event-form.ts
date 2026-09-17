import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { startOfMonth } from '@/components/profile/date-time-pickers';
import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId, type EventCategory, type EventLanguage } from '@/data/culture';
import {
  createOrganizerEvent,
  updateOrganizerEvent,
  type ManagedOrganizerEvent,
} from '@/lib/organizer-events';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { type PlaceSuggestion, searchPlaces } from '@/lib/place-search';
import { useNetworkStatus } from '@/providers/network-provider';

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
  const [editingEvent, setEditingEvent] = useState<ManagedOrganizerEvent | null>(null);
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
  const eventSubmissionInFlight = useRef(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'end' | 'start'>('start');
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedHour, setSelectedHour] = useState(19);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedEndHour, setSelectedEndHour] = useState(21);
  const [selectedEndMinute, setSelectedEndMinute] = useState(0);
  const { isOffline } = useNetworkStatus();

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

      if (isOffline) {
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
  }, [isOffline, placeQuery, savedCityId, selectedPlace]);

  function resetEventForm() {
    setEditingEvent(null);
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

  function openEditEvent(event: ManagedOrganizerEvent) {
    const eventPlace: PlaceSuggestion = {
      address: event.venueAddress ?? event.venueName,
      id: event.venueId,
      latitude: event.venueCoordinates?.latitude ?? 0,
      longitude: event.venueCoordinates?.longitude ?? 0,
      name: event.venueName,
      source: 'local',
    };

    setEditingEvent(event);
    setEventTitle(event.title);
    setPlaceQuery(event.venueName);
    setPlaceSuggestions([]);
    setSelectedPlace(eventPlace);
    setEventCategory(event.category);
    setEventDate(event.date);
    setEventDateValue(event.startsAt ? new Date(event.startsAt) : null);
    setEventEndTime(event.endTime ?? '');
    setEventTime(event.time);
    setEventDescription(event.description);
    setEventImageUri(event.imageUrl ?? null);
    setEventIsFree(event.isFree);
    setCreateEventError(null);
    setTimePickerTarget('start');
    setDatePickerOpen(false);
    setTimePickerOpen(false);
    hydrateSelectedTime(event.time, setSelectedHour, setSelectedMinute);
    hydrateSelectedTime(event.endTime ?? '', setSelectedEndHour, setSelectedEndMinute);
    if (event.startsAt) {
      setCalendarMonth(startOfMonth(new Date(event.startsAt)));
    }
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
    if (eventSubmissionInFlight.current) return;

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
    if (isOffline) {
      setCreateEventError(OFFLINE_ERROR_MESSAGE);
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
    eventSubmissionInFlight.current = true;
    setCreatingEvent(true);
    const input = {
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
    };
    let result;
    try {
      result = editingEvent
        ? await updateOrganizerEvent(userId, {
            ...input,
            currentImageUrl: editingEvent.imageUrl ?? null,
            eventId: editingEvent.id,
          })
        : await createOrganizerEvent(userId, input);
    } finally {
      eventSubmissionInFlight.current = false;
      setCreatingEvent(false);
    }

    if (result.error) {
      setCreateEventError(result.error);
      return;
    }

    setCreateEventOpen(false);
    resetEventForm();
    onEventCreated?.();
    Alert.alert(
      editingEvent ? 'Event changes submitted' : 'Event submitted',
      editingEvent
        ? 'Your changes are back in CultureQuest review before students can see the updated event.'
        : 'CultureQuest will review it before students can see it.',
    );
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
    editingEvent,
    isEditingEvent: !!editingEvent,
    openCreateEvent,
    openEditEvent,
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

function hydrateSelectedTime(
  time: string,
  setHour: (value: number) => void,
  setMinute: (value: number) => void,
) {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return;

  setHour(Number(match[1]));
  setMinute(Number(match[2]));
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
