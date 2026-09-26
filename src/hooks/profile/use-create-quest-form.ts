import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import { limitText, textLimits } from '@/constants/text-limits';
import { type CityId } from '@/data/culture';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { createQuest, fetchQuestCompletionCode, type QuestImageKind } from '@/lib/quests';
import { useNetworkStatus } from '@/providers/network-provider';

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

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

export function useCreateQuestForm({
  onQuestCreated,
  savedCityId,
  userId,
}: UseCreateQuestFormInput) {
  const [createQuestOpen, setCreateQuestOpen] = useState(false);
  const [questCityId, setQuestCityId] = useState<CityId>(savedCityId);
  const [questAvailableFrom, setQuestAvailableFrom] = useState(() => formatDateInput(new Date()));
  const [questAvailableUntil, setQuestAvailableUntil] = useState('');
  const [questDescription, setQuestDescription] = useState('');
  const [questImage, setQuestImage] = useState<QuestImageKind>('museum');
  const [questImageUri, setQuestImageUri] = useState<string | null>(null);
  const [questStatus, setQuestStatus] = useState<QuestStatus>('approved');
  const [questStops, setQuestStops] = useState<QuestDraftStop[]>(initialStops);
  const [questTheme, setQuestTheme] = useState('City route');
  const [questTitle, setQuestTitle] = useState('');
  const [questXp, setQuestXp] = useState('150');
  const [createQuestError, setCreateQuestError] = useState<string | null>(null);
  const [creatingQuest, setCreatingQuest] = useState(false);
  const questSubmissionInFlight = useRef(false);
  const { isOffline } = useNetworkStatus();

  function resetQuestForm() {
    setQuestCityId(savedCityId);
    setQuestAvailableFrom(formatDateInput(new Date()));
    setQuestAvailableUntil('');
    setQuestDescription('');
    setQuestImage('museum');
    setQuestImageUri(null);
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
    const limitByKey = {
      description: textLimits.questStopDescription,
      eta: textLimits.questStopEta,
      title: textLimits.questStopTitle,
    } satisfies Record<keyof QuestDraftStop, number>;

    setQuestStops((current) =>
      current.map((stop, stopIndex) =>
        stopIndex === index
          ? {
              ...stop,
              [key]: limitText(value, limitByKey[key]),
            }
          : stop,
      ),
    );
  }

  function changeQuestTitle(value: string) {
    setQuestTitle(limitText(value, textLimits.questTitle));
  }

  function changeQuestTheme(value: string) {
    setQuestTheme(limitText(value, textLimits.questTheme));
  }

  function changeQuestDescription(value: string) {
    setQuestDescription(limitText(value, textLimits.questDescription));
  }

  function changeQuestXp(value: string) {
    setQuestXp(limitText(value.replace(/\D/g, ''), textLimits.rewardXp));
  }

  async function pickQuestImage() {
    setCreateQuestError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose a quest photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.82,
    });

    if (!result.canceled) {
      setQuestImageUri(result.assets[0]?.uri ?? null);
    }
  }

  async function submitQuest() {
    if (questSubmissionInFlight.current) return;

    const normalizedTitle = limitText(questTitle.trim(), textLimits.questTitle);
    const normalizedTheme = limitText(questTheme.trim(), textLimits.questTheme);
    const normalizedDescription = limitText(questDescription.trim(), textLimits.questDescription);
    const normalizedXp = Number.parseInt(questXp.trim(), 10);
    const normalizedAvailableFrom = questAvailableFrom.trim();
    const normalizedAvailableUntil = questAvailableUntil.trim();
    const completeStops = questStops
      .map((stop) => ({
        description: limitText(stop.description.trim(), textLimits.questStopDescription),
        eta: limitText(stop.eta.trim(), textLimits.questStopEta),
        title: limitText(stop.title.trim(), textLimits.questStopTitle),
      }))
      .filter((stop) => stop.title || stop.description || stop.eta);

    if (!userId) {
      setCreateQuestError('Log in again before creating a quest.');
      return;
    }
    if (isOffline) {
      setCreateQuestError(OFFLINE_ERROR_MESSAGE);
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
    if (!isValidDateInput(normalizedAvailableFrom)) {
      setCreateQuestError('Enter a valid availability start date in YYYY-MM-DD format.');
      return;
    }
    if (
      normalizedAvailableUntil &&
      (!isValidDateInput(normalizedAvailableUntil) ||
        normalizedAvailableUntil < normalizedAvailableFrom)
    ) {
      setCreateQuestError('The availability end date must be on or after the start date.');
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
    questSubmissionInFlight.current = true;
    setCreatingQuest(true);
    let result;
    try {
      result = await createQuest({
        availableFrom: normalizedAvailableFrom,
        availableUntil: normalizedAvailableUntil || null,
        cityId: questCityId,
        createdBy: userId,
        description: normalizedDescription,
        image: questImage,
        imageUri: questImageUri,
        status: questStatus,
        stops: completeStops,
        theme: normalizedTheme,
        title: normalizedTitle,
        totalXp: normalizedXp,
        totalQc: 5,
      });
    } finally {
      questSubmissionInFlight.current = false;
      setCreatingQuest(false);
    }

    if (result.error) {
      setCreateQuestError(result.error);
      return;
    }

    const completionCodeResult = result.questId
      ? await fetchQuestCompletionCode(result.questId)
      : { completionCode: null, error: 'Completion code is unavailable.' };

    onQuestCreated?.();
    setCreateQuestOpen(false);
    resetQuestForm();
    Alert.alert(
      questStatus === 'approved' ? 'Quest published' : 'Quest saved',
      questStatus === 'approved'
        ? completionCodeResult.completionCode
          ? `Create and place a QR code with this value at the final trail stop before sharing the quest:\n\n${completionCodeResult.completionCode}`
          : 'Students can now see this quest in the selected city. Open it again as an admin to retrieve its finish QR code.'
        : 'This quest is saved as a draft and hidden from students.',
    );
  }

  return {
    addQuestStop,
    createQuestError,
    createQuestOpen,
    creatingQuest,
    openCreateQuest,
    pickQuestImage,
    questAvailableFrom,
    questAvailableUntil,
    questCityId,
    questDescription,
    questImage,
    questImageUri,
    questStatus,
    questStops,
    questTheme,
    questTitle,
    questXp,
    removeQuestStop,
    setCreateQuestOpen,
    setQuestAvailableFrom,
    setQuestAvailableUntil,
    setQuestCityId,
    setQuestDescription: changeQuestDescription,
    setQuestImage,
    setQuestImageUri,
    setQuestStatus,
    setQuestTheme: changeQuestTheme,
    setQuestTitle: changeQuestTitle,
    setQuestXp: changeQuestXp,
    submitQuest,
    updateQuestStop,
  };
}
