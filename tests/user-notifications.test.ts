const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { fetchUserNotifications, markUserNotificationsRead } from '@/lib/user-notifications';

describe('user notifications data layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps database rows to the app notification model', async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        {
          body: 'Your saved event changed time.',
          created_at: '2026-09-20T10:00:00.000Z',
          event_id: 'event-1',
          id: 'notification-1',
          read_at: null,
          title: 'Event updated',
          type: 'event_details_updated',
        },
      ],
      error: null,
    });
    const order = jest.fn().mockReturnValue({ limit });
    const select = jest.fn().mockReturnValue({ order });
    mockFrom.mockReturnValue({ select });

    await expect(fetchUserNotifications()).resolves.toEqual({
      error: null,
      notifications: [
        {
          body: 'Your saved event changed time.',
          createdAt: '2026-09-20T10:00:00.000Z',
          eventId: 'event-1',
          id: 'notification-1',
          readAt: null,
          title: 'Event updated',
          type: 'event_details_updated',
        },
      ],
    });
    expect(mockFrom).toHaveBeenCalledWith('user_notifications');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns a user-safe error when fetching notifications fails', async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
    const order = jest.fn().mockReturnValue({ limit });
    const select = jest.fn().mockReturnValue({ order });
    mockFrom.mockReturnValue({ select });

    await expect(fetchUserNotifications()).resolves.toEqual({
      error: "You're offline. Check your connection, then try again.",
      notifications: [],
    });
  });

  it('only updates unread notifications and returns a write error to the caller', async () => {
    const is = jest.fn().mockResolvedValue({ error: { message: 'Network request failed' } });
    const inFilter = jest.fn().mockReturnValue({ is });
    const update = jest.fn().mockReturnValue({ in: inFilter });
    mockFrom.mockReturnValue({ update });

    const result = await markUserNotificationsRead(['notification-1']);

    expect(mockFrom).toHaveBeenCalledWith('user_notifications');
    expect(inFilter).toHaveBeenCalledWith('id', ['notification-1']);
    expect(is).toHaveBeenCalledWith('read_at', null);
    expect(result.error).toBe("You're offline. Check your connection, then try again.");
  });
});
