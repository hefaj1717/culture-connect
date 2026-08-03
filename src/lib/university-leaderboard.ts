import type { CityId } from '@/data/culture';
import { getUniversityById, universities } from '@/data/universities';
import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type UniversityLeaderboardRow = {
  cityId: CityId;
  memberCount: number;
  name: string;
  rank: number;
  shortName: string;
  totalXp: number;
  universityId: string;
};

export type UserUniversityMembership = {
  cityId: CityId;
  name: string;
  shortName: string;
  status: 'pending' | 'verified' | 'rejected';
  studentEmail: string;
  universityId: string;
  verifiedAt: string | null;
};

type UniversityLeaderboardRpcRow = {
  city_key: string;
  member_count: number;
  name: string;
  rank: number;
  short_name: string;
  total_xp: number;
  university_id: string;
};

type UserUniversityMembershipRow = {
  status: 'pending' | 'verified' | 'rejected';
  student_email: string;
  universities?:
    | {
        city_key: string;
        name: string;
        short_name: string;
      }
    | {
        city_key: string;
        name: string;
        short_name: string;
      }[]
    | null;
  university_id: string;
  verified_at: string | null;
};

export async function fetchUniversityLeaderboard(cityId: CityId) {
  const { data, error } = await supabase.rpc('university_leaderboard_by_city', {
    _city_key: cityId,
  });

  if (error) {
    return {
      error: getNetworkAwareErrorMessage(error.message),
      rows: getFallbackUniversityLeaderboard(cityId),
    };
  }

  return {
    error: null,
    rows: ((data ?? []) as UniversityLeaderboardRpcRow[]).map(mapLeaderboardRow),
  };
}

export async function fetchMyUniversityMembership() {
  const { data, error } = await supabase
    .from('user_university_memberships')
    .select(
      'university_id, student_email, status, verified_at, universities(city_key, name, short_name)',
    )
    .maybeSingle();

  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message), membership: null };
  }

  return {
    error: null,
    membership: data ? mapMembershipRow(data as UserUniversityMembershipRow) : null,
  };
}

export async function upsertMyUniversityMembership({
  studentEmail,
  universityId,
}: {
  studentEmail: string;
  universityId: string;
}) {
  const { data, error } = await supabase.rpc('upsert_my_university_membership', {
    _student_email: studentEmail,
    _university_id: universityId,
  });

  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message) };
  }

  const result = data as { error?: string; success?: boolean };
  return { error: result.success ? null : (result.error ?? 'Could not save university.') };
}

function mapLeaderboardRow(row: UniversityLeaderboardRpcRow): UniversityLeaderboardRow {
  return {
    cityId: row.city_key === 'lublin' ? 'lublin' : 'leuven',
    memberCount: Number(row.member_count ?? 0),
    name: row.name,
    rank: Number(row.rank ?? 0),
    shortName: row.short_name,
    totalXp: Number(row.total_xp ?? 0),
    universityId: row.university_id,
  };
}

function mapMembershipRow(row: UserUniversityMembershipRow): UserUniversityMembership {
  const fallbackUniversity = getUniversityById(row.university_id);
  const joinedUniversity = Array.isArray(row.universities) ? row.universities[0] : row.universities;

  return {
    cityId:
      joinedUniversity?.city_key === 'lublin' || fallbackUniversity?.cityId === 'lublin'
        ? 'lublin'
        : 'leuven',
    name: joinedUniversity?.name ?? fallbackUniversity?.name ?? 'University',
    shortName: joinedUniversity?.short_name ?? fallbackUniversity?.shortName ?? 'University',
    status: row.status,
    studentEmail: row.student_email,
    universityId: row.university_id,
    verifiedAt: row.verified_at,
  };
}

function getFallbackUniversityLeaderboard(cityId: CityId): UniversityLeaderboardRow[] {
  return universities
    .filter((university) => university.cityId === cityId)
    .map((university, index) => ({
      cityId,
      memberCount: 0,
      name: university.name,
      rank: index + 1,
      shortName: university.shortName,
      totalXp: 0,
      universityId: university.id,
    }));
}
