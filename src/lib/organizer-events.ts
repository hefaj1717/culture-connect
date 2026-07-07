import {
  type CityId,
  type CultureEvent,
  type EventCategory,
  type EventLanguage,
  type Venue,
} from '@/data/culture';
import { supabase } from '@/lib/supabase';

export type CreateOrganizerEventInput = {
  cityId: CityId;
  venue: Venue;
  title: string;
  description: string;
  category: EventCategory;
  date: string;
  time: string;
  xpBonus: number;
  language: EventLanguage;
  isFree: boolean;
};

type OrganizerEventRow = {
  id: string;
  city_key: CityId;
  venue_key: string;
  venue_name: string;
  title: string;
  description: string;
  category: EventCategory;
  date_label: string;
  time_label: string;
  xp_bonus: number;
  language: EventLanguage;
  is_free: boolean;
  is_international: boolean;
  attendee_count: number;
  image_kind: CultureEvent['organizerImage'];
  check_in_code: string;
};

export async function fetchOrganizerEvents(cityId: CityId) {
  const { data, error } = await supabase
    .from('organizer_events')
    .select(
      'id, city_key, venue_key, venue_name, title, description, category, date_label, time_label, xp_bonus, language, is_free, is_international, attendee_count, image_kind, check_in_code',
    )
    .eq('city_key', cityId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    return { events: [] as CultureEvent[], error: error.message };
  }

  return {
    events: (data ?? []).map(mapOrganizerEventRow),
    error: null,
  };
}

export async function createOrganizerEvent(userId: string, input: CreateOrganizerEventInput) {
  const { error } = await supabase.from('organizer_events').insert({
    organizer_user_id: userId,
    city_key: input.cityId,
    venue_key: input.venue.id,
    venue_name: input.venue.name,
    title: input.title,
    description: input.description,
    category: input.category,
    date_label: input.date,
    time_label: input.time,
    xp_bonus: input.xpBonus,
    language: input.language,
    is_free: input.isFree,
    is_international: input.language !== 'pl',
    image_kind: getImageKind(input.venue.category),
    status: 'published',
  });

  return { error: error?.message ?? null };
}

function mapOrganizerEventRow(row: OrganizerEventRow): CultureEvent {
  return {
    id: `organizer-${row.id}`,
    title: row.title,
    venueId: row.venue_key,
    venueName: row.venue_name,
    category: row.category,
    date: row.date_label,
    time: row.time_label,
    description: row.description,
    xpBonus: row.xp_bonus,
    isFeatured: false,
    isFlashQuest: false,
    language: row.language,
    isInternational: row.is_international,
    isFree: row.is_free,
    attendeeCount: row.attendee_count,
    organizerName: 'Verified CultureQuest organizer',
    organizerImage: row.image_kind,
    checkInCode: row.check_in_code,
  };
}

function getImageKind(category: Venue['category']): CultureEvent['organizerImage'] {
  if (category === 'cafe' || category === 'bar' || category === 'shop') {
    return 'cafe';
  }
  if (category === 'museum' || category === 'gallery' || category === 'landmark') {
    return 'museum';
  }
  return 'theater';
}
