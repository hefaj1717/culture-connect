export type ReadableNotification = {
  id: string;
  readAt: string | null;
};

type ReadMutationResult = {
  error: string | null;
};

/**
 * Keeps the optimistic UI update and its rollback together so a notification
 * never remains visually read when Supabase rejected the write.
 */
export async function markNotificationReadWithRollback<T extends ReadableNotification>({
  notification,
  persist,
  applyOptimisticRead,
  rollback,
  now = () => new Date().toISOString(),
}: {
  notification: T;
  persist: (notificationIds: string[]) => Promise<ReadMutationResult>;
  applyOptimisticRead: (readAt: string) => void;
  rollback: () => void;
  now?: () => string;
}) {
  if (notification.readAt) {
    return { error: null, readAt: notification.readAt, updated: false };
  }

  const readAt = now();
  applyOptimisticRead(readAt);

  const result = await persist([notification.id]);
  if (result.error) {
    rollback();
    return { error: result.error, readAt: null, updated: false };
  }

  return { error: null, readAt, updated: true };
}
