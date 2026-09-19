import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export async function fetchOrganizerFollowStatus(userId: string, organizerId: string) {
  if (!userId || !organizerId || userId === organizerId) {
    return { error: null, isFollowing: false };
  }

  const { data, error } = await supabase
    .from('organizer_follows')
    .select('organizer_user_id')
    .eq('follower_user_id', userId)
    .eq('organizer_user_id', organizerId)
    .maybeSingle();

  if (error) {
    return { error: getNetworkAwareErrorMessage(error.message), isFollowing: false };
  }

  return { error: null, isFollowing: !!data };
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
