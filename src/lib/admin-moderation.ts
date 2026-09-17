import {
  type CityId,
  type CultureEvent,
  type EventCategory,
  type EventLanguage,
  type RewardPartner,
} from '@/data/culture';
import type { OrganizerEventStatus } from '@/lib/organizer-events';
import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import {
  defaultRewardAvailabilityDays,
  defaultRewardEndTime,
  defaultRewardStartTime,
} from '@/lib/reward-availability';
import { supabase } from '@/lib/supabase';

export type PendingAdminEvent = {
  category: EventCategory;
  changes: PendingAdminEventChange[];
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
  updatedAt?: string | null;
  venueAddress?: string | null;
  venueName: string;
};

export type PendingAdminEventChange = {
  field: string;
  from: string;
  to: string;
};

export type PendingAdminReward = {
  availableDays: number[];
  availableEndTime: string;
  availableFrom?: string | null;
  availableStartTime: string;
  availableUntil?: string | null;
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

export type AdminManagedEvent = CultureEvent & {
  changes: PendingAdminEventChange[];
  cityId: CityId;
  createdAt: string;
  databaseId: string;
  organizerUserId: string;
  reviewRequestedAt?: string | null;
  reviewStatus: OrganizerEventStatus;
};

export type AdminManagedReward = {
  availableDays: number[];
  availableEndTime: string;
  availableFrom?: string | null;
  availableStartTime: string;
  availableUntil?: string | null;
  category: RewardPartner['category'];
  cityId: CityId;
  createdAt: string;
  databaseId: string;
  description: string;
  imageUrl?: string | null;
  organizerAvatarUrl?: string | null;
  organizerBio?: string;
  organizerCityId: CityId;
  organizerId: string;
  organizerLocationAddress?: string | null;
  organizerLocationCoordinates?: { latitude: number; longitude: number } | null;
  organizerLocationName?: string | null;
  organizerName: string;
  organizerUserId: string;
  placeAddress: string;
  placeName: string;
  reviewStatus: RewardPartnerStatus;
  title: string;
  xpCost: number;
};

export type RewardPartnerStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived';

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
  review_previous_snapshot?: PendingEventPreviousSnapshot | null;
  review_requested_at?: string | null;
  time_label: string;
  title: string;
  updated_at?: string | null;
  venue_address: string | null;
  venue_name: string;
};

type PendingEventPreviousSnapshot = {
  category?: string | null;
  date_label?: string | null;
  description?: string | null;
  end_time_label?: string | null;
  image_url?: string | null;
  time_label?: string | null;
  title?: string | null;
  venue_address?: string | null;
  venue_name?: string | null;
};

type AdminManagedEventRow = PendingEventRow & {
  attendee_count: number | null;
  ends_at?: string | null;
  going_count?: number | null;
  image_kind: CultureEvent['organizerImage'];
  interested_count?: number | null;
  is_free: boolean | null;
  is_international: boolean | null;
  language: EventLanguage | null;
  starts_at?: string | null;
  status: OrganizerEventStatus;
  venue_key: string;
  venue_latitude: number | null;
  venue_longitude: number | null;
  xp_bonus: number | null;
};

