import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type DigitalPassportProgress = {
  betaUser: boolean;
  eventsCompleted: number;
  questsCompleted: number;
  sameOrganizerEvents: number;
  universityRankingAwards: UniversityRankingAward[];
};

export type UniversityRankingAward = {
  academicYear: string;
  cityKey: string;
  rank: 1 | 2 | 3;
  universityName: string;
};

type PassportProgressResponse = {
  beta_user?: boolean;
  error?: string;
  events_completed?: number;
  quests_completed?: number;
  same_organizer_events?: number;
  success?: boolean;
  university_ranking_awards?: {
    academic_year?: string;
    city_key?: string;
    rank?: number;
    university_name?: string;
  }[];
};

export const emptyDigitalPassportProgress: DigitalPassportProgress = {
  betaUser: false,
  eventsCompleted: 0,
  questsCompleted: 0,
  sameOrganizerEvents: 0,
  universityRankingAwards: [],
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
      universityRankingAwards: (result.university_ranking_awards ?? [])
        .filter((award) => award.rank === 1 || award.rank === 2 || award.rank === 3)
        .map((award) => ({
          academicYear: award.academic_year ?? 'Academic year',
          cityKey: award.city_key ?? '',
          rank: award.rank as 1 | 2 | 3,
          universityName: award.university_name ?? 'Your university',
        })),
    } satisfies DigitalPassportProgress,
  };
}
