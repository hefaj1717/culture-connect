const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import {
  buildUserEventHistory,
  getOrganizerEventDatabaseId,
  setUserEventResponse,
} from '@/lib/event-history';

describe('event RSVP data layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('never sends a mock event id to Supabase', async () => {
    await expect(setUserEventResponse('user-1', 'local-event', 'going')).resolves.toEqual({ error: null });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(getOrganizerEventDatabaseId('organizer-event-1')).toBe('event-1');
  });

  it('upserts an RSVP against the database event id', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert });

    await expect(setUserEventResponse('user-1', 'organizer-event-1', 'going')).resolves.toEqual({
      error: null,
    });
    expect(upsert).toHaveBeenCalledWith(
      { event_id: 'event-1', status: 'going', user_id: 'user-1' },
      { onConflict: 'user_id,event_id' },
    );
  });

  it('hides ended events until a confirmed check-in exists', () => {
    const event = { id: 'organizer-event-1', endsAt: '2020-01-01T00:00:00.000Z' } as never;

    expect(buildUserEventHistory([event], { 'organizer-event-1': 'going' }, [])).toEqual([]);
    expect(buildUserEventHistory([event], { 'organizer-event-1': 'going' }, ['organizer-event-1'])).toEqual([
      { event, status: 'attended' },
    ]);
  });
});
