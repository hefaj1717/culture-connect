import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Colors } from '@/constants/theme';
import { type CityId, type RewardPartner } from '@/data/culture';
import { type PlaceSuggestion, searchPlaces } from '@/lib/place-search';

type UseCreateRewardFormInput = {
  onRewardCreated?: (reward: RewardPartner) => void;
  savedCityId: CityId;
};

export function useCreateRewardForm({ onRewardCreated, savedCityId }: UseCreateRewardFormInput) {
  const [createRewardOpen, setCreateRewardOpen] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardPlaceQuery, setRewardPlaceQuery] = useState('');
  const [rewardPlaceSuggestions, setRewardPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedRewardPlace, setSelectedRewardPlace] = useState<PlaceSuggestion | null>(null);
  const [searchingRewardPlaces, setSearchingRewardPlaces] = useState(false);
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardXp, setRewardXp] = useState('100');
  const [createRewardError, setCreateRewardError] = useState<string | null>(null);

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

  function submitReward() {
    const normalizedTitle = rewardTitle.trim();
    const normalizedDescription = rewardDescription.trim();
    const normalizedXp = Number.parseInt(rewardXp.trim(), 10);

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

    const createdReward: RewardPartner = {
      id: `organizer-reward-${Date.now()}`,
      name: selectedRewardPlace.name,
      category: 'cafe',
      location: selectedRewardPlace.address,
      discount: normalizedTitle,
      description: normalizedDescription,
      condition: `Unlock at ${normalizedXp} XP`,
      xpCost: normalizedXp,
      isPopular: false,
      badge: 'Organizer',
      color: Colors.light.primary,
    };

    onRewardCreated?.(createdReward);
    setCreateRewardOpen(false);
    resetRewardForm();
    Alert.alert('Reward created', 'Your reward is now visible in Rewards.');
  }

  return {
    createRewardError,
    createRewardOpen,
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
