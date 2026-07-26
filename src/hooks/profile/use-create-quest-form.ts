import { useState } from 'react';
import { Alert } from 'react-native';

import { type CityId } from '@/data/culture';
import { createQuest, type QuestImageKind } from '@/lib/quests';

type QuestDraftStop = {
  description: string;
  eta: string;
  title: string;
};

type QuestStatus = 'draft' | 'approved';

type UseCreateQuestFormInput = {
  onQuestCreated?: () => void;
  savedCityId: CityId;
  userId?: string;
};

const initialStops: QuestDraftStop[] = [
  { title: '', description: '', eta: '5 min' },
  { title: '', description: '', eta: '8 min' },
  { title: '', description: '', eta: '10 min' },
];

export function useCreateQuestForm({
  onQuestCreated,
  savedCityId,
  userId,
}: UseCreateQuestFormInput) {
  const [createQuestOpen, setCreateQuestOpen] = useState(false);
  const [questCityId, setQuestCityId] = useState<CityId>(savedCityId);
  const [questDescription, setQuestDescription] = useState('');
  const [questImage, setQuestImage] = useState<QuestImageKind>('museum');
  const [questStatus, setQuestStatus] = useState<QuestStatus>('approved');
  const [questStops, setQuestStops] = useState<QuestDraftStop[]>(initialStops);
  const [questTheme, setQuestTheme] = useState('City route');
  const [questTitle, setQuestTitle] = useState('');
  const [questXp, setQuestXp] = useState('150');
  const [createQuestError, setCreateQuestError] = useState<string | null>(null);
  const [creatingQuest, setCreatingQuest] = useState(false);

  function resetQuestForm() {
    setQuestCityId(savedCityId);
    setQuestDescription('');
    setQuestImage('museum');
    setQuestStatus('approved');
    setQuestStops(initialStops);
    setQuestTheme('City route');
    setQuestTitle('');
    setQuestXp('150');
    setCreateQuestError(null);
  }

  function openCreateQuest() {
    resetQuestForm();
    setCreateQuestOpen(true);
  }

  function addQuestStop() {
    setQuestStops((current) => [...current, { title: '', description: '', eta: '5 min' }]);
  }

  function removeQuestStop(index: number) {
    setQuestStops((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, stopIndex) => stopIndex !== index);
    });
  }

  function updateQuestStop(index: number, key: keyof QuestDraftStop, value: string) {
    setQuestStops((current) =>
      current.map((stop, stopIndex) =>
        stopIndex === index
          ? {
              ...stop,
              [key]: value,
            }
          : stop,
      ),
    );
  }

  async function submitQuest() {
    const normalizedTitle = questTitle.trim();
    const normalizedTheme = questTheme.trim();
    const normalizedDescription = questDescription.trim();
    const normalizedXp = Number.parseInt(questXp.trim(), 10);
    const completeStops = questStops
      .map((stop) => ({
        description: stop.description.trim(),
        eta: stop.eta.trim(),
        title: stop.title.trim(),
      }))
      .filter((stop) => stop.title || stop.description || stop.eta);

    if (!userId) {
      setCreateQuestError('Log in again before creating a quest.');
      return;
    }
    if (!normalizedTitle || !normalizedTheme || !normalizedDescription) {
      setCreateQuestError('Fill in title, theme, and description.');
      return;
    }
    if (!Number.isFinite(normalizedXp) || normalizedXp <= 0) {
      setCreateQuestError('Enter a valid XP amount.');
      return;
    }
    if (completeStops.length === 0) {
      setCreateQuestError('Add at least one quest stop.');
      return;
    }
    if (completeStops.some((stop) => !stop.title || !stop.description)) {
      setCreateQuestError('Each quest stop needs a title and description.');
      return;
    }

    setCreateQuestError(null);
    setCreatingQuest(true);
    const result = await createQuest({
      cityId: questCityId,
      createdBy: userId,
      description: normalizedDescription,
      image: questImage,
      status: questStatus,
      stops: completeStops,
      theme: normalizedTheme,
      title: normalizedTitle,
      totalXp: normalizedXp,
    });
    setCreatingQuest(false);

    if (result.error) {
      setCreateQuestError(result.error);
      return;
    }

    onQuestCreated?.();
    setCreateQuestOpen(false);
    resetQuestForm();
    Alert.alert(
      questStatus === 'approved' ? 'Quest published' : 'Quest saved',
      questStatus === 'approved'
        ? 'Students can now see this quest in the selected city.'
        : 'This quest is saved as a draft and hidden from students.',
    );
  }

  return {
    addQuestStop,
    createQuestError,
    createQuestOpen,
    creatingQuest,
    openCreateQuest,
    questCityId,
    questDescription,
    questImage,
    questStatus,
    questStops,
    questTheme,
    questTitle,
    questXp,
    removeQuestStop,
    setCreateQuestOpen,
    setQuestCityId,
    setQuestDescription,
    setQuestImage,
    setQuestStatus,
    setQuestTheme,
    setQuestTitle,
    setQuestXp,
    submitQuest,
    updateQuestStop,
  };
}
