import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { fetchOrganizerProfilesByIds, type OrganizerProfile } from '@/lib/organizer-profiles';
import { supabase } from '@/lib/supabase';

export async function fetchFollowedOrganizerProfiles() {
  const { data, error } = await supabase
    .from('organizer_follows')
    .select('organizer_user_id')
    .order('created_at', { ascending: false });

  if (error) {
    return {
      error: getNetworkAwareErrorMessage(error.message),
      profiles: [] as OrganizerProfile[],
    };
  }

  const organizerIds = (data ?? []).map((follow) => follow.organizer_user_id as string);
  const profilesResult = await fetchOrganizerProfilesByIds(organizerIds);
  if (profilesResult.error) return profilesResult;

  const profilesById = new Map(profilesResult.profiles.map((profile) => [profile.id, profile]));
  return {
    error: null,
    profiles: organizerIds
      .map((organizerId) => profilesById.get(organizerId))
      .filter((profile): profile is OrganizerProfile => !!profile),
  };
}

export async function fetchOrganizerFollowStatus(userId: string, organizerId: string) {
  if (!userId || !organizerId || userId === organizerId) {
    return { announcementsMuted: false, error: null, isFollowing: false };
  }

  const { data, error } = await supabase
    .from('organizer_follows')
    .select('organizer_user_id, announcements_muted')
    .eq('follower_user_id', userId)
    .eq('organizer_user_id', organizerId)
    .maybeSingle();

  if (error) {
    return {
      announcementsMuted: false,
      error: getNetworkAwareErrorMessage(error.message),
      isFollowing: false,
    };
  }

  return {
    announcementsMuted: data?.announcements_muted ?? false,
    error: null,
    isFollowing: !!data,
  };
}

export async function setOrganizerAnnouncementMuted(organizerId: string, muted: boolean) {
  const { error } = await supabase.rpc('set_organizer_announcement_muted', {
    p_muted: muted,
    p_organizer_user_id: organizerId,
  });

  return { error: error ? getNetworkAwareErrorMessage(error.message) : null };
}

export async function followOrganizer(userId: string, organizerId: string) {
  if (!userId || userId === organizerId) {
    return { error: 'You cannot follow this organizer.' };
  }

  const { error } = await supabase.from('organizer_follows').upsert(
    {
      follower_user_id: userId,
      organizer_user_id: organizerId,
    },
    {
      ignoreDuplicates: true,
      onConflict: 'follower_user_id,organizer_user_id',
    },
  );

  return { error: error ? getNetworkAwareErrorMessage(error.message) : null };
}

export async function unfollowOrganizer(userId: string, organizerId: string) {
  const { error } = await supabase
    .from('organizer_follows')
    .delete()
    .eq('follower_user_id', userId)
    .eq('organizer_user_id', organizerId);

  return { error: error ? getNetworkAwareErrorMessage(error.message) : null };
}
