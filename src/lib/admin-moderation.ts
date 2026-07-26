import { type CityId, type EventCategory, type RewardPartner } from '@/data/culture';
import { supabase } from '@/lib/supabase';

export type PendingAdminEvent = {
  category: EventCategory;
  cityId: CityId;
  createdAt: string;
  date: string;
  description: string;
  id: string;
  imageUrl?: string | null;
  time: string;
  title: string;
  venueAddress?: string | null;
  venueName: string;
};

export type PendingAdminReward = {
  category: RewardPartner['category'];
  cityId: CityId;
  createdAt: string;
  description: string;
  id: string;
  placeAddress: string;
  placeName: string;
  title: string;
  xpCost: number;
};

type PendingEventRow = {
  category: EventCategory;
  city_key: CityId;
  created_at: string;
  date_label: string;
  description: string;
  id: string;
  image_url: string | null;
  time_label: string;
  title: string;
  venue_address: string | null;
  venue_name: string;
};

type PendingRewardRow = {
  category: RewardPartner['category'];
  city_key: CityId;
  created_at: string;
  description: string;
  id: string;
  place_address: string;
  place_name: string;
  title: string;
  xp_cost: number;
};

export async function fetchPendingAdminContent() {
  const [eventsResult, rewardsResult] = await Promise.all([
    supabase
      .from('organizer_events')
      .select(
        'id, city_key, venue_name, venue_address, title, description, category, date_label, time_label, image_url, created_at',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('organizer_rewards')
      .select(
        'id, city_key, place_name, place_address, title, description, xp_cost, category, created_at',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ]);

  if (eventsResult.error || rewardsResult.error) {
    return {
      error:
        eventsResult.error?.message ?? rewardsResult.error?.message ?? 'Could not load content.',
      events: [] as PendingAdminEvent[],
      rewards: [] as PendingAdminReward[],
    };
  }

  return {
    error: null,
    events: ((eventsResult.data ?? []) as unknown as PendingEventRow[]).map(mapPendingEvent),
    rewards: ((rewardsResult.data ?? []) as unknown as PendingRewardRow[]).map(mapPendingReward),
  };
}

export async function reviewOrganizerEvent({
  adminUserId,
  eventId,
  rejectionReason,
  status,
}: {
  adminUserId: string;
  eventId: string;
  rejectionReason?: string | null;
  status: 'approved' | 'rejected';
}) {
  const { error } = await supabase
    .from('organizer_events')
    .update({
      rejection_reason:
        status === 'rejected' ? (rejectionReason ?? 'Rejected by CultureQuest review.') : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      status,
    })
    .eq('id', eventId);

  return { error: error?.message ?? null };
}

export async function reviewOrganizerReward({
  adminUserId,
  rejectionReason,
  rewardId,
  status,
}: {
  adminUserId: string;
  rejectionReason?: string | null;
  rewardId: string;
  status: 'approved' | 'rejected';
}) {
  const { error } = await supabase
    .from('organizer_rewards')
    .update({
      rejection_reason:
        status === 'rejected' ? (rejectionReason ?? 'Rejected by CultureQuest review.') : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      status,
    })
    .eq('id', rewardId);

  return { error: error?.message ?? null };
}

function mapPendingEvent(row: PendingEventRow): PendingAdminEvent {
  return {
    category: row.category,
    cityId: row.city_key,
    createdAt: row.created_at,
    date: row.date_label,
    description: row.description,
    id: row.id,
    imageUrl: row.image_url,
    time: row.time_label,
    title: row.title,
    venueAddress: row.venue_address,
    venueName: row.venue_name,
  };
}

function mapPendingReward(row: PendingRewardRow): PendingAdminReward {
  return {
    category: row.category,
    cityId: row.city_key,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    placeAddress: row.place_address,
    placeName: row.place_name,
    title: row.title,
    xpCost: row.xp_cost,
  };
}
