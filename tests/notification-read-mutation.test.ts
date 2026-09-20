import { markNotificationReadWithRollback } from '@/lib/notification-read-mutation';

describe('markNotificationReadWithRollback', () => {
  const notification = { id: 'notification-1', readAt: null };

  it('keeps the optimistic read state after Supabase confirms the update', async () => {
    const applyOptimisticRead = jest.fn();
    const rollback = jest.fn();
    const persist = jest.fn().mockResolvedValue({ error: null });

    const result = await markNotificationReadWithRollback({
      notification,
      persist,
      applyOptimisticRead,
      rollback,
      now: () => '2026-09-20T10:00:00.000Z',
    });

    expect(persist).toHaveBeenCalledWith(['notification-1']);
    expect(applyOptimisticRead).toHaveBeenCalledWith('2026-09-20T10:00:00.000Z');
    expect(rollback).not.toHaveBeenCalled();
    expect(result).toEqual({ error: null, readAt: '2026-09-20T10:00:00.000Z', updated: true });
  });

  it('rolls the notification back and exposes an error when the update fails', async () => {
    const applyOptimisticRead = jest.fn();
    const rollback = jest.fn();

    const result = await markNotificationReadWithRollback({
      notification,
      persist: jest.fn().mockResolvedValue({ error: "You're offline. Check your connection, then try again." }),
      applyOptimisticRead,
      rollback,
      now: () => '2026-09-20T10:00:00.000Z',
    });

    expect(applyOptimisticRead).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(result.error).toContain("You're offline");
    expect(result.updated).toBe(false);
  });

  it('does not write an already-read notification again', async () => {
    const persist = jest.fn();
    const result = await markNotificationReadWithRollback({
      notification: { id: 'notification-1', readAt: '2026-09-19T10:00:00.000Z' },
      persist,
      applyOptimisticRead: jest.fn(),
      rollback: jest.fn(),
    });

    expect(persist).not.toHaveBeenCalled();
    expect(result.updated).toBe(false);
  });
});
