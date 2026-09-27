import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type UserNotification = {
  body: string;
  createdAt: string;
  eventId: string | null;
  rewardId: string | null;
  id: string;
  readAt: string | null;
  title: string;
  type:
    | 'event_details_updated'
    | 'organizer_announcement'
    | 'organizer_event_published'
    | 'organizer_event_updated'
    | 'organizer_event_deleted'
    | 'organizer_reward_reviewed'
    | 'organizer_reward_updated';
};

type UserNotificationRow = {
  body: string;
  created_at: string;
  event_id: string | null;
  reward_id: string | null;
  id: string;
  read_at: string | null;
  title: string;
  type: UserNotification['type'];
};

type UserNotificationRealtimeRow = UserNotificationRow & {
  user_id: string;
};

type RealtimeNotificationSubscription = {
  onInsert: (notification: UserNotification) => void;
  onStatus?: (status: string) => void;
  userId: string;
};

function toUserNotification(notification: UserNotificationRow): UserNotification {
  return {
    body: notification.body,
    createdAt: notification.created_at,
    eventId: notification.event_id,
    rewardId: notification.reward_id,
    id: notification.id,
    readAt: notification.read_at,
    title: notification.title,
    type: notification.type,
  };
}

export async function fetchUserNotifications() {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, type, title, body, event_id, reward_id, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return {
      error: getNetworkAwareErrorMessage(error.message),
      notifications: [] as UserNotification[],
    };
  }

  return {
    error: null,
    notifications: ((data ?? []) as UserNotificationRow[]).map(toUserNotification),
  };
}

/**
 * Keeps the in-app inbox fresh while the user is signed in. The database RLS
 * policy and `user_id` filter mean this channel can only receive that user's rows.
 */
export function subscribeToUserNotifications({
  onInsert,
  onStatus,
  userId,
}: RealtimeNotificationSubscription) {
  const channel = supabase
    .channel(`user-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        filter: `user_id=eq.${userId}`,
        schema: 'public',
        table: 'user_notifications',
      },
      (payload) => {
        onInsert(toUserNotification(payload.new as UserNotificationRealtimeRow));
      },
    )
    .subscribe((status) => onStatus?.(status));

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function markUserNotificationsRead(notificationIds: string[]) {
  if (notificationIds.length === 0) return { error: null };

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', notificationIds)
    .is('read_at', null);

  return { error: error ? getNetworkAwareErrorMessage(error.message) : null };
}
