import type { CultureEvent } from '@/data/culture';
import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type UserEventStatus = 'interested' | 'going' | 'attended';

export type UserEventHistoryItem = {
  event: CultureEvent;
  status: UserEventStatus;
};

type UserEventResponseRow = {
  event_id: string;
  status: UserEventStatus;
};

export function getOrganizerEventDatabaseId(eventId: string) {
  return eventId.startsWith('organizer-') ? eventId.replace(/^organizer-/, '') : null;
}

export async function fetchUserEventResponses(userId: string) {
  const { data, error } = await supabase
    .from('user_event_responses')
    .select('event_id, status')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    return {
      error: getNetworkAwareErrorMessage(error.message),
      responses: {} as Record<string, UserEventStatus>,
    };
  }

  const responses = ((data ?? []) as UserEventResponseRow[]).reduce<
    Record<string, UserEventStatus>
  >((current, row) => {
    return {
      ...current,
      [`organizer-${row.event_id}`]: row.status,
    };
  }, {});

  return { error: null, responses };
}

export async function setUserEventResponse(
  userId: string,
  eventId: string,
  status: UserEventStatus,
) {
  const databaseEventId = getOrganizerEventDatabaseId(eventId);
  if (!databaseEventId) {
    return { error: null };
  }

  const { error } = await supabase.from('user_event_responses').upsert(
    {
      event_id: databaseEventId,
      status,
      user_id: userId,
    },
    { onConflict: 'user_id,event_id' },
  );

  return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
}

export async function removeUserEventResponse(userId: string, eventId: string) {
  const databaseEventId = getOrganizerEventDatabaseId(eventId);
  if (!databaseEventId) {
    return { error: null };
  }

  const { error } = await supabase
    .from('user_event_responses')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', databaseEventId);

  return { error: getNetworkAwareErrorMessage(error?.message, '') || null };
}

export function buildUserEventHistory(
  events: CultureEvent[],
  responses: Record<string, UserEventStatus>,
  checkedInEventIds: string[],
): UserEventHistoryItem[] {
  const checkedIn = new Set(checkedInEventIds);

  return events
    .map((event) => {
      const status = checkedIn.has(event.id) ? 'attended' : responses[event.id];

      if (!status) return null;
      if (isEventEnded(event) && status !== 'attended') return null;

      return {
        event,
        status,
      };
    })
    .filter((item): item is UserEventHistoryItem => !!item);
}

function isEventEnded(event: CultureEvent) {
  if (!event.endsAt) return false;

  const endsAt = Date.parse(event.endsAt);
  if (Number.isNaN(endsAt)) return false;

  return endsAt <= Date.now();
}
