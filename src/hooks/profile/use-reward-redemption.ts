import { useEffect, useState } from 'react';

import type { RewardPartner } from '@/data/culture';
import { type RedeemedRewardState, rewardRedeemWindowMs } from '@/data/profile';

export function useRewardRedemption() {
  const [selectedReward, setSelectedReward] = useState<RewardPartner | null>(null);
  const [rewardDetailsExpanded, setRewardDetailsExpanded] = useState(false);
  const [redeemedRewards, setRedeemedRewards] = useState<Record<string, RedeemedRewardState>>({});
  const [rewardNow, setRewardNow] = useState(() => Date.now());

  useEffect(() => {
    if (!selectedReward) return;

    const interval = setInterval(() => {
      const nextNow = Date.now();
      setRewardNow(nextNow);
      setRedeemedRewards((current) => {
        const rewardState = current[selectedReward.id];
        if (!rewardState || rewardState.used) return current;
        if (nextNow - rewardState.redeemedAt < rewardRedeemWindowMs) return current;

        return {
          ...current,
          [selectedReward.id]: {
            ...rewardState,
            used: true,
          },
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedReward]);

  const selectedRewardState = selectedReward ? redeemedRewards[selectedReward.id] : undefined;
  const selectedRewardIsUsed = !!selectedRewardState?.used;
  const selectedRewardIsActive = !!selectedRewardState && !selectedRewardIsUsed;
  const selectedRewardRemainingMs =
    selectedRewardState && !selectedRewardIsUsed
      ? Math.max(0, rewardRedeemWindowMs - (rewardNow - selectedRewardState.redeemedAt))
      : 0;

  function redeemSelectedReward() {
    if (!selectedReward) return;

    const redeemedAt = Date.now();
    setRewardNow(redeemedAt);
    setRedeemedRewards((current) => ({
      ...current,
      [selectedReward.id]: {
        redeemedAt,
        used: false,
      },
    }));
  }

  function resetRewardDetailState() {
    setRewardDetailsExpanded(false);
  }

  return {
    redeemSelectedReward,
    resetRewardDetailState,
    rewardDetailsExpanded,
    selectedReward,
    selectedRewardIsActive,
    selectedRewardIsUsed,
    selectedRewardRemainingMs,
    selectedRewardState,
    setRewardDetailsExpanded,
    setSelectedReward,
  };
}
