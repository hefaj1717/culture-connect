import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import {
  fetchPendingAdminContent,
  reviewOrganizerEvent,
  reviewOrganizerReward,
  type PendingAdminEvent,
  type PendingAdminReward,
} from '@/lib/admin-moderation';

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
  const [pendingEvents, setPendingEvents] = useState<PendingAdminEvent[]>([]);
  const [pendingRewards, setPendingRewards] = useState<PendingAdminReward[]>([]);
  const [reviewingContentId, setReviewingContentId] = useState<string | null>(null);

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

  function openAdminReview() {
    setAdminReviewError(null);
    setAdminReviewOpen(true);
  }

  async function reviewContent(kind: ReviewKind, id: string, status: ReviewStatus) {
    if (!userId) {
      setAdminReviewError('Log in again before reviewing content.');
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
    } else {
      setPendingRewards((current) => current.filter((reward) => reward.id !== id));
    }

    onContentReviewed?.();
    Alert.alert(
      status === 'approved' ? 'Content approved' : 'Content rejected',
      status === 'approved'
        ? 'Students can now see it in the app.'
        : 'The submission has been rejected.',
    );
  }

  return {
    adminReviewError,
    adminReviewLoading,
    adminReviewOpen,
    openAdminReview,
    pendingEvents,
    pendingRewards,
    refreshPendingContent: loadPendingContent,
    reviewContent,
    reviewingContentId,
    setAdminReviewOpen,
  };
}
