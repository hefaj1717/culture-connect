import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { type CityId } from '@/data/culture';
import { createOrganizerReward } from '@/lib/organizer-rewards';
import { type PlaceSuggestion, searchPlaces } from '@/lib/place-search';

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
  const [createRewardError, setCreateRewardError] = useState<string | null>(null);
  const [creatingReward, setCreatingReward] = useState(false);

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
  }, [rewardPlaceQuery, savedCityId, selectedRewardPlace]);

  function resetRewardForm() {
    setRewardTitle('');
    setRewardPlaceQuery('');
    setRewardPlaceSuggestions([]);
    setSelectedRewardPlace(null);
    setSearchingRewardPlaces(false);
    setRewardDescription('');
    setRewardXp('100');
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

  async function submitReward() {
    const normalizedTitle = rewardTitle.trim();
    const normalizedDescription = rewardDescription.trim();
    const normalizedXp = Number.parseInt(rewardXp.trim(), 10);

    if (!userId) {
      setCreateRewardError('Log in again before submitting a reward.');
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

    setCreateRewardError(null);
    setCreatingReward(true);
    const result = await createOrganizerReward(userId, {
      cityId: savedCityId,
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
    rewardPlaceQuery,
    rewardPlaceSuggestions,
    rewardTitle,
    rewardXp,
    searchingRewardPlaces,
    selectedRewardPlace,
    selectRewardPlace,
    setCreateRewardOpen,
    setRewardDescription,
    setRewardPlaceQuery,
    setRewardTitle,
    setRewardXp,
    setSelectedRewardPlace,
    submitReward,
  };
}
