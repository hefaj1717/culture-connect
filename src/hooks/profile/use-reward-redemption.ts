import { useEffect, useState } from 'react';

import type { RewardPartner } from '@/data/culture';
import { type RedeemedRewardState } from '@/data/profile';
import { OFFLINE_ERROR_MESSAGE } from '@/lib/network-errors';
import { fetchRewardRedemptions, redeemOrganizerReward } from '@/lib/reward-redemptions';
import { isRewardCurrentlyAvailable } from '@/lib/reward-availability';
import { useNetworkStatus } from '@/providers/network-provider';

export function useRewardRedemption({
  onUserQcChange,
  rewards,
  userId,
  userQc,
}: {
  onUserQcChange?: (nextQc: number) => void;
  rewards: RewardPartner[];
  userId?: string;
  userQc: number;
}) {
  const [selectedReward, setSelectedReward] = useState<RewardPartner | null>(null);
  const [rewardDetailsExpanded, setRewardDetailsExpanded] = useState(false);
  const [redeemedRewards, setRedeemedRewards] = useState<Record<string, RedeemedRewardState>>({});
  const [rewardRedeemError, setRewardRedeemError] = useState<string | null>(null);
  const [rewardRedemptionsError, setRewardRedemptionsError] = useState<string | null>(null);
  const [rewardRedeeming, setRewardRedeeming] = useState(false);
  const [rewardNow, setRewardNow] = useState(() => Date.now());
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    if (!userId || rewards.length === 0) {
      setRedeemedRewards({});
      setRewardRedemptionsError(null);
      return;
    }

    let active = true;

    async function loadRedemptions() {
      const result = await fetchRewardRedemptions(rewards.map((reward) => reward.id));
      if (!active) return;

      setRewardRedemptionsError(result.error);
      if (!result.error) {
        setRedeemedRewards(result.redemptions);
      }
    }

    loadRedemptions();

    return () => {
      active = false;
    };
  }, [rewards, userId]);

  useEffect(() => {
    if (!selectedReward) return;
    setRewardRedeemError(null);

    const interval = setInterval(() => {
      const nextNow = Date.now();
      setRewardNow(nextNow);
      setRedeemedRewards((current) => {
        const rewardState = current[selectedReward.id];
        if (!rewardState || rewardState.used) return current;
        if (nextNow < rewardState.expiresAt) return current;

        return {
          ...current,
          [selectedReward.id]: {
            ...rewardState,
            used: true,
            usedAt: rewardState.usedAt ?? rewardState.expiresAt,
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedReward]);

  const selectedRewardState = selectedReward ? redeemedRewards[selectedReward.id] : undefined;
  const selectedRewardIsUsed = !!selectedRewardState?.used;
  const selectedRewardIsActive = !!selectedRewardState && !selectedRewardIsUsed;
  const selectedRewardIsAvailableNow = selectedReward
    ? isRewardCurrentlyAvailable(selectedReward, new Date(rewardNow))
    : false;
  const selectedRewardCanRedeem =
    !!selectedReward &&
    !selectedRewardState &&
    userQc >= selectedReward.qcCost &&
    selectedRewardIsAvailableNow;
  const selectedRewardQcNeeded = selectedReward ? Math.max(0, selectedReward.qcCost - userQc) : 0;
  const selectedRewardRemainingMs =
    selectedRewardState && !selectedRewardIsUsed
      ? Math.max(0, selectedRewardState.expiresAt - rewardNow)
      : 0;
  const selectedRewardPickupCode = selectedRewardState?.code ?? null;

  async function redeemSelectedReward() {
    if (!selectedReward) return;
    if (selectedRewardState) return;
    if (isOffline) {
      setRewardRedeemError(OFFLINE_ERROR_MESSAGE);
      return;
    }
    if (userQc < selectedReward.qcCost) {
      setRewardRedeemError(
        `You need ${selectedRewardQcNeeded.toLocaleString()} more CultureQuest Credits to redeem this reward.`,
      );
      return;
    }
    if (!isRewardCurrentlyAvailable(selectedReward)) {
      setRewardRedeemError('This reward is not available at this time.');
      return;
    }

    setRewardRedeeming(true);
    setRewardRedeemError(null);
    const result = await redeemOrganizerReward(selectedReward.id);
    setRewardRedeeming(false);

    if (result.error || !result.redemption) {
      setRewardRedeemError(result.error);
      if (typeof result.totalQc === 'number') onUserQcChange?.(result.totalQc);
      return;
    }

    setRewardNow(Date.now());
    setRedeemedRewards((current) => ({
      ...current,
      [selectedReward.id]: result.redemption,
    }));
    if (typeof result.totalQc === 'number') onUserQcChange?.(result.totalQc);
  }

  function resetRewardDetailState() {
    setRewardDetailsExpanded(false);
    setRewardRedeemError(null);
  }

  return {
    redeemedRewards,
    redeemSelectedReward,
    resetRewardDetailState,
    rewardRedeemError,
    rewardRedeeming,
    rewardRedemptionsError,
    rewardDetailsExpanded,
    selectedReward,
    selectedRewardCanRedeem,
    selectedRewardIsActive,
    selectedRewardIsAvailableNow,
    selectedRewardIsUsed,
    selectedRewardPickupCode,
    selectedRewardRemainingMs,
    selectedRewardState,
    selectedRewardQcNeeded,
    setRewardDetailsExpanded,
    setSelectedReward,
  };
}
