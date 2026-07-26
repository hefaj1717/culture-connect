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
