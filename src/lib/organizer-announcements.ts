import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export async function publishOrganizerAnnouncement(input: {
  body: string;
  eventId?: string | null;
  title: string;
}) {
  const { error } = await supabase.rpc('publish_organizer_announcement', {
    p_body: input.body,
    p_event_id: input.eventId ?? null,
    p_title: input.title,
  });

  return { error: error ? getNetworkAwareErrorMessage(error.message) : null };
}