type PendingRewardRow = {
  available_days?: number[] | null;
  available_end_time?: string | null;
  available_from?: string | null;
  available_start_time?: string | null;
  available_until?: string | null;
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

type AdminManagedRewardRow = PendingRewardRow & {
  image_url: string | null;
  place_latitude?: number | null;
  place_longitude?: number | null;
  status: RewardPartnerStatus;
};

type ProfileSummaryRow = {
  avatar_url: string | null;
  city_key?: CityId | null;
  id: string;
  organizer_bio?: string | null;
  organizer_location_address?: string | null;
  organizer_location_latitude?: number | null;
  organizer_location_longitude?: number | null;
  organizer_location_name?: string | null;
  username: string | null;
};

const ADMIN_EVENT_SELECT =
  'id, organizer_user_id, city_key, venue_key, venue_name, venue_address, venue_latitude, venue_longitude, title, description, category, date_label, time_label, end_time_label, starts_at, ends_at, xp_bonus, language, is_free, is_international, interested_count, going_count, attendee_count, image_kind, image_url, status, created_at, updated_at, review_requested_at, review_previous_snapshot';
const ADMIN_EVENT_LEGACY_GOING_SELECT =
  'id, organizer_user_id, city_key, venue_key, venue_name, venue_address, venue_latitude, venue_longitude, title, description, category, date_label, time_label, end_time_label, starts_at, ends_at, xp_bonus, language, is_free, is_international, interested_count, attendee_count, image_kind, image_url, status, created_at';
const ADMIN_EVENT_LEGACY_COUNTER_SELECT =
  'id, organizer_user_id, city_key, venue_key, venue_name, venue_address, venue_latitude, venue_longitude, title, description, category, date_label, time_label, end_time_label, starts_at, ends_at, xp_bonus, language, is_free, is_international, attendee_count, image_kind, image_url, status, created_at';
const ADMIN_EVENT_LEGACY_TIME_SELECT =
  'id, organizer_user_id, city_key, venue_key, venue_name, venue_address, venue_latitude, venue_longitude, title, description, category, date_label, time_label, xp_bonus, language, is_free, is_international, attendee_count, image_kind, image_url, status, created_at';
const PENDING_EVENT_SELECT =
  'id, organizer_user_id, city_key, venue_name, venue_address, title, description, category, date_label, time_label, end_time_label, image_url, created_at, updated_at, review_requested_at, review_previous_snapshot';
const PENDING_EVENT_LEGACY_SELECT =
  'id, organizer_user_id, city_key, venue_name, venue_address, title, description, category, date_label, time_label, end_time_label, image_url, created_at, updated_at';
const ADMIN_REWARD_SELECT =
  'id, organizer_user_id, city_key, place_name, place_address, place_latitude, place_longitude, title, description, xp_cost, category, image_url, status, created_at, available_from, available_until, available_days, available_start_time, available_end_time';

export async function fetchPendingAdminContent() {
  const [eventsResult, rewardsResult] = await Promise.all([
    queryPendingAdminEvents(),
    supabase
      .from('organizer_rewards')
      .select(
        'id, organizer_user_id, city_key, place_name, place_address, title, description, xp_cost, category, created_at, available_from, available_until, available_days, available_start_time, available_end_time',
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ]);

  if (eventsResult.error || rewardsResult.error) {
    return {
      error: getNetworkAwareErrorMessage(
        eventsResult.error?.message ?? rewardsResult.error?.message,
        'Could not load content.',
      ),
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

async function queryPendingAdminEvents() {
  const queryEvents = (selectColumns: string, includeReviewRequestedSort: boolean) => {
    let query = supabase.from('organizer_events').select(selectColumns).eq('status', 'pending');

    if (includeReviewRequestedSort) {
      query = query.order('review_requested_at', { ascending: false, nullsFirst: false });
    }

    return query.order('updated_at', { ascending: false });
  };

  const result = await queryEvents(PENDING_EVENT_SELECT, true);

  if (isMissingEventReviewChangeColumns(result.error?.message)) {
    return queryEvents(PENDING_EVENT_LEGACY_SELECT, false);
  }

  return result;
}

export async function fetchAdminManagedEvents() {
  const queryManagedEvents = (selectColumns: string) =>
    supabase.from('organizer_events').select(selectColumns).order('created_at', {
      ascending: false,
    });

  let { data, error } = await queryManagedEvents(ADMIN_EVENT_SELECT);

  if (isLegacyAdminEventsShapeError(error?.message)) {
    const legacyGoingResult = await queryManagedEvents(ADMIN_EVENT_LEGACY_GOING_SELECT);
    data = legacyGoingResult.data;
    error = legacyGoingResult.error;
  }

  if (isLegacyAdminEventsShapeError(error?.message)) {
    const legacyCounterResult = await queryManagedEvents(ADMIN_EVENT_LEGACY_COUNTER_SELECT);
    data = legacyCounterResult.data;
    error = legacyCounterResult.error;
  }

  if (isLegacyAdminEventsShapeError(error?.message)) {
    const legacyTimeResult = await queryManagedEvents(ADMIN_EVENT_LEGACY_TIME_SELECT);
    data = legacyTimeResult.data;
    error = legacyTimeResult.error;
  }

  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message), events: [] as AdminManagedEvent[] };
  }

  const rows = (data ?? []) as unknown as AdminManagedEventRow[];
  const organizerProfiles = await fetchOrganizerProfileSummaries(rows);

  return {
    error: null,
    events: rows.map((row) => mapAdminManagedEvent(row, organizerProfiles)),
  };
}

export async function fetchAdminManagedRewards() {
  const { data, error } = await supabase
    .from('organizer_rewards')
    .select(ADMIN_REWARD_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      error: getNetworkAwareErrorMessage(error.message),
      rewards: [] as AdminManagedReward[],
    };
  }

  const rows = (data ?? []) as unknown as AdminManagedRewardRow[];
  const organizerProfiles = await fetchOrganizerProfileSummaries(rows);

  return {
    error: null,
    rewards: rows.map((row) => mapAdminManagedReward(row, organizerProfiles)),
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
  const reviewUpdate = {
    rejection_reason:
      status === 'rejected' ? (rejectionReason ?? 'Rejected by CultureQuest review.') : null,
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminUserId,
    status,
  };

  const result = await supabase
    .from('organizer_events')
    .update({
      ...reviewUpdate,
      review_previous_snapshot: null,
      review_requested_at: null,
    })
    .eq('id', eventId);

  if (isMissingEventReviewChangeColumns(result.error?.message)) {
    const fallbackResult = await supabase
      .from('organizer_events')
      .update(reviewUpdate)
      .eq('id', eventId);

    return { error: getNetworkAwareErrorMessage(fallbackResult.error?.message, '') || null };
  }

  return { error: getNetworkAwareErrorMessage(result.error?.message, '') || null };
}

export async function updateAdminManagedEvent({
  adminUserId,
  eventId,
  input,
}: {
  adminUserId: string;
  eventId: string;
  input: {
    category: EventCategory;
    date: string;
    description: string;
    endTime?: string | null;
    status: OrganizerEventStatus;
    time: string;
    title: string;
    venueAddress?: string | null;
    venueName: string;
    xpBonus: number;
  };
}) {
  const { error } = await supabase
    .from('organizer_events')
    .update({
      category: input.category,
      date_label: input.date,
      description: input.description,
      end_time_label: input.endTime,
      rejection_reason: input.status === 'rejected' ? 'Rejected by CultureQuest admin.' : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      status: input.status,
      time_label: input.time,
      title: input.title,
      venue_address: input.venueAddress,
      venue_name: input.venueName,
      xp_bonus: input.xpBonus,
    })
    .eq('id', eventId);

  return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
}

export async function deleteOrganizerEvent({ eventId }: { eventId: string }) {
  const { error } = await supabase.from('organizer_events').delete().eq('id', eventId);

  return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
}

export async function updateAdminManagedReward({
  adminUserId,
  input,
  rewardId,
}: {
  adminUserId: string;
  input: {
    availableDays: number[];
    availableEndTime: string;
    availableFrom: string;
    availableStartTime: string;
    availableUntil?: string | null;
    category: RewardPartner['category'];
    description: string;
    placeAddress: string;
    placeName: string;
    status: RewardPartnerStatus;
    title: string;
    xpCost: number;
  };
  rewardId: string;
}) {
  const { error } = await supabase
    .from('organizer_rewards')
    .update({
      category: input.category,
      available_days: input.availableDays,
      available_end_time: input.availableEndTime,
      available_from: input.availableFrom,
      available_start_time: input.availableStartTime,
      available_until: input.availableUntil ?? null,
      description: input.description,
      place_address: input.placeAddress,
      place_name: input.placeName,
      rejection_reason: input.status === 'rejected' ? 'Rejected by CultureQuest admin.' : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      status: input.status,
      title: input.title,
      xp_cost: input.xpCost,
    })
    .eq('id', rewardId);

  return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
}

export async function archiveOrganizerReward({ rewardId }: { rewardId: string }) {
  const { error } = await supabase
    .from('organizer_rewards')
    .update({ status: 'archived' })
    .eq('id', rewardId);

  return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
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

  return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
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
    .from('organizer_directory_profiles')
    .select(
      'id, username, avatar_url, city_key, organizer_bio, organizer_location_name, organizer_location_address, organizer_location_latitude, organizer_location_longitude',
    )
    .in('id', organizerIds);

  if (error) {
    const fallbackResult = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', organizerIds);

    if (fallbackResult.error) {
      return {};
    }

    return ((fallbackResult.data ?? []) as ProfileSummaryRow[]).reduce<
      Record<string, ProfileSummaryRow>
    >(
      (profiles, profile) => ({
        ...profiles,
        [profile.id]: profile,
      }),
      {},
    );
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
    changes: buildPendingEventChanges(row),
    date: row.date_label,
    description: row.description,
    endTime: row.end_time_label ?? undefined,
    id: row.id,
    imageUrl: row.image_url,
    organizerAvatarUrl: profile?.avatar_url ?? null,
    organizerName: profile?.username?.trim() || `Organizer ${row.organizer_user_id.slice(0, 8)}`,
    organizerUserId: row.organizer_user_id,
    time: row.time_label,
    title: row.title,
    updatedAt: row.review_requested_at ?? row.updated_at ?? null,
    venueAddress: row.venue_address,
    venueName: row.venue_name,
  };
}

function buildPendingEventChanges(row: PendingEventRow): PendingAdminEventChange[] {
  const snapshot = row.review_previous_snapshot;
  if (!snapshot) return [];

  const changes: PendingAdminEventChange[] = [];

  addEventChange(changes, 'Title', snapshot.title, row.title);
  addEventChange(changes, 'Venue', snapshot.venue_name, row.venue_name);
  addEventChange(changes, 'Address', snapshot.venue_address, row.venue_address);
  addEventChange(changes, 'Category', snapshot.category, row.category);
  addEventChange(changes, 'Date', snapshot.date_label, row.date_label);
  addEventChange(changes, 'Start time', snapshot.time_label, row.time_label);
  addEventChange(changes, 'End time', snapshot.end_time_label, row.end_time_label);
  addEventChange(changes, 'Description', snapshot.description, row.description);
  if (normalizeChangeValue(snapshot.image_url) !== normalizeChangeValue(row.image_url)) {
    changes.push({
      field: 'Photo',
      from: snapshot.image_url ? 'Previous photo' : 'No photo',
      to: row.image_url ? 'Updated photo' : 'No photo',
    });
  }

  return changes;
}

function addEventChange(
  changes: PendingAdminEventChange[],
  field: string,
  from: string | null | undefined,
  to: string | null | undefined,
) {
  const previousValue = normalizeChangeValue(from);
  const nextValue = normalizeChangeValue(to);

  if (previousValue === nextValue) return;

  changes.push({
    field,
    from: previousValue,
    to: nextValue,
  });
}

function normalizeChangeValue(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || 'Empty';
}

function mapPendingReward(
  row: PendingRewardRow,
  profiles: Record<string, ProfileSummaryRow>,
): PendingAdminReward {
  const profile = profiles[row.organizer_user_id];

  return {
    availableDays: row.available_days ?? defaultRewardAvailabilityDays,
    availableEndTime: normalizeDbTime(row.available_end_time) ?? defaultRewardEndTime,
    availableFrom: row.available_from ?? null,
    availableStartTime: normalizeDbTime(row.available_start_time) ?? defaultRewardStartTime,
    availableUntil: row.available_until ?? null,
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

function normalizeDbTime(value?: string | null) {
  return value?.slice(0, 5) ?? null;
}

function mapAdminManagedEvent(
  row: AdminManagedEventRow,
  profiles: Record<string, ProfileSummaryRow>,
): AdminManagedEvent {
  const profile = profiles[row.organizer_user_id];

  return {
    attendeeCount: row.attendee_count ?? 0,
    category: row.category,
    changes: buildPendingEventChanges(row),
    cityId: row.city_key,
    createdAt: row.created_at,
    databaseId: row.id,
    date: row.date_label,
    description: row.description,
    endTime: row.end_time_label ?? undefined,
    endsAt: row.ends_at ?? undefined,
    id: `organizer-${row.id}`,
    imageUrl: row.image_url ?? undefined,
    interestedCount: row.interested_count ?? 0,
    goingCount: row.going_count ?? 0,
    isFeatured: false,
    isFlashQuest: false,
    isFree: row.is_free ?? true,
    isInternational: row.is_international ?? false,
    language: row.language ?? 'en',
    organizerAvatarUrl: profile?.avatar_url ?? null,
    organizerBio: profile?.organizer_bio ?? undefined,
    organizerCityId: row.city_key,
    organizerId: row.organizer_user_id,
    organizerLocationAddress: profile?.organizer_location_address ?? null,
    organizerLocationCoordinates:
      typeof profile?.organizer_location_latitude === 'number' &&
      typeof profile?.organizer_location_longitude === 'number'
        ? {
            latitude: profile.organizer_location_latitude,
            longitude: profile.organizer_location_longitude,
          }
        : null,
    organizerLocationName: profile?.organizer_location_name ?? null,
    organizerImage: row.image_kind ?? 'theater',
    organizerName: profile?.username?.trim() || `Organizer ${row.organizer_user_id.slice(0, 8)}`,
    organizerUserId: row.organizer_user_id,
    reviewRequestedAt: row.review_requested_at ?? null,
    reviewStatus: row.status,
    startsAt: row.starts_at ?? undefined,
    time: row.time_label,
    title: row.title,
    venueAddress: row.venue_address ?? undefined,
    venueCoordinates:
      typeof row.venue_latitude === 'number' && typeof row.venue_longitude === 'number'
        ? { latitude: row.venue_latitude, longitude: row.venue_longitude }
        : undefined,
    venueId: row.venue_key,
    venueName: row.venue_name,
    xpBonus: row.xp_bonus ?? 50,
  };
}

function mapAdminManagedReward(
  row: AdminManagedRewardRow,
  profiles: Record<string, ProfileSummaryRow>,
): AdminManagedReward {
  const profile = profiles[row.organizer_user_id];

  return {
    availableDays: row.available_days ?? defaultRewardAvailabilityDays,
    availableEndTime: normalizeDbTime(row.available_end_time) ?? defaultRewardEndTime,
    availableFrom: row.available_from ?? null,
    availableStartTime: normalizeDbTime(row.available_start_time) ?? defaultRewardStartTime,
    availableUntil: row.available_until ?? null,
    category: row.category,
    cityId: row.city_key,
    createdAt: row.created_at,
    databaseId: row.id,
    description: row.description,
    imageUrl: row.image_url,
    organizerAvatarUrl: profile?.avatar_url ?? null,
    organizerBio: profile?.organizer_bio ?? undefined,
    organizerCityId: row.city_key,
    organizerId: row.organizer_user_id,
    organizerLocationAddress: profile?.organizer_location_address ?? null,
    organizerLocationCoordinates:
      typeof profile?.organizer_location_latitude === 'number' &&
      typeof profile?.organizer_location_longitude === 'number'
        ? {
            latitude: profile.organizer_location_latitude,
            longitude: profile.organizer_location_longitude,
          }
        : null,
    organizerLocationName: profile?.organizer_location_name ?? null,
    organizerName: profile?.username?.trim() || `Organizer ${row.organizer_user_id.slice(0, 8)}`,
    organizerUserId: row.organizer_user_id,
    placeAddress: row.place_address,
    placeName: row.place_name,
    reviewStatus: row.status,
    title: row.title,
    xpCost: row.xp_cost,
  };
}

function isLegacyAdminEventsShapeError(message?: string | null) {
  return (
    !!message &&
    (message.includes('interested_count') ||
      message.includes('going_count') ||
      message.includes('end_time_label') ||
      message.includes('starts_at') ||
      message.includes('ends_at') ||
      message.includes('review_previous_snapshot') ||
      message.includes('review_requested_at') ||
      message.includes('schema cache'))
  );
}

function isMissingEventReviewChangeColumns(message?: string | null) {
  return (
    !!message &&
    (message.includes('review_previous_snapshot') ||
      message.includes('review_requested_at') ||
      message.includes('schema cache'))
  );
}
