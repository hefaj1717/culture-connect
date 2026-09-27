import type { CityId } from '@/data/culture';
import { getUniversityById } from '@/data/universities';
import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type UniversityRankingHistory = {
  academicYear: string;
  finalizedAt: string;
  memberCount: number;
  rank: 1 | 2 | 3;
  totalXp: number;
};

export type UniversityProfileSummary = {
  cityId: CityId;
  currentRank: number;
  description: string;
  id: string;
  memberCount: number;
  name: string;
  rankingHistory: UniversityRankingHistory[];
  shortName: string;
  totalXp: number;
};

type UniversityProfileRpcResponse = {
  active_member_count?: number;
  city_key?: string;
  current_rank?: number;
  error?: string;
  ranking_history?: {
    academic_year?: string;
    finalized_at?: string;
    member_count?: number;
    rank?: number;
    total_xp?: number;
  }[];
  success?: boolean;
  total_xp?: number;
  university_id?: string;
  university_name?: string;
  university_short_name?: string;
};

export async function fetchUniversityProfileSummary(universityId: string) {
  const fallback = getUniversityById(universityId);
  const { data, error } = await supabase.rpc('get_university_profile_summary', {
    _university_id: universityId,
  });

  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message), profile: null };
  }

  const result = data as UniversityProfileRpcResponse;
  if (!result.success || !result.university_id) {
    return { error: result.error ?? 'Could not load this university.', profile: null };
  }

  return {
    error: null,
    profile: {
      cityId: result.city_key === 'lublin' ? 'lublin' : 'leuven',
      currentRank: Number(result.current_rank ?? 0),
      description:
        fallback?.description ?? 'A CultureQuest campus community exploring the city together.',
      id: result.university_id,
      memberCount: Number(result.active_member_count ?? 0),
      name: result.university_name ?? fallback?.name ?? 'University',
      rankingHistory: (result.ranking_history ?? [])
        .filter((entry) => entry.rank === 1 || entry.rank === 2 || entry.rank === 3)
        .map((entry) => ({
          academicYear: entry.academic_year ?? 'Academic year',
          finalizedAt: entry.finalized_at ?? '',
          memberCount: Number(entry.member_count ?? 0),
          rank: entry.rank as 1 | 2 | 3,
          totalXp: Number(entry.total_xp ?? 0),
        })),
      shortName: result.university_short_name ?? fallback?.shortName ?? 'University',
      totalXp: Number(result.total_xp ?? 0),
    } satisfies UniversityProfileSummary,
  };
}
