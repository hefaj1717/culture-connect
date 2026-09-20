const mockChannel = {
  on: jest.fn(),
  subscribe: jest.fn(),
};
const mockRemoveChannel = jest.fn();
const mockSupabaseChannel = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: (...args: unknown[]) => mockSupabaseChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

import { subscribeToUserNotifications } from '@/lib/user-notifications';

describe('user notification realtime subscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockReturnValue(mockChannel);
    mockSupabaseChannel.mockReturnValue(mockChannel);
  });

  it('subscribes to inserts for only the current user and maps the new row', () => {
    const onInsert = jest.fn();
    const onStatus = jest.fn();

    const unsubscribe = subscribeToUserNotifications({
      onInsert,
      onStatus,
      userId: 'user-1',
    });

    expect(mockSupabaseChannel).toHaveBeenCalledWith('user-notifications:user-1');
    const [, options, receiveInsert] = mockChannel.on.mock.calls[0];
    expect(options).toEqual({
      event: 'INSERT',
      filter: 'user_id=eq.user-1',
      schema: 'public',
      table: 'user_notifications',
    });

    receiveInsert({
      new: {
        body: 'The time changed.',
        created_at: '2026-09-20T13:00:00.000Z',
        event_id: 'event-1',
        id: 'notice-1',
        read_at: null,
        title: 'Event updated',
        type: 'event_details_updated',
        user_id: 'user-1',
      },
    });
    mockChannel.subscribe.mock.calls[0][0]('SUBSCRIBED');

    expect(onInsert).toHaveBeenCalledWith({
      body: 'The time changed.',
      createdAt: '2026-09-20T13:00:00.000Z',
      eventId: 'event-1',
      id: 'notice-1',
      readAt: null,
      title: 'Event updated',
      type: 'event_details_updated',
    });
    expect(onStatus).toHaveBeenCalledWith('SUBSCRIBED');

    unsubscribe();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });
});
