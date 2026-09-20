import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId, defaultCityId } from '@/data/culture';
import { getUniversityById } from '@/data/universities';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { type PlaceSearchError, type PlaceSuggestion, searchPlaces } from '@/lib/place-search';
import {
  upsertMyUniversityMembership,
  type UserUniversityMembership,
} from '@/lib/university-leaderboard';
import { useNetworkStatus } from '@/providers/network-provider';

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
  onUniversityMembershipSaved?: (membership: UserUniversityMembership) => void;
  savedAvatarUrl: string | null;
  savedCityId: CityId;
  savedFirstName: string;
  savedLastName: string;
  savedOrganizerBio?: string;
  savedOrganizerLocationAddress?: string | null;
  savedOrganizerLocationLatitude?: number | null;
  savedOrganizerLocationLongitude?: number | null;
  savedOrganizerLocationName?: string | null;
  savedUniversityMembership?: UserUniversityMembership | null;
  updateProfile: UpdateProfile;
};

export function useEditProfileForm({
  onUniversityMembershipSaved,
  savedAvatarUrl,
  savedCityId,
  savedFirstName,
  savedLastName,
  savedOrganizerBio = '',
  savedOrganizerLocationAddress = null,
  savedOrganizerLocationLatitude = null,
  savedOrganizerLocationLongitude = null,
  savedOrganizerLocationName = null,
  savedUniversityMembership = null,
  updateProfile,
}: UseEditProfileFormInput) {
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cityId, setCityId] = useState<CityId>(defaultCityId);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [organizerBio, setOrganizerBio] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [organizerLocationQuery, setOrganizerLocationQuery] = useState('');
  const [organizerLocationSuggestions, setOrganizerLocationSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [searchingOrganizerLocation, setSearchingOrganizerLocation] = useState(false);
  const [organizerLocationSearchError, setOrganizerLocationSearchError] =
    useState<PlaceSearchError | null>(null);
  const [organizerLocationSearchRetryKey, setOrganizerLocationSearchRetryKey] = useState(0);
  const [selectedOrganizerLocation, setSelectedOrganizerLocation] =
    useState<PlaceSuggestion | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setCityId(savedCityId);
    setAvatarUrl(savedAvatarUrl);
    setOrganizerBio(savedOrganizerBio);
    setIsStudent(!!savedUniversityMembership);
    setStudentEmail(savedUniversityMembership?.studentEmail ?? '');
    setUniversityId(savedUniversityMembership?.universityId ?? '');
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
    savedUniversityMembership,
  ]);

  useEffect(() => {
    let active = true;
    const normalizedQuery = organizerLocationQuery.trim();

    if (normalizedQuery.length < 2) {
      setOrganizerLocationSuggestions([]);
      setOrganizerLocationSearchError(null);
      setSearchingOrganizerLocation(false);
      return;
    }

    if (selectedOrganizerLocation?.name === normalizedQuery) {
      setOrganizerLocationSuggestions([]);
      setOrganizerLocationSearchError(null);
      setSearchingOrganizerLocation(false);
      return;
    }

    if (isOffline) {
      setOrganizerLocationSuggestions([]);
      setOrganizerLocationSearchError({ code: 'network', message: OFFLINE_ERROR_MESSAGE });
      setSearchingOrganizerLocation(false);
      return;
    }

    setSearchingOrganizerLocation(true);
    const searchTimer = setTimeout(async () => {
      const result = await searchPlaces(normalizedQuery, cityId);

      if (!active) return;
      setOrganizerLocationSuggestions(result.suggestions);
      setOrganizerLocationSearchError(result.error);
      setSearchingOrganizerLocation(false);
    }, 250);

    return () => {
      active = false;
      clearTimeout(searchTimer);
    };
  }, [
    cityId,
    isOffline,
    organizerLocationQuery,
    organizerLocationSearchRetryKey,
    selectedOrganizerLocation?.name,
  ]);

  function openEditProfile() {
    setProfileError(null);
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setCityId(savedCityId);
    setAvatarUrl(savedAvatarUrl);
    setOrganizerBio(savedOrganizerBio);
    setIsStudent(!!savedUniversityMembership);
    setStudentEmail(savedUniversityMembership?.studentEmail ?? '');
    setUniversityId(savedUniversityMembership?.universityId ?? '');
    setOrganizerLocationQuery(savedOrganizerLocationName ?? '');
    setOrganizerLocationSuggestions([]);
    setOrganizerLocationSearchError(null);
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
    const nextQuery = limitText(query, textLimits.organizerLocationSearch);
    setOrganizerLocationQuery(nextQuery);
    setOrganizerLocationSearchError(null);
    if (selectedOrganizerLocation && selectedOrganizerLocation.name !== nextQuery.trim()) {
      setSelectedOrganizerLocation(null);
    }
  }

  function changeFirstName(value: string) {
    setFirstName(limitText(value, textLimits.firstName));
  }

  function changeLastName(value: string) {
    setLastName(limitText(value, textLimits.lastName));
  }

  function changeCity(nextCityId: CityId) {
    setCityId(nextCityId);
    const currentUniversity = getUniversityById(universityId);
    if (currentUniversity && currentUniversity.cityId !== nextCityId) {
      setUniversityId('');
    }
  }

  function changeStudentEmail(value: string) {
    setStudentEmail(limitText(value, textLimits.email));
  }

  function changeOrganizerBio(value: string) {
    setOrganizerBio(limitText(value, textLimits.organizerBio));
  }

  function selectOrganizerLocation(place: PlaceSuggestion) {
    setSelectedOrganizerLocation(place);
    setOrganizerLocationQuery(place.name);
    setOrganizerLocationSuggestions([]);
    setOrganizerLocationSearchError(null);
  }

  function retryOrganizerLocationSearch() {
    setOrganizerLocationSearchRetryKey((current) => current + 1);
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
    const normalizedFirstName = limitText(firstName.trim(), textLimits.firstName);
    const normalizedLastName = limitText(lastName.trim(), textLimits.lastName);

    if (!normalizedFirstName || !normalizedLastName) {
      setProfileError('Please enter your first and last name.');
      return;
    }

    if (isOffline) {
      setProfileError(OFFLINE_ERROR_MESSAGE);
      return;
    }

    if (isStudent) {
      if (!universityId) {
        setProfileError('Choose your university.');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail.trim())) {
        setProfileError('Enter a valid student email.');
        return;
      }
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
      organizerBio: limitText(organizerBio.trim(), textLimits.organizerBio),
      organizerLocationAddress: selectedOrganizerLocation?.address ?? null,
      organizerLocationLatitude: selectedOrganizerLocation?.latitude ?? null,
      organizerLocationLongitude: selectedOrganizerLocation?.longitude ?? null,
      organizerLocationName: normalizedOrganizerLocationName,
    });

    if (result.error) {
      setProfileError(result.error);
      setSavingProfile(false);
      return;
    }

    if (isStudent) {
      const membershipResult = await upsertMyUniversityMembership({
        studentEmail: studentEmail.trim().toLowerCase(),
        universityId,
      });

      if (membershipResult.error) {
        setSavingProfile(false);
        setProfileError(membershipResult.error);
        return;
      }

      const university = getUniversityById(universityId);
      if (university) {
        onUniversityMembershipSaved?.({
          cityId: university.cityId,
          name: university.name,
          shortName: university.shortName,
          status:
            savedUniversityMembership?.universityId === universityId
              ? savedUniversityMembership.status
              : 'pending',
          studentEmail: studentEmail.trim().toLowerCase(),
          universityId,
          verifiedAt:
            savedUniversityMembership?.universityId === universityId
              ? savedUniversityMembership.verifiedAt
              : null,
        });
      }
    }

    setSavingProfile(false);
    setEditOpen(false);
  }

  return {
    avatarUrl,
    changeOrganizerLocationQuery,
    cityId,
    editOpen,
    firstName,
    isStudent,
    lastName,
    organizerBio,
    organizerLocationQuery,
    organizerLocationSearchError,
    organizerLocationSuggestions,
    pickAvatar,
    profileError,
    saveProfile,
    searchingOrganizerLocation,
    selectedOrganizerLocation,
    selectOrganizerLocation,
    retryOrganizerLocationSearch,
    savingProfile,
    setAvatarUrl,
    setCityId: changeCity,
    setEditOpen,
    setFirstName: changeFirstName,
    setLastName: changeLastName,
    setIsStudent,
    setOrganizerBio: changeOrganizerBio,
    setOrganizerLocationSuggestions,
    setProfileError,
    setStudentEmail: changeStudentEmail,
    setUniversityId,
    studentEmail,
    universityId,
    openEditProfile,
  };
}
