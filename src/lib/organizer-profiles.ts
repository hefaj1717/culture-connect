import type { CityId, CultureEvent } from '@/data/culture';
import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type OrganizerProfile = {
  avatarUrl: string | null;
  bio: string;
  cityId: CityId;
  id: string;
  locationAddress: string | null;
  locationCoordinates: { latitude: number; longitude: number } | null;
  locationName: string | null;
  name: string;
};

type OrganizerProfileRow = {
  avatar_url: string | null;
  city_key: CityId;
  id: string;
  organizer_bio: string | null;
  organizer_location_address: string | null;
  organizer_location_latitude: number | null;
  organizer_location_longitude: number | null;
  organizer_location_name: string | null;
  username: string | null;
};

const ORGANIZER_DIRECTORY_SELECT =
  'id, username, avatar_url, city_key, organizer_bio, organizer_location_name, organizer_location_address, organizer_location_latitude, organizer_location_longitude';

export async function fetchOrganizerProfiles(cityId: CityId) {
  const { data, error } = await supabase
    .from('organizer_directory_profiles')
    .select(ORGANIZER_DIRECTORY_SELECT)
    .eq('city_key', cityId)
    .order('username', { ascending: true });

  if (error) {
    return {
      error: getNetworkAwareErrorMessage(error.message),
      profiles: [] as OrganizerProfile[],
    };
  }

  return {
    error: null,
    profiles: ((data ?? []) as OrganizerProfileRow[]).map(mapOrganizerProfileRow),
  };
}

export async function fetchOrganizerProfilesByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];

  if (uniqueIds.length === 0) {
    return { error: null, profiles: [] as OrganizerProfile[] };
  }

  const { data, error } = await supabase
    .from('organizer_directory_profiles')
    .select(ORGANIZER_DIRECTORY_SELECT)
    .in('id', uniqueIds);

  if (error) {
    return {
      error: getNetworkAwareErrorMessage(error.message),
      profiles: [] as OrganizerProfile[],
    };
  }

  return {
    error: null,
    profiles: ((data ?? []) as OrganizerProfileRow[]).map(mapOrganizerProfileRow),
  };
}

export function organizerProfileFromEvent(event: CultureEvent): OrganizerProfile | null {
  if (!event.organizerId) {
    return null;
  }

  return {
    avatarUrl: event.organizerAvatarUrl ?? null,
    bio: event.organizerBio?.trim() || 'Verified CultureQuest organiser.',
    cityId: event.organizerCityId ?? 'leuven',
    id: event.organizerId,
    locationAddress: event.organizerLocationAddress ?? null,
    locationCoordinates: event.organizerLocationCoordinates ?? null,
    locationName: event.organizerLocationName ?? null,
    name: event.organizerName,
  };
}

function mapOrganizerProfileRow(row: OrganizerProfileRow): OrganizerProfile {
  const latitude = row.organizer_location_latitude;
  const longitude = row.organizer_location_longitude;

  return {
    avatarUrl: row.avatar_url,
    bio: row.organizer_bio?.trim() || 'Verified CultureQuest organiser.',
    cityId: row.city_key,
    id: row.id,
    locationAddress: row.organizer_location_address,
    locationCoordinates:
      typeof latitude === 'number' && typeof longitude === 'number'
        ? { latitude, longitude }
        : null,
    locationName: row.organizer_location_name,
    name: row.username?.trim() || 'CultureQuest organiser',
  };
}
