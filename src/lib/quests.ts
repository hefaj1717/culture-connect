import { type CityId } from '@/data/culture';
import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type QuestStop = {
  id: string;
  title: string;
  description: string;
  eta: string;
  completed: boolean;
};

export type Quest = {
  availableFrom: string;
  availableUntil?: string;
  completionCount: number;
  id: string;
  title: string;
  theme: string;
  description: string;
  totalXp: number;
  completedStops: number;
  image: 'museum' | 'cafe' | 'theater';
  imageUrl?: string;
  stops: QuestStop[];
};

export type QuestImageKind = Quest['image'];

export type CreateQuestStopInput = {
  title: string;
  description: string;
  eta: string;
};

export type CreateQuestInput = {
  availableFrom: string;
  availableUntil?: string | null;
  cityId: CityId;
  createdBy: string;
  description: string;
  image: QuestImageKind;
  imageUri?: string | null;
  status: 'draft' | 'approved';
  stops: CreateQuestStopInput[];
  theme: string;
  title: string;
  totalXp: number;
};

type QuestRow = {
  available_from: string;
  available_until?: string | null;
  id: string;
  title: string;
  theme: string;
  description: string;
  total_xp: number;
  image_kind: Quest['image'];
  image_url?: string | null;
};

type QuestCompletionStatsRow = {
  completion_count: number;
  quest_id: string;
};

type QuestStopRow = {
  id: string;
  quest_id: string;
  title: string;
  description: string;
  eta: string;
  position: number;
};

const QUEST_IMAGES_BUCKET = 'quest-images';
const QUEST_SELECT =
  'id, title, theme, description, total_xp, image_kind, image_url, available_from, available_until';
const LEGACY_QUEST_SELECT =
  'id, title, theme, description, total_xp, image_kind, available_from, available_until';

export async function fetchApprovedQuests(cityId: CityId) {
  const queryApprovedQuests = (selectColumns: string) =>
    supabase
      .from('quests')
      .select(selectColumns)
      .eq('city_key', cityId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

  let { data: questRows, error: questsError } = await queryApprovedQuests(QUEST_SELECT);

  if (isMissingImageUrlError(questsError?.message)) {
    const legacyResult = await queryApprovedQuests(LEGACY_QUEST_SELECT);
    questRows = legacyResult.data;
    questsError = legacyResult.error;
  }

  if (questsError) {
    return { error: getNetworkAwareErrorMessage(questsError.message), quests: [] as Quest[] };
  }

  const quests = (questRows ?? []) as unknown as QuestRow[];
  if (quests.length === 0) {
    return { error: null, quests: [] as Quest[] };
  }

  const questIds = quests.map((quest) => quest.id);
  const { data: completionStatsRows } = await supabase
    .from('quest_completion_stats')
    .select('quest_id, completion_count')
    .in('quest_id', questIds);
  const { data: stopRows, error: stopsError } = await supabase
    .from('quest_stops')
    .select('id, quest_id, title, description, eta, position')
    .in('quest_id', questIds)
    .order('position', { ascending: true });

  if (stopsError) {
    return { error: getNetworkAwareErrorMessage(stopsError.message), quests: [] as Quest[] };
  }

  const stopsByQuestId = ((stopRows ?? []) as QuestStopRow[]).reduce<Record<string, QuestStop[]>>(
    (groups, stop) => {
      const nextStop = {
        id: stop.id,
        title: stop.title,
        description: stop.description,
        eta: stop.eta,
        completed: false,
      };

      return {
        ...groups,
        [stop.quest_id]: [...(groups[stop.quest_id] ?? []), nextStop],
      };
    },
    {},
  );
  const completionCountByQuestId = ((completionStatsRows ?? []) as QuestCompletionStatsRow[]).reduce<
    Record<string, number>
  >((counts, stat) => ({ ...counts, [stat.quest_id]: stat.completion_count }), {});

  return {
    error: null,
    quests: quests.map((quest) => ({
      availableFrom: quest.available_from,
      availableUntil: quest.available_until ?? undefined,
      completionCount: completionCountByQuestId[quest.id] ?? 0,
      id: quest.id,
      title: quest.title,
      theme: quest.theme,
      description: quest.description,
      totalXp: quest.total_xp,
      completedStops: 0,
      image: quest.image_kind,
      imageUrl: quest.image_url ?? undefined,
      stops: stopsByQuestId[quest.id] ?? [],
    })),
  };
}

export async function createQuest(input: CreateQuestInput) {
  const uploadedImage = input.imageUri
    ? await uploadQuestImage(input.createdBy, input.imageUri)
    : null;

  if (uploadedImage?.error) {
    return { error: uploadedImage.error, questId: null };
  }

  const normalizedStops = input.stops
    .map((stop) => ({
      description: stop.description.trim(),
      eta: stop.eta.trim() || '5 min',
      title: stop.title.trim(),
    }))
    .filter((stop) => stop.title && stop.description);

  const { data: questRow, error: questError } = await supabase
    .from('quests')
    .insert({
      available_from: input.availableFrom,
      available_until: input.availableUntil ?? null,
      city_key: input.cityId,
      created_by: input.createdBy,
      description: input.description,
      image_kind: input.image,
      image_url: uploadedImage?.url ?? null,
      status: input.status,
      theme: input.theme,
      title: input.title,
      total_xp: input.totalXp,
    })
    .select('id')
    .single();

  if (questError) {
    return { error: getNetworkAwareErrorMessage(questError.message), questId: null };
  }

  const questId = (questRow as { id: string }).id;

  if (normalizedStops.length === 0) {
    return { error: null, questId };
  }

  const { error: stopsError } = await supabase.from('quest_stops').insert(
    normalizedStops.map((stop, index) => ({
      description: stop.description,
      eta: stop.eta,
      position: index + 1,
      quest_id: questId,
      title: stop.title,
    })),
  );

  if (stopsError) {
    await supabase.from('quests').delete().eq('id', questId);
    return { error: getNetworkAwareErrorMessage(stopsError.message), questId: null };
  }

  return { error: null, questId };
}

export async function fetchQuestCompletionCode(questId: string) {
  const { data, error } = await supabase.rpc('get_quest_completion_code', {
    _quest_id: questId,
  });

  if (error || typeof data !== 'string' || !data) {
    return {
      completionCode: null,
      error: getNetworkAwareErrorMessage(error?.message ?? 'Completion code is unavailable.'),
    };
  }

  return { completionCode: data, error: null };
}

async function uploadQuestImage(userId: string, imageUri: string) {
  try {
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    const extension = getImageExtension(imageUri);
    const contentType = getImageContentType(extension);
    const path = `${userId}/${Date.now()}.${extension}`;

    const { error } = await supabase.storage.from(QUEST_IMAGES_BUCKET).upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      return { url: null, error: getNetworkAwareErrorMessage(error.message) };
    }

    const { data } = supabase.storage.from(QUEST_IMAGES_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch {
    return { url: null, error: 'Could not upload the quest photo.' };
  }
}

function getImageExtension(uri: string) {
  const match = uri.toLowerCase().match(/\.(jpg|jpeg|png|webp)(?:\?|$)/);
  if (!match) return 'jpg';
  return match[1] === 'jpeg' ? 'jpg' : match[1];
}

function getImageContentType(extension: string) {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function isMissingImageUrlError(message?: string | null) {
  return !!message && message.includes('image_url');
}
