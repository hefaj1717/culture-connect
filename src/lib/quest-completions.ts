import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

type CompleteQuestResponse = {
  duplicate?: boolean;
  error?: string;
  success?: boolean;
  total_xp?: number;
  xp_earned?: number;
};

export async function fetchCompletedQuestIds() {
  const { data, error } = await supabase
    .from('quest_completions')
    .select('quest_id')
    .order('completed_at', { ascending: false });

  if (error) {
    return { completedQuestIds: [] as string[], error: getNetworkAwareErrorMessage(error.message) };
  }

  return {
    completedQuestIds: ((data ?? []) as { quest_id: string }[]).map((row) => row.quest_id),
    error: null,
  };
}

export async function completeQuest(questId: string, completionCode: string) {
  const { data, error } = await supabase.rpc('complete_quest', {
    _completion_code: completionCode,
    _quest_id: questId,
  });

  if (error) {
    return { duplicate: false, error: getNetworkAwareErrorMessage(error.message), totalXp: null };
  }

  const result = data as CompleteQuestResponse;

  if (!result.success) {
    return {
      duplicate: false,
      error: getQuestCompletionError(result.error),
      totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
    };
  }

  return {
    duplicate: !!result.duplicate,
    error: null,
    totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
  };
}

function getQuestCompletionError(error?: string) {
  if (error === 'not_authenticated') return 'Log in again to complete this quest.';
  if (error === 'quest_unavailable') return 'This quest is not available anymore.';
  if (error === 'quest_not_ready') return 'This quest is not ready for completion yet.';
  if (error === 'wrong_completion_code') return 'This QR code does not complete this quest.';

  return 'Could not complete this quest. Try again.';
}
