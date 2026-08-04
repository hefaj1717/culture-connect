import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId } from '@/data/culture';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { createOrganizerReward } from '@/lib/organizer-rewards';
import { type PlaceSuggestion, searchPlaces } from '@/lib/place-search';
import {
  getDefaultRewardAvailability,
  normalizeRewardDateInput,
  normalizeRewardTimeInput,
  toggleRewardAvailabilityDay,
  validateRewardAvailability,
} from '@/lib/reward-availability';
import { useNetworkStatus } from '@/providers/network-provider';

type UseCreateRewardFormInput = {
  onRewardCreated?: () => void;
  savedCityId: CityId;
  userId?: string;
};

export function useCreateRewardForm({
  onRewardCreated,
  savedCityId,
  userId,
}: UseCreateRewardFormInput) {
  const [createRewardOpen, setCreateRewardOpen] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardPlaceQuery, setRewardPlaceQuery] = useState('');
  const [rewardPlaceSuggestions, setRewardPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedRewardPlace, setSelectedRewardPlace] = useState<PlaceSuggestion | null>(null);
  const [searchingRewardPlaces, setSearchingRewardPlaces] = useState(false);
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardXp, setRewardXp] = useState('100');
  const [rewardAvailability, setRewardAvailability] = useState(getDefaultRewardAvailability);
  const [createRewardError, setCreateRewardError] = useState<string | null>(null);
  const [creatingReward, setCreatingReward] = useState(false);
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    let active = true;

    async function loadRewardPlaceSuggestions() {
      if (selectedRewardPlace && rewardPlaceQuery === selectedRewardPlace.name) {
        setRewardPlaceSuggestions([]);
        setSearchingRewardPlaces(false);
        return;
      }

      if (rewardPlaceQuery.trim().length < 2) {
        setRewardPlaceSuggestions([]);
        setSearchingRewardPlaces(false);
        return;
      }

      if (isOffline) {
        setRewardPlaceSuggestions([]);
        setSearchingRewardPlaces(false);
        return;
      }

      setSearchingRewardPlaces(true);
      const suggestions = await searchPlaces(rewardPlaceQuery, savedCityId);
      if (!active) return;

      setRewardPlaceSuggestions(suggestions);
      setSearchingRewardPlaces(false);
    }

    loadRewardPlaceSuggestions();

    return () => {
      active = false;
    };
  }, [isOffline, rewardPlaceQuery, savedCityId, selectedRewardPlace]);

  function resetRewardForm() {
    setRewardTitle('');
    setRewardPlaceQuery('');
    setRewardPlaceSuggestions([]);
    setSelectedRewardPlace(null);
    setSearchingRewardPlaces(false);
    setRewardDescription('');
    setRewardXp('100');
    setRewardAvailability(getDefaultRewardAvailability());
    setCreateRewardError(null);
  }

  function openCreateReward() {
    resetRewardForm();
    setCreateRewardOpen(true);
  }

  function selectRewardPlace(place: PlaceSuggestion) {
    setSelectedRewardPlace(place);
    setRewardPlaceQuery(place.name);
    setRewardPlaceSuggestions([]);
  }

  function changeRewardTitle(value: string) {
    setRewardTitle(limitText(value, textLimits.rewardTitle));
  }

  function changeRewardDescription(value: string) {
    setRewardDescription(limitText(value, textLimits.rewardDescription));
  }

  function changeRewardPlaceQuery(value: string) {
    setRewardPlaceQuery(limitText(value, textLimits.placeSearch));
  }

  function changeRewardXp(value: string) {
    setRewardXp(limitText(value.replace(/\D/g, ''), textLimits.rewardXp));
  }

  function setRewardAvailableFrom(value: string) {
    setRewardAvailability((current) => ({
      ...current,
      availableFrom: normalizeRewardDateInput(value),
    }));
  }

  function setRewardAvailableUntil(value: string) {
    setRewardAvailability((current) => ({
      ...current,
      availableUntil: normalizeRewardDateInput(value),
    }));
  }

  function setRewardAvailableStartTime(value: string) {
    setRewardAvailability((current) => ({
      ...current,
      availableStartTime: normalizeRewardTimeInput(value),
    }));
  }

  function setRewardAvailableEndTime(value: string) {
    setRewardAvailability((current) => ({
      ...current,
      availableEndTime: normalizeRewardTimeInput(value),
    }));
  }

  function toggleRewardAvailableDay(day: number) {
    setRewardAvailability((current) => ({
      ...current,
      availableDays: toggleRewardAvailabilityDay(current.availableDays, day),
    }));
  }

  async function submitReward() {
    const normalizedTitle = limitText(rewardTitle.trim(), textLimits.rewardTitle);
    const normalizedDescription = limitText(rewardDescription.trim(), textLimits.rewardDescription);
    const normalizedXp = Number.parseInt(rewardXp.trim(), 10);

    if (!userId) {
      setCreateRewardError('Log in again before submitting a reward.');
      return;
    }
    if (isOffline) {
      setCreateRewardError(OFFLINE_ERROR_MESSAGE);
      return;
    }
    if (!normalizedTitle || !normalizedDescription) {
      setCreateRewardError('Fill in reward title, place, and description.');
      return;
    }
    if (!selectedRewardPlace) {
      setCreateRewardError('Select a suggested place for this reward.');
      return;
    }
    if (!Number.isFinite(normalizedXp) || normalizedXp <= 0) {
      setCreateRewardError('Enter a valid XP amount.');
      return;
    }
    const availabilityError = validateRewardAvailability(rewardAvailability);
    if (availabilityError) {
      setCreateRewardError(availabilityError);
      return;
    }

    setCreateRewardError(null);
    setCreatingReward(true);
    const result = await createOrganizerReward(userId, {
      cityId: savedCityId,
      availableDays: rewardAvailability.availableDays,
      availableEndTime: rewardAvailability.availableEndTime,
      availableFrom: rewardAvailability.availableFrom,
      availableStartTime: rewardAvailability.availableStartTime,
      availableUntil: rewardAvailability.availableUntil || null,
      description: normalizedDescription,
      place: selectedRewardPlace,
      title: normalizedTitle,
      xpCost: normalizedXp,
    });
    setCreatingReward(false);

    if (result.error) {
      setCreateRewardError(result.error);
      return;
    }

    onRewardCreated?.();
    setCreateRewardOpen(false);
    resetRewardForm();
    Alert.alert('Reward submitted', 'CultureQuest will review it before students can see it.');
  }

  return {
    createRewardError,
    createRewardOpen,
    creatingReward,
    openCreateReward,
    resetRewardForm,
    rewardDescription,
    rewardAvailability,
    rewardPlaceQuery,
    rewardPlaceSuggestions,
    rewardTitle,
    rewardXp,
    searchingRewardPlaces,
    selectedRewardPlace,
    selectRewardPlace,
    setCreateRewardOpen,
    setRewardDescription: changeRewardDescription,
    setRewardPlaceQuery: changeRewardPlaceQuery,
    setRewardTitle: changeRewardTitle,
    setRewardXp: changeRewardXp,
    setSelectedRewardPlace,
    submitReward,
    setRewardAvailableEndTime,
    setRewardAvailableFrom,
    setRewardAvailableStartTime,
    setRewardAvailableUntil,
    toggleRewardAvailableDay,
  };
}
