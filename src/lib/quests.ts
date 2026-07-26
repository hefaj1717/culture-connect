import { type CityId } from '@/data/culture';
import { supabase } from '@/lib/supabase';

export type QuestStop = {
  id: string;
  title: string;
  description: string;
  eta: string;
  completed: boolean;
};

export type Quest = {
  id: string;
  title: string;
  theme: string;
  description: string;
  totalXp: number;
  completedStops: number;
  image: 'museum' | 'cafe' | 'theater';
  stops: QuestStop[];
};

export type QuestImageKind = Quest['image'];

export type CreateQuestStopInput = {
  title: string;
  description: string;
  eta: string;
};

export type CreateQuestInput = {
  cityId: CityId;
  createdBy: string;
  description: string;
  image: QuestImageKind;
  status: 'draft' | 'approved';
  stops: CreateQuestStopInput[];
  theme: string;
  title: string;
  totalXp: number;
};

type QuestRow = {
  id: string;
  title: string;
  theme: string;
  description: string;
  total_xp: number;
  image_kind: Quest['image'];
};

type QuestStopRow = {
  id: string;
  quest_id: string;
  title: string;
  description: string;
  eta: string;
  position: number;
};

export async function fetchApprovedQuests(cityId: CityId) {
  const { data: questRows, error: questsError } = await supabase
    .from('quests')
    .select('id, title, theme, description, total_xp, image_kind')
    .eq('city_key', cityId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (questsError) {
    return { error: questsError.message, quests: [] as Quest[] };
  }

  const quests = (questRows ?? []) as QuestRow[];
  if (quests.length === 0) {
    return { error: null, quests: [] as Quest[] };
  }

  const questIds = quests.map((quest) => quest.id);
  const { data: stopRows, error: stopsError } = await supabase
    .from('quest_stops')
    .select('id, quest_id, title, description, eta, position')
    .in('quest_id', questIds)
    .order('position', { ascending: true });

  if (stopsError) {
    return { error: stopsError.message, quests: [] as Quest[] };
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

  return {
    error: null,
    quests: quests.map((quest) => ({
      id: quest.id,
      title: quest.title,
      theme: quest.theme,
      description: quest.description,
      totalXp: quest.total_xp,
      completedStops: 0,
      image: quest.image_kind,
      stops: stopsByQuestId[quest.id] ?? [],
    })),
  };
}

export async function createQuest(input: CreateQuestInput) {
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
      city_key: input.cityId,
      created_by: input.createdBy,
      description: input.description,
      image_kind: input.image,
      status: input.status,
      theme: input.theme,
      title: input.title,
      total_xp: input.totalXp,
    })
    .select('id')
    .single();

  if (questError) {
    return { error: questError.message, questId: null };
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
    return { error: stopsError.message, questId: null };
  }

  return { error: null, questId };
}
