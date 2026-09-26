import { Colors } from '@/constants/theme';
import { type CityId, type RewardPartner } from '@/data/culture';
import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { fetchOrganizerProfilesByIds, type OrganizerProfile } from '@/lib/organizer-profiles';
import type { PlaceSuggestion } from '@/lib/place-search';
import {
  defaultRewardAvailabilityDays,
  defaultRewardEndTime,
  defaultRewardStartTime,
} from '@/lib/reward-availability';
import { supabase } from '@/lib/supabase';

export type CreateOrganizerRewardInput = {
  availableDays: number[];
  availableEndTime: string;
  availableFrom: string;
  availableStartTime: string;
  availableUntil?: string | null;
  cityId: CityId;
  description: string;
  place: PlaceSuggestion;
  title: string;
  xpCost: number;
};

type OrganizerRewardRow = {
  available_days?: number[] | null;
  available_end_time?: string | null;
  available_from?: string | null;
  available_start_time?: string | null;
  available_until?: string | null;
  id: string;
  city_key: CityId;
  created_at?: string;
  organizer_user_id: string;
  place_key: string;
  place_name: string;
  place_address: string;
  title: string;
  description: string;
  xp_cost: number;
  qc_cost?: number;
  category: RewardPartner['category'];
  image_url: string | null;
  rejection_reason?: string | null;
  status?: OrganizerRewardStatus;
};

export type OrganizerRewardStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';
export type ManagedOrganizerReward = RewardPartner & {
  createdAt: string;
  reviewStatus: OrganizerRewardStatus;
  rejectionReason?: string | null;
};

const ORGANIZER_REWARD_SELECT =
  'id, organizer_user_id, city_key, place_key, place_name, place_address, title, description, xp_cost, qc_cost, category, image_url, available_from, available_until, available_days, available_start_time, available_end_time';
const ORGANIZER_REWARD_WITH_STATUS_SELECT = `${ORGANIZER_REWARD_SELECT}, status, rejection_reason, created_at`;

export async function fetchOrganizerRewards(cityId: CityId) {
  const { data, error } = await supabase
    .from('organizer_rewards')
    .select(ORGANIZER_REWARD_SELECT)
    .eq('city_key', cityId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message), rewards: [] as RewardPartner[] };
  }

  const rows = (data ?? []) as unknown as OrganizerRewardRow[];
  const organizerLookup = await fetchOrganizerProfileLookup(rows);

  return {
    error: null,
    rewards: rows.map((row) => mapOrganizerRewardRow(row, organizerLookup[row.organizer_user_id])),
  };
}

export async function fetchMyOrganizerRewards(userId: string, cityId?: CityId) {
  let query = supabase
    .from('organizer_rewards')
    .select(ORGANIZER_REWARD_WITH_STATUS_SELECT)
    .eq('organizer_user_id', userId)
    .order('created_at', { ascending: false });

  if (cityId) {
    query = query.eq('city_key', cityId);
  }

  const { data, error } = await query;

  if (error) {
    return {
      error: getNetworkAwareErrorMessage(error.message),
      rewards: [] as ManagedOrganizerReward[],
    };
  }

  const rows = (data ?? []) as unknown as OrganizerRewardRow[];
  const organizerLookup = await fetchOrganizerProfileLookup(rows);

  return {
    error: null,
    rewards: rows.map((row) => ({
      ...mapOrganizerRewardRow(row, organizerLookup[row.organizer_user_id]),
      createdAt: row.created_at ?? new Date().toISOString(),
      reviewStatus: row.status ?? 'pending',
      rejectionReason: row.rejection_reason ?? null,
    })),
  };
}

export async function createOrganizerReward(userId: string, input: CreateOrganizerRewardInput) {
  const { error } = await supabase.from('organizer_rewards').insert({
    organizer_user_id: userId,
    city_key: input.cityId,
    place_key: input.place.id,
    place_name: input.place.name,
    place_address: input.place.address,
    place_latitude: input.place.latitude,
    place_longitude: input.place.longitude,
    title: input.title,
    description: input.description,
    xp_cost: input.xpCost,
    qc_cost: 5,
    category: inferRewardCategory(input.place.name, input.title),
    available_from: input.availableFrom,
    available_until: input.availableUntil ?? null,
    available_days: input.availableDays,
    available_start_time: input.availableStartTime,
    available_end_time: input.availableEndTime,
    status: 'pending',
  });

  return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
}

async function fetchOrganizerProfileLookup(rows: OrganizerRewardRow[]) {
  const result = await fetchOrganizerProfilesByIds(rows.map((row) => row.organizer_user_id));

  return result.profiles.reduce<Record<string, OrganizerProfile>>((lookup, profile) => {
    lookup[profile.id] = profile;
    return lookup;
  }, {});
}

function mapOrganizerRewardRow(
  row: OrganizerRewardRow,
  organizerProfile?: OrganizerProfile,
): RewardPartner {
  return {
    id: `organizer-reward-${row.id}`,
    availableDays: row.available_days ?? defaultRewardAvailabilityDays,
    availableEndTime: normalizeDbTime(row.available_end_time) ?? defaultRewardEndTime,
    availableFrom: row.available_from ?? null,
    availableStartTime: normalizeDbTime(row.available_start_time) ?? defaultRewardStartTime,
    availableUntil: row.available_until ?? null,
    cityId: row.city_key,
    name: row.place_name,
    category: row.category,
    location: row.place_address,
    discount: row.title,
    description: row.description,
    condition: `Unlock at ${row.xp_cost} XP · costs ${row.qc_cost ?? 5} QC`,
    xpCost: row.xp_cost,
    qcCost: row.qc_cost ?? 5,
    isPopular: false,
    badge: 'Partner',
    color: Colors.light.primary,
    imageUrl: row.image_url,
    organizerAvatarUrl: organizerProfile?.avatarUrl ?? null,
  };
}

function normalizeDbTime(value?: string | null) {
  return value?.slice(0, 5) ?? null;
}

function inferRewardCategory(placeName: string, title: string): RewardPartner['category'] {
  const haystack = `${placeName} ${title}`.toLowerCase();

  if (haystack.includes('book')) return 'bookstore';
  if (haystack.includes('browar') || haystack.includes('brew') || haystack.includes('bar')) {
    return 'bar';
  }
  if (haystack.includes('restaurant') || haystack.includes('lunch') || haystack.includes('food')) {
    return 'restaurant';
  }
  if (haystack.includes('shop') || haystack.includes('store')) return 'shop';

  return 'cafe';
}
