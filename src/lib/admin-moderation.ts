import { type CityId, type EventCategory, type RewardPartner } from '@/data/culture';
import { supabase } from '@/lib/supabase';

export type PendingAdminEvent = {
  category: EventCategory;
  cityId: CityId;
  createdAt: string;
  date: string;
  description: string;
  endTime?: string | null;
  id: string;
  imageUrl?: string | null;
  organizerAvatarUrl?: string | null;
  organizerName: string;
  organizerUserId: string;
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
  organizerAvatarUrl?: string | null;
  organizerName: string;
  organizerUserId: string;
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
  end_time_label?: string | null;
  id: string;
  image_url: string | null;
  organizer_user_id: string;
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
  organizer_user_id: string;
  place_address: string;
  place_name: string;
  title: string;
  xp_cost: number;
};

type ProfileSummaryRow = {
  avatar_url: string | null;
  id: string;
  username: string | null;
};

export async function fetchPendingAdminContent() {
  const [eventsResult, rewardsResult] = await Promise.all([
    supabase
      .from('organizer_events')
      .select(
        'id, organizer_user_id, city_key, venue_name, venue_address, title, description, category, date_label, time_label, end_time_label, image_url, created_at',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase
      .from('organizer_rewards')
      .select(
        'id, organizer_user_id, city_key, place_name, place_address, title, description, xp_cost, category, created_at',
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

  const eventRows = (eventsResult.data ?? []) as unknown as PendingEventRow[];
  const rewardRows = (rewardsResult.data ?? []) as unknown as PendingRewardRow[];
  const organizerProfiles = await fetchOrganizerProfileSummaries([...eventRows, ...rewardRows]);

  return {
    error: null,
    events: eventRows.map((row) => mapPendingEvent(row, organizerProfiles)),
    rewards: rewardRows.map((row) => mapPendingReward(row, organizerProfiles)),
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

async function fetchOrganizerProfileSummaries(
  rows: { organizer_user_id: string }[],
): Promise<Record<string, ProfileSummaryRow>> {
  const organizerIds = Array.from(new Set(rows.map((row) => row.organizer_user_id))).filter(
    Boolean,
  );

  if (organizerIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', organizerIds);

  if (error) {
    return {};
  }

  return ((data ?? []) as ProfileSummaryRow[]).reduce<Record<string, ProfileSummaryRow>>(
    (profiles, profile) => ({
      ...profiles,
      [profile.id]: profile,
    }),
    {},
  );
}

function mapPendingEvent(
  row: PendingEventRow,
  profiles: Record<string, ProfileSummaryRow>,
): PendingAdminEvent {
  const profile = profiles[row.organizer_user_id];

  return {
    category: row.category,
    cityId: row.city_key,
    createdAt: row.created_at,
    date: row.date_label,
    description: row.description,
    endTime: row.end_time_label,
    id: row.id,
    imageUrl: row.image_url,
    organizerAvatarUrl: profile?.avatar_url ?? null,
    organizerName: profile?.username?.trim() || `Organizer ${row.organizer_user_id.slice(0, 8)}`,
    organizerUserId: row.organizer_user_id,
    time: row.time_label,
    title: row.title,
    venueAddress: row.venue_address,
    venueName: row.venue_name,
  };
}

function mapPendingReward(
  row: PendingRewardRow,
  profiles: Record<string, ProfileSummaryRow>,
): PendingAdminReward {
  const profile = profiles[row.organizer_user_id];

  return {
    category: row.category,
    cityId: row.city_key,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    organizerAvatarUrl: profile?.avatar_url ?? null,
    organizerName: profile?.username?.trim() || `Organizer ${row.organizer_user_id.slice(0, 8)}`,
    organizerUserId: row.organizer_user_id,
    placeAddress: row.place_address,
    placeName: row.place_name,
    title: row.title,
    xpCost: row.xp_cost,
  };
}
