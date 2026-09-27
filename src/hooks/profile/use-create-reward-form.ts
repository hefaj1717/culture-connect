import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId } from '@/data/culture';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { createOrganizerReward } from '@/lib/organizer-rewards';
import { type PlaceSearchError, type PlaceSuggestion, searchPlaces } from '@/lib/place-search';
import {
  getIsoDaysInDateRange,
  getDefaultRewardAvailability,
  normalizeRewardDateInput,
  normalizeRewardTimeInput,
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
  const [rewardPlaceSearchError, setRewardPlaceSearchError] = useState<PlaceSearchError | null>(null);
  const [rewardPlaceSearchRetryKey, setRewardPlaceSearchRetryKey] = useState(0);
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardQc, setRewardQc] = useState('5');
  const [rewardAvailability, setRewardAvailability] = useState(getDefaultRewardAvailability);
  const [createRewardError, setCreateRewardError] = useState<string | null>(null);
  const [creatingReward, setCreatingReward] = useState(false);
  const rewardSubmissionInFlight = useRef(false);
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    let active = true;

    async function loadRewardPlaceSuggestions() {
      if (selectedRewardPlace && rewardPlaceQuery === selectedRewardPlace.name) {
        setRewardPlaceSuggestions([]);
        setRewardPlaceSearchError(null);
        setSearchingRewardPlaces(false);
        return;
      }

      if (rewardPlaceQuery.trim().length < 2) {
        setRewardPlaceSuggestions([]);
        setRewardPlaceSearchError(null);
        setSearchingRewardPlaces(false);
        return;
      }

      if (isOffline) {
        setRewardPlaceSuggestions([]);
        setRewardPlaceSearchError({ code: 'network', message: OFFLINE_ERROR_MESSAGE });
        setSearchingRewardPlaces(false);
        return;
      }

      setSearchingRewardPlaces(true);
      const result = await searchPlaces(rewardPlaceQuery, savedCityId);
      if (!active) return;

      setRewardPlaceSuggestions(result.suggestions);
      setRewardPlaceSearchError(result.error);
      setSearchingRewardPlaces(false);
    }

    loadRewardPlaceSuggestions();

    return () => {
      active = false;
    };
  }, [isOffline, rewardPlaceQuery, rewardPlaceSearchRetryKey, savedCityId, selectedRewardPlace]);

  function resetRewardForm() {
    setRewardTitle('');
    setRewardPlaceQuery('');
    setRewardPlaceSuggestions([]);
    setRewardPlaceSearchError(null);
    setSelectedRewardPlace(null);
    setSearchingRewardPlaces(false);
    setRewardDescription('');
    setRewardQc('5');
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
    setRewardPlaceSearchError(null);
  }

  function changeRewardTitle(value: string) {
    setRewardTitle(limitText(value, textLimits.rewardTitle));
  }

  function changeRewardDescription(value: string) {
    setRewardDescription(limitText(value, textLimits.rewardDescription));
  }

  function changeRewardPlaceQuery(value: string) {
    setRewardPlaceQuery(limitText(value, textLimits.placeSearch));
    setRewardPlaceSearchError(null);
  }

  function retryRewardPlaceSearch() {
    setRewardPlaceSearchRetryKey((current) => current + 1);
  }

  function changeRewardQc(value: string) {
    setRewardQc(limitText(value.replace(/\D/g, ''), textLimits.rewardQc));
  }

  function setRewardAvailableFrom(value: string) {
    setRewardAvailability((current) => ({
      ...current,
      availableDays: getIsoDaysInDateRange(
        normalizeRewardDateInput(value),
        current.availableUntil || normalizeRewardDateInput(value),
      ),
      availableFrom: normalizeRewardDateInput(value),
      availableUntil:
        current.availableUntil && current.availableUntil >= normalizeRewardDateInput(value)
          ? current.availableUntil
          : normalizeRewardDateInput(value),
    }));
  }

  function setRewardAvailableUntil(value: string) {
    setRewardAvailability((current) => ({
      ...current,
      availableDays: getIsoDaysInDateRange(current.availableFrom, normalizeRewardDateInput(value)),
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

  async function submitReward() {
    if (rewardSubmissionInFlight.current) return;

    const normalizedTitle = limitText(rewardTitle.trim(), textLimits.rewardTitle);
    const normalizedDescription = limitText(rewardDescription.trim(), textLimits.rewardDescription);
    const normalizedQc = Number.parseInt(rewardQc.trim(), 10);

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
    if (!Number.isFinite(normalizedQc) || normalizedQc <= 0 || normalizedQc > 5000) {
      setCreateRewardError('Enter an amount of CultureQuest Credits between 1 and 5000.');
      return;
    }
    const availabilityError = validateRewardAvailability(rewardAvailability);
    if (availabilityError) {
      setCreateRewardError(availabilityError);
      return;
    }

    setCreateRewardError(null);
    rewardSubmissionInFlight.current = true;
    setCreatingReward(true);
    let result;
    try {
      result = await createOrganizerReward(userId, {
        cityId: savedCityId,
        availableDays: rewardAvailability.availableDays,
        availableEndTime: rewardAvailability.availableEndTime,
        availableFrom: rewardAvailability.availableFrom,
        availableStartTime: rewardAvailability.availableStartTime,
        availableUntil: rewardAvailability.availableUntil || null,
        description: normalizedDescription,
        place: selectedRewardPlace,
        title: normalizedTitle,
        qcCost: normalizedQc,
      });
    } finally {
      rewardSubmissionInFlight.current = false;
      setCreatingReward(false);
    }

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
    rewardPlaceSearchError,
    rewardPlaceSuggestions,
    rewardTitle,
    rewardQc,
    searchingRewardPlaces,
    selectedRewardPlace,
    selectRewardPlace,
    retryRewardPlaceSearch,
    setCreateRewardOpen,
    setRewardDescription: changeRewardDescription,
    setRewardPlaceQuery: changeRewardPlaceQuery,
    setRewardTitle: changeRewardTitle,
    setRewardQc: changeRewardQc,
    setSelectedRewardPlace,
    submitReward,
    setRewardAvailableEndTime,
    setRewardAvailableFrom,
    setRewardAvailableStartTime,
    setRewardAvailableUntil,
  };
}
