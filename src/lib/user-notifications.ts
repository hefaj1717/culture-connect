import { getNetworkAwareErrorMessage } from '@/lib/network-errors';
import { supabase } from '@/lib/supabase';

export type UserNotification = {
  body: string;
  createdAt: string;
  eventId: string | null;
  id: string;
  readAt: string | null;
  title: string;
  type: 'organizer_event_published' | 'organizer_event_updated' | 'organizer_event_deleted';
};

type UserNotificationRow = {
  body: string;
  created_at: string;
  event_id: string | null;
  id: string;
  read_at: string | null;
  title: string;
  type: UserNotification['type'];
};

export async function fetchUserNotifications() {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('id, type, title, body, event_id, read_at, created_at')
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
    notifications: ((data ?? []) as UserNotificationRow[]).map((notification) => ({
      body: notification.body,
      createdAt: notification.created_at,
      eventId: notification.event_id,
      id: notification.id,
      readAt: notification.read_at,
      title: notification.title,
      type: notification.type,
    })),
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
