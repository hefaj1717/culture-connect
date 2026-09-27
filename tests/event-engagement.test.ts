import { updateEventEngagementCounts } from '@/lib/event-engagement';
import type { CultureEvent } from '@/data/culture';

const event: CultureEvent = {
  attendeeCount: 0,
  category: 'concert',
  date: 'Fri, Sep 18',
  description: 'A test event.',
  goingCount: 0,
  id: 'organizer-event-id',
  interestedCount: 0,
  isFeatured: false,
  isFlashQuest: false,
  isFree: true,
  isInternational: false,
  language: 'en',
  organizerImage: 'theater',
  organizerName: 'Organizer',
  qcBonus: 5,
  time: '18:00-20:00',
  title: 'Event',
  venueId: 'venue',
  venueName: 'Venue',
  xpBonus: 50,
};

describe('updateEventEngagementCounts', () => {
  it('updates the displayed count immediately after an RSVP', () => {
    const interested = updateEventEngagementCounts([event], event.id, null, 'interested');
    const going = updateEventEngagementCounts(interested, event.id, 'interested', 'going');

    expect(interested[0]).toMatchObject({ interestedCount: 1, goingCount: 0 });
    expect(going[0]).toMatchObject({ interestedCount: 0, goingCount: 1 });
  });
});
