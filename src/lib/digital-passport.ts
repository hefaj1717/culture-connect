import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type DigitalPassportProgress = {
  betaUser: boolean;
  eventsCompleted: number;
  questsCompleted: number;
  sameOrganizerEvents: number;
};

type PassportProgressResponse = {
  beta_user?: boolean;
  error?: string;
  events_completed?: number;
  quests_completed?: number;
  same_organizer_events?: number;
  success?: boolean;
};

export const emptyDigitalPassportProgress: DigitalPassportProgress = {
  betaUser: false,
  eventsCompleted: 0,
  questsCompleted: 0,
  sameOrganizerEvents: 0,
};

export async function fetchMyDigitalPassportProgress() {
  const { data, error } = await supabase.rpc('get_my_digital_passport_progress');
  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message), progress: emptyDigitalPassportProgress };
  }

  const result = data as PassportProgressResponse;
  if (!result.success) {
    return { error: result.error ?? 'Could not load passport progress.', progress: emptyDigitalPassportProgress };
  }

  return {
    error: null,
    progress: {
      betaUser: !!result.beta_user,
      eventsCompleted: Number(result.events_completed ?? 0),
      questsCompleted: Number(result.quests_completed ?? 0),
      sameOrganizerEvents: Number(result.same_organizer_events ?? 0),
    } satisfies DigitalPassportProgress,
  };
}
