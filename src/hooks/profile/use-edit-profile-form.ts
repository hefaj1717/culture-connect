import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { type CityId, defaultCityId } from '@/data/culture';
import { type PlaceSuggestion, searchPlaces } from '@/lib/place-search';

type UpdateProfile = (profile: {
  cityId: CityId;
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  organizerBio?: string;
  organizerLocationAddress?: string | null;
  organizerLocationLatitude?: number | null;
  organizerLocationLongitude?: number | null;
  organizerLocationName?: string | null;
}) => Promise<{ error: string | null }>;

type UseEditProfileFormInput = {
  savedAvatarUrl: string | null;
  savedCityId: CityId;
  savedFirstName: string;
  savedLastName: string;
  savedOrganizerBio?: string;
  savedOrganizerLocationAddress?: string | null;
  savedOrganizerLocationLatitude?: number | null;
  savedOrganizerLocationLongitude?: number | null;
  savedOrganizerLocationName?: string | null;
  updateProfile: UpdateProfile;
};

export function useEditProfileForm({
  savedAvatarUrl,
  savedCityId,
  savedFirstName,
  savedLastName,
  savedOrganizerBio = '',
  savedOrganizerLocationAddress = null,
  savedOrganizerLocationLatitude = null,
  savedOrganizerLocationLongitude = null,
  savedOrganizerLocationName = null,
  updateProfile,
}: UseEditProfileFormInput) {
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cityId, setCityId] = useState<CityId>(defaultCityId);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [organizerBio, setOrganizerBio] = useState('');
  const [organizerLocationQuery, setOrganizerLocationQuery] = useState('');
  const [organizerLocationSuggestions, setOrganizerLocationSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [searchingOrganizerLocation, setSearchingOrganizerLocation] = useState(false);
  const [selectedOrganizerLocation, setSelectedOrganizerLocation] =
    useState<PlaceSuggestion | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setCityId(savedCityId);
    setAvatarUrl(savedAvatarUrl);
    setOrganizerBio(savedOrganizerBio);
    setOrganizerLocationQuery(savedOrganizerLocationName ?? '');
    setSelectedOrganizerLocation(
      savedOrganizerLocationName &&
        savedOrganizerLocationAddress &&
        typeof savedOrganizerLocationLatitude === 'number' &&
        typeof savedOrganizerLocationLongitude === 'number'
        ? {
            address: savedOrganizerLocationAddress,
            id: `saved-${savedOrganizerLocationLatitude}-${savedOrganizerLocationLongitude}`,
            latitude: savedOrganizerLocationLatitude,
            longitude: savedOrganizerLocationLongitude,
            name: savedOrganizerLocationName,
            source: 'local',
          }
        : null,
    );
  }, [
    savedAvatarUrl,
    savedCityId,
    savedFirstName,
    savedLastName,
    savedOrganizerBio,
    savedOrganizerLocationAddress,
    savedOrganizerLocationLatitude,
    savedOrganizerLocationLongitude,
    savedOrganizerLocationName,
  ]);

  useEffect(() => {
    let active = true;
    const normalizedQuery = organizerLocationQuery.trim();

    if (normalizedQuery.length < 2) {
      setOrganizerLocationSuggestions([]);
      setSearchingOrganizerLocation(false);
      return;
    }

    if (selectedOrganizerLocation?.name === normalizedQuery) {
      setOrganizerLocationSuggestions([]);
      setSearchingOrganizerLocation(false);
      return;
    }

    setSearchingOrganizerLocation(true);
    const searchTimer = setTimeout(async () => {
      const suggestions = await searchPlaces(normalizedQuery, cityId);

      if (!active) return;
      setOrganizerLocationSuggestions(suggestions);
      setSearchingOrganizerLocation(false);
    }, 250);

    return () => {
      active = false;
      clearTimeout(searchTimer);
    };
  }, [cityId, organizerLocationQuery, selectedOrganizerLocation?.name]);

  function openEditProfile() {
    setProfileError(null);
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setCityId(savedCityId);
    setAvatarUrl(savedAvatarUrl);
    setOrganizerBio(savedOrganizerBio);
    setOrganizerLocationQuery(savedOrganizerLocationName ?? '');
    setOrganizerLocationSuggestions([]);
    setSelectedOrganizerLocation(
      savedOrganizerLocationName &&
        savedOrganizerLocationAddress &&
        typeof savedOrganizerLocationLatitude === 'number' &&
        typeof savedOrganizerLocationLongitude === 'number'
        ? {
            address: savedOrganizerLocationAddress,
            id: `saved-${savedOrganizerLocationLatitude}-${savedOrganizerLocationLongitude}`,
            latitude: savedOrganizerLocationLatitude,
            longitude: savedOrganizerLocationLongitude,
            name: savedOrganizerLocationName,
            source: 'local',
          }
        : null,
    );
    setEditOpen(true);
  }

  function changeOrganizerLocationQuery(query: string) {
    setOrganizerLocationQuery(query);
    if (selectedOrganizerLocation && selectedOrganizerLocation.name !== query.trim()) {
      setSelectedOrganizerLocation(null);
    }
  }

  function selectOrganizerLocation(place: PlaceSuggestion) {
    setSelectedOrganizerLocation(place);
    setOrganizerLocationQuery(place.name);
    setOrganizerLocationSuggestions([]);
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
    const normalizedOrganizerLocationName =
      (selectedOrganizerLocation?.name ?? organizerLocationQuery.trim()) || null;
    const result = await updateProfile({
      cityId,
      avatarUrl,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      organizerBio,
      organizerLocationAddress: selectedOrganizerLocation?.address ?? null,
      organizerLocationLatitude: selectedOrganizerLocation?.latitude ?? null,
      organizerLocationLongitude: selectedOrganizerLocation?.longitude ?? null,
      organizerLocationName: normalizedOrganizerLocationName,
    });
    setSavingProfile(false);

    if (result.error) {
      setProfileError(result.error);
      return;
    }

    setEditOpen(false);
  }

  return {
    avatarUrl,
    changeOrganizerLocationQuery,
    cityId,
    editOpen,
    firstName,
    lastName,
    organizerBio,
    organizerLocationQuery,
    organizerLocationSuggestions,
    pickAvatar,
    profileError,
    saveProfile,
    searchingOrganizerLocation,
    selectedOrganizerLocation,
    selectOrganizerLocation,
    savingProfile,
    setAvatarUrl,
    setCityId,
    setEditOpen,
    setFirstName,
    setLastName,
    setOrganizerBio,
    setOrganizerLocationSuggestions,
    setProfileError,
    openEditProfile,
  };
}
