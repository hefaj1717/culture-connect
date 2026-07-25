import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { type CityId, defaultCityId } from '@/data/culture';

type UpdateProfile = (profile: {
  firstName: string;
  lastName: string;
  cityId: CityId;
  avatarUrl?: string | null;
}) => Promise<{ error: string | null }>;

type UseEditProfileFormInput = {
  savedAvatarUrl: string | null;
  savedCityId: CityId;
  savedFirstName: string;
  savedLastName: string;
  updateProfile: UpdateProfile;
};

export function useEditProfileForm({
  savedAvatarUrl,
  savedCityId,
  savedFirstName,
  savedLastName,
  updateProfile,
}: UseEditProfileFormInput) {
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cityId, setCityId] = useState<CityId>(defaultCityId);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setCityId(savedCityId);
    setAvatarUrl(savedAvatarUrl);
  }, [savedAvatarUrl, savedCityId, savedFirstName, savedLastName]);

  function openEditProfile() {
    setProfileError(null);
    setFirstName(savedFirstName);
    setLastName(savedLastName);
    setCityId(savedCityId);
    setAvatarUrl(savedAvatarUrl);
    setEditOpen(true);
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
    const result = await updateProfile({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      cityId,
      avatarUrl,
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
    cityId,
    editOpen,
    firstName,
    lastName,
    pickAvatar,
    profileError,
    saveProfile,
    savingProfile,
    setAvatarUrl,
    setCityId,
    setEditOpen,
    setFirstName,
    setLastName,
    setProfileError,
    openEditProfile,
  };
}
