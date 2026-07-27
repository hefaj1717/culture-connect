import {
  type CityId,
  type CultureEvent,
  type EventCategory,
  type EventLanguage,
  type VenueCategory,
  defaultEventXp,
} from '@/data/culture';
import type { PlaceSuggestion } from '@/lib/place-search';
import { fetchOrganizerProfilesByIds, type OrganizerProfile } from '@/lib/organizer-profiles';
import { supabase } from '@/lib/supabase';

export type CreateOrganizerEventInput = {
  cityId: CityId;
  place: PlaceSuggestion;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  endsAt: string;
  endTime: string;
  time: string;
  startsAt: string;
  language: EventLanguage;
  isFree: boolean;
  imageUri?: string | null;
};

type OrganizerEventRow = {
  id: string;
  organizer_user_id: string;
  city_key: CityId;
  venue_key: string;
  venue_name: string;
  venue_address: string | null;
  venue_latitude: number | null;
  venue_longitude: number | null;
  title: string;
  description: string;
  category: EventCategory;
  date_label: string;
  end_time_label?: string | null;
  ends_at?: string | null;
  time_label: string;
  starts_at?: string | null;
  xp_bonus: number;
  language: EventLanguage;
  is_free: boolean;
  is_international: boolean;
  interested_count?: number | null;
  attendee_count: number;
  image_kind: CultureEvent['organizerImage'];
  image_url: string | null;
  check_in_code: string;
  status?: OrganizerEventStatus;
};

const EVENT_IMAGES_BUCKET = 'event-images';
const ORGANIZER_EVENT_SELECT =
  'id, organizer_user_id, city_key, venue_key, venue_name, venue_address, venue_latitude, venue_longitude, title, description, category, date_label, time_label, end_time_label, starts_at, ends_at, xp_bonus, language, is_free, is_international, interested_count, attendee_count, image_kind, image_url, check_in_code';
const LEGACY_ORGANIZER_EVENT_SELECT =
  'id, organizer_user_id, city_key, venue_key, venue_name, venue_address, venue_latitude, venue_longitude, title, description, category, date_label, time_label, xp_bonus, language, is_free, is_international, attendee_count, image_kind, image_url, check_in_code';
const ORGANIZER_EVENT_WITH_STATUS_SELECT = `${ORGANIZER_EVENT_SELECT}, status`;
const LEGACY_ORGANIZER_EVENT_WITH_STATUS_SELECT = `${LEGACY_ORGANIZER_EVENT_SELECT}, status`;

export type OrganizerEventStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ManagedOrganizerEvent = CultureEvent & {
  reviewStatus: OrganizerEventStatus;
};

