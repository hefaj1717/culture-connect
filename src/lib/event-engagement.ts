import type { CultureEvent } from '@/data/culture';
import type { UserEventStatus } from '@/lib/event-history';

type NullableEventStatus = UserEventStatus | null | undefined;

export function getEventEngagement(event: CultureEvent, userStatus?: NullableEventStatus) {
  const interestedBase = event.interestedCount ?? 0;
  const attendedBase = event.attendeeCount ?? 0;

  return {
    interested: Math.max(interestedBase, isInterestedStatus(userStatus) ? 1 : 0),
    attended: Math.max(attendedBase, userStatus === 'attended' ? 1 : 0),
  };
}

export function updateEventEngagementCounts(
  events: CultureEvent[],
  eventId: string,
  previousStatus: NullableEventStatus,
  nextStatus: NullableEventStatus,
) {
  if (previousStatus === nextStatus) return events;

  return events.map((event) => {
    if (event.id !== eventId) return event;

    const previousInterested = isInterestedStatus(previousStatus) ? 1 : 0;
    const nextInterested = isInterestedStatus(nextStatus) ? 1 : 0;
    const previousAttended = previousStatus === 'attended' ? 1 : 0;
    const nextAttended = nextStatus === 'attended' ? 1 : 0;

    return {
      ...event,
      interestedCount: Math.max(
        0,
        (event.interestedCount ?? 0) - previousInterested + nextInterested,
      ),
      attendeeCount: Math.max(0, event.attendeeCount - previousAttended + nextAttended),
    };
  });
}

function isInterestedStatus(status: NullableEventStatus) {
  return status === 'interested' || status === 'going';
}
