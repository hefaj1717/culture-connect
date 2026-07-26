import { Colors } from '@/constants/theme';
import { type CityId, type RewardPartner } from '@/data/culture';
import type { PlaceSuggestion } from '@/lib/place-search';
import { supabase } from '@/lib/supabase';

export type CreateOrganizerRewardInput = {
  cityId: CityId;
  description: string;
  place: PlaceSuggestion;
  title: string;
  xpCost: number;
};

type OrganizerRewardRow = {
  id: string;
  city_key: CityId;
  place_key: string;
  place_name: string;
  place_address: string;
  title: string;
  description: string;
  xp_cost: number;
  category: RewardPartner['category'];
  image_url: string | null;
};

export async function fetchOrganizerRewards(cityId: CityId) {
  const { data, error } = await supabase
    .from('organizer_rewards')
    .select(
      'id, city_key, place_key, place_name, place_address, title, description, xp_cost, category, image_url',
    )
    .eq('city_key', cityId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message, rewards: [] as RewardPartner[] };
  }

  return {
    error: null,
    rewards: (data ?? []).map(mapOrganizerRewardRow),
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
    category: inferRewardCategory(input.place.name, input.title),
    status: 'pending',
  });

  return { error: error?.message ?? null };
}

function mapOrganizerRewardRow(row: OrganizerRewardRow): RewardPartner {
  return {
    id: `organizer-reward-${row.id}`,
    name: row.place_name,
    category: row.category,
    location: row.place_address,
    discount: row.title,
    description: row.description,
    condition: `Unlock at ${row.xp_cost} XP`,
    xpCost: row.xp_cost,
    isPopular: false,
    badge: 'Partner',
    color: Colors.light.primary,
  };
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
