import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import {
  type AdminManagedEvent,
  type AdminManagedReward,
  archiveOrganizerReward,
  deleteOrganizerEvent,
  fetchAdminManagedEvents,
  fetchAdminManagedRewards,
  fetchPendingAdminContent,
  reviewOrganizerEvent,
  reviewOrganizerReward,
  updateAdminManagedEvent,
  updateAdminManagedReward,
  type PendingAdminEvent,
  type PendingAdminReward,
  type RewardPartnerStatus,
} from '@/lib/admin-moderation';
import type { EventCategory, RewardPartner } from '@/data/culture';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import type { OrganizerEventStatus } from '@/lib/organizer-events';
import { useNetworkStatus } from '@/providers/network-provider';

type ReviewKind = 'event' | 'reward';
type ReviewStatus = 'approved' | 'rejected';

type UseAdminModerationInput = {
  isAdmin: boolean;
  onContentReviewed?: () => void;
  userId?: string;
};

export function useAdminModeration({
  isAdmin,
  onContentReviewed,
  userId,
}: UseAdminModerationInput) {
  const [adminReviewOpen, setAdminReviewOpen] = useState(false);
  const [adminReviewError, setAdminReviewError] = useState<string | null>(null);
  const [adminReviewLoading, setAdminReviewLoading] = useState(false);
  const [adminManageEvents, setAdminManageEvents] = useState<AdminManagedEvent[]>([]);
  const [adminManageRewards, setAdminManageRewards] = useState<AdminManagedReward[]>([]);
  const [adminManageEventsError, setAdminManageEventsError] = useState<string | null>(null);
  const [adminManageEventsLoading, setAdminManageEventsLoading] = useState(false);
  const [adminManageEventsOpen, setAdminManageEventsOpen] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<PendingAdminEvent[]>([]);
  const [pendingRewards, setPendingRewards] = useState<PendingAdminReward[]>([]);
  const [reviewingContentId, setReviewingContentId] = useState<string | null>(null);
  const [savingManagedEventId, setSavingManagedEventId] = useState<string | null>(null);
  const [savingManagedRewardId, setSavingManagedRewardId] = useState<string | null>(null);
  const { isOffline } = useNetworkStatus();

  const loadPendingContent = useCallback(async () => {
    if (!isAdmin) return;

    setAdminReviewLoading(true);
    const result = await fetchPendingAdminContent();
    setAdminReviewLoading(false);

    setPendingEvents(result.events);
    setPendingRewards(result.rewards);
    setAdminReviewError(result.error);
  }, [isAdmin]);

  useEffect(() => {
    if (adminReviewOpen) {
      void loadPendingContent();
    }
  }, [adminReviewOpen, loadPendingContent]);

  useEffect(() => {
    if (isAdmin) {
      void loadPendingContent();
    }
  }, [isAdmin, loadPendingContent]);

  const loadManagedEvents = useCallback(async () => {
    if (!isAdmin) return;

    setAdminManageEventsLoading(true);
    const [eventsResult, rewardsResult] = await Promise.all([
      fetchAdminManagedEvents(),
      fetchAdminManagedRewards(),
    ]);
    setAdminManageEventsLoading(false);

    setAdminManageEvents(eventsResult.events);
    setAdminManageRewards(rewardsResult.rewards);
    setAdminManageEventsError(eventsResult.error ?? rewardsResult.error);
  }, [isAdmin]);

  useEffect(() => {
    if (adminManageEventsOpen) {
      void loadManagedEvents();
    }
  }, [adminManageEventsOpen, loadManagedEvents]);

  function openAdminReview() {
    setAdminReviewError(null);
    setAdminReviewOpen(true);
  }

  function openAdminManageEvents() {
    setAdminManageEventsError(null);
    setAdminManageEventsOpen(true);
  }

  async function reviewContent(kind: ReviewKind, id: string, status: ReviewStatus) {
    if (!userId) {
      setAdminReviewError('Log in again before reviewing content.');
      return;
    }
    if (isOffline) {
      setAdminReviewError(OFFLINE_ERROR_MESSAGE);
      return;
    }

    setReviewingContentId(`${kind}-${id}`);
    const result =
      kind === 'event'
        ? await reviewOrganizerEvent({ adminUserId: userId, eventId: id, status })
        : await reviewOrganizerReward({ adminUserId: userId, rewardId: id, status });
    setReviewingContentId(null);

    if (result.error) {
      setAdminReviewError(result.error);
      return;
    }

    if (kind === 'event') {
      setPendingEvents((current) => current.filter((event) => event.id !== id));
      void loadManagedEvents();
    } else {
      setPendingRewards((current) => current.filter((reward) => reward.id !== id));
      void loadManagedEvents();
    }

    onContentReviewed?.();
    Alert.alert(
      status === 'approved' ? 'Content approved' : 'Content rejected',
      status === 'approved'
        ? 'Students can now see it in the app.'
        : 'The submission has been rejected.',
    );
  }

  async function deleteEvent(id: string) {
    if (!userId) {
      setAdminReviewError('Log in again before deleting events.');
      setAdminManageEventsError('Log in again before deleting events.');
      return;
    }
    if (isOffline) {
      setAdminReviewError(OFFLINE_ERROR_MESSAGE);
      setAdminManageEventsError(OFFLINE_ERROR_MESSAGE);
      return;
    }

    Alert.alert(
      'Delete event?',
      'This permanently removes the organizer event and any related history.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            void deleteEventAfterConfirmation(id);
          },
        },
      ],
    );
  }

  async function deleteEventAfterConfirmation(id: string) {
    setReviewingContentId(`event-delete-${id}`);
    const result = await deleteOrganizerEvent({ eventId: id });
    setReviewingContentId(null);

    if (result.error) {
      setAdminReviewError(result.error);
      setAdminManageEventsError(result.error);
      return;
    }

    setPendingEvents((current) => current.filter((event) => event.id !== id));
    setAdminManageEvents((current) => current.filter((event) => event.databaseId !== id));
    onContentReviewed?.();
    Alert.alert('Event deleted', 'The event has been removed from CultureQuest.');
  }

  async function deleteReward(id: string) {
    if (!userId) {
      setAdminReviewError('Log in again before deleting rewards.');
      setAdminManageEventsError('Log in again before deleting rewards.');
      return;
    }
    if (isOffline) {
      setAdminReviewError(OFFLINE_ERROR_MESSAGE);
      setAdminManageEventsError(OFFLINE_ERROR_MESSAGE);
      return;
    }

    Alert.alert(
      'Archive reward?',
      'This removes the reward from students while keeping redemption history intact.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Archive',
          onPress: () => {
            void deleteRewardAfterConfirmation(id);
          },
        },
      ],
    );
  }

  async function deleteRewardAfterConfirmation(id: string) {
    setReviewingContentId(`reward-delete-${id}`);
    const result = await archiveOrganizerReward({ rewardId: id });
    setReviewingContentId(null);

    if (result.error) {
      setAdminReviewError(result.error);
      setAdminManageEventsError(result.error);
      return;
    }

    setPendingRewards((current) => current.filter((reward) => reward.id !== id));
    setAdminManageRewards((current) =>
      current.map((reward) =>
        reward.databaseId === id ? { ...reward, reviewStatus: 'archived' } : reward,
      ),
    );
    onContentReviewed?.();
    Alert.alert('Reward archived', 'The reward is no longer visible to students.');
  }

  async function saveManagedEvent(
    eventId: string,
    input: {
      category: EventCategory;
      date: string;
      description: string;
      endTime?: string | null;
      status: OrganizerEventStatus;
      time: string;
      title: string;
      venueAddress?: string | null;
      venueName: string;
      xpBonus: number;
    },
  ) {
    if (!userId) {
      setAdminManageEventsError('Log in again before editing events.');
      return { success: false };
    }
    if (isOffline) {
      setAdminManageEventsError(OFFLINE_ERROR_MESSAGE);
      return { success: false };
    }

    setSavingManagedEventId(eventId);
    const result = await updateAdminManagedEvent({ adminUserId: userId, eventId, input });
    setSavingManagedEventId(null);

    if (result.error) {
      setAdminManageEventsError(result.error);
      return { success: false };
    }

    await loadManagedEvents();
    await loadPendingContent();
    onContentReviewed?.();
    Alert.alert('Event updated', 'The event changes have been saved.');
    return { success: true };
  }

  async function saveManagedReward(
    rewardId: string,
    input: {
      category: RewardPartner['category'];
      description: string;
      placeAddress: string;
      placeName: string;
      status: RewardPartnerStatus;
      title: string;
      xpCost: number;
    },
  ) {
    if (!userId) {
      setAdminManageEventsError('Log in again before editing rewards.');
      return { success: false };
    }
    if (isOffline) {
      setAdminManageEventsError(OFFLINE_ERROR_MESSAGE);
      return { success: false };
    }

    setSavingManagedRewardId(rewardId);
    const result = await updateAdminManagedReward({ adminUserId: userId, rewardId, input });
    setSavingManagedRewardId(null);

    if (result.error) {
      setAdminManageEventsError(result.error);
      return { success: false };
    }

    await loadManagedEvents();
    await loadPendingContent();
    onContentReviewed?.();
    Alert.alert('Reward updated', 'The reward changes have been saved.');
    return { success: true };
  }

  return {
    adminManageEvents,
    adminManageEventsError,
    adminManageEventsLoading,
    adminManageEventsOpen,
    adminManageRewards,
    adminReviewError,
    adminReviewLoading,
    adminReviewOpen,
    openAdminReview,
    openAdminManageEvents,
    pendingEvents,
    pendingRewards,
    deleteEvent,
    deleteReward,
    refreshManagedEvents: loadManagedEvents,
    refreshPendingContent: loadPendingContent,
    reviewContent,
    reviewingContentId,
    saveManagedEvent,
    saveManagedReward,
    savingManagedEventId,
    savingManagedRewardId,
    setAdminManageEventsOpen,
    setAdminReviewOpen,
  };
}