export async function fetchOrganizerEvents(cityId: CityId) {
  const queryApprovedEvents = (selectColumns: string) =>
    supabase
      .from('organizer_events')
      .select(selectColumns)
      .eq('city_key', cityId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

  let { data, error } = await queryApprovedEvents(ORGANIZER_EVENT_SELECT);

  if (isLegacyOrganizerEventsShapeError(error?.message)) {
    const legacyResult = await queryApprovedEvents(LEGACY_ORGANIZER_EVENT_SELECT);
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    return { events: [] as CultureEvent[], error: error.message };
  }

  const rows = (data ?? []) as unknown as OrganizerEventRow[];
  const profileLookup = await fetchOrganizerProfileLookup(rows);

  return {
    events: rows.map((row) => mapOrganizerEventRow(row, profileLookup[row.organizer_user_id])),
    error: null,
  };
}

export async function fetchMyOrganizerEvents(userId: string, cityId?: CityId) {
  const queryMyEvents = (selectColumns: string) => {
    let query = supabase
      .from('organizer_events')
      .select(selectColumns)
      .eq('organizer_user_id', userId)
      .order('created_at', { ascending: false });

    if (cityId) {
      query = query.eq('city_key', cityId);
    }

    return query;
  };

  let { data, error } = await queryMyEvents(ORGANIZER_EVENT_WITH_STATUS_SELECT);

  if (isLegacyOrganizerEventsShapeError(error?.message)) {
    const legacyResult = await queryMyEvents(LEGACY_ORGANIZER_EVENT_WITH_STATUS_SELECT);
    data = legacyResult.data;
    error = legacyResult.error;
  }

  if (error) {
    return { error: error.message, events: [] as ManagedOrganizerEvent[] };
  }

  const rows = (data ?? []) as unknown as OrganizerEventRow[];
  const profileLookup = await fetchOrganizerProfileLookup(rows);

  return {
    error: null,
    events: rows.map((row) => ({
      ...mapOrganizerEventRow(row, profileLookup[row.organizer_user_id]),
      reviewStatus: row.status ?? 'pending',
    })),
  };
}

export async function createOrganizerEvent(userId: string, input: CreateOrganizerEventInput) {
  const uploadedImage = input.imageUri
    ? await uploadOrganizerEventImage(userId, input.imageUri)
    : null;

  if (uploadedImage?.error) {
    return { error: uploadedImage.error };
  }

  const { error } = await supabase.from('organizer_events').insert({
    organizer_user_id: userId,
    city_key: input.cityId,
    venue_key: input.place.id,
    venue_name: input.place.name,
    venue_address: input.place.address,
    venue_latitude: input.place.latitude,
    venue_longitude: input.place.longitude,
    title: input.title,
    description: input.description,
    category: input.category,
    date_label: input.date,
    end_time_label: input.endTime,
    ends_at: input.endsAt,
    time_label: input.time,
    starts_at: input.startsAt,
    xp_bonus: defaultEventXp,
    language: input.language,
    is_free: input.isFree,
    is_international: input.language !== 'pl',
    image_kind: getImageKind(input.category),
    image_url: uploadedImage?.url ?? null,
    status: 'pending',
  });

  return { error: error?.message ?? null };
}

async function fetchOrganizerProfileLookup(rows: OrganizerEventRow[]) {
  const result = await fetchOrganizerProfilesByIds(rows.map((row) => row.organizer_user_id));

  return result.profiles.reduce<Record<string, OrganizerProfile>>((lookup, profile) => {
    lookup[profile.id] = profile;
    return lookup;
  }, {});
}

function mapOrganizerEventRow(
  row: OrganizerEventRow,
  organizerProfile?: OrganizerProfile,
): CultureEvent {
  return {
    id: `organizer-${row.id}`,
    title: row.title,
    venueId: row.venue_key,
    venueName: row.venue_name,
    category: row.category,
    date: row.date_label,
    endsAt: row.ends_at ?? undefined,
    endTime: row.end_time_label ?? undefined,
    time: row.time_label,
    startsAt: row.starts_at ?? undefined,
    description: row.description,
    xpBonus: defaultEventXp,
    isFeatured: false,
    isFlashQuest: false,
    language: row.language,
    isInternational: row.is_international,
    isFree: row.is_free,
    interestedCount: row.interested_count ?? 0,
    attendeeCount: row.attendee_count,
    organizerCityId: row.city_key,
    organizerId: row.organizer_user_id,
    organizerName: organizerProfile?.name ?? 'Verified CultureQuest organizer',
    organizerImage: row.image_kind,
    organizerAvatarUrl: organizerProfile?.avatarUrl ?? null,
    organizerBio: organizerProfile?.bio,
    organizerLocationAddress: organizerProfile?.locationAddress ?? null,
    organizerLocationCoordinates: organizerProfile?.locationCoordinates ?? null,
    organizerLocationName: organizerProfile?.locationName ?? null,
    imageUrl: row.image_url ?? undefined,
    checkInCode: row.check_in_code,
    venueAddress: row.venue_address ?? undefined,
    venueCoordinates:
      typeof row.venue_latitude === 'number' && typeof row.venue_longitude === 'number'
        ? {
            latitude: row.venue_latitude,
            longitude: row.venue_longitude,
          }
        : undefined,
  };
}

function isLegacyOrganizerEventsShapeError(message?: string | null) {
  return (
    !!message &&
    (message.includes('interested_count') ||
      message.includes('end_time_label') ||
      message.includes('starts_at') ||
      message.includes('ends_at'))
  );
}

async function uploadOrganizerEventImage(userId: string, imageUri: string) {
  try {
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    const extension = getImageExtension(imageUri);
    const contentType = getImageContentType(extension);
    const path = `${userId}/${Date.now()}.${extension}`;

    const { error } = await supabase.storage.from(EVENT_IMAGES_BUCKET).upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      return { url: null, error: error.message };
    }

    const { data } = supabase.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch {
    return { url: null, error: 'Could not upload the event photo.' };
  }
}

function getImageExtension(uri: string) {
  const match = uri.toLowerCase().match(/\.(jpg|jpeg|png|webp)(?:\?|$)/);
  if (!match) return 'jpg';
  return match[1] === 'jpeg' ? 'jpg' : match[1];
}

function getImageContentType(extension: string) {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function getImageKind(category: VenueCategory | EventCategory): CultureEvent['organizerImage'] {
  if (category === 'exhibition') {
    return 'museum';
  }
  if (category === 'workshop') {
    return 'cafe';
  }
  return 'theater';
}
