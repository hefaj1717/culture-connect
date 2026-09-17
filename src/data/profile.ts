import type { RewardPartner } from '@/data/culture';

export const rewardRedeemWindowMs = 5 * 60 * 1000;

export const xpLevels = [
  { name: 'Newcomer', minXp: 0 },
  { name: 'Explorer', minXp: 200 },
  { name: 'Connector', minXp: 600 },
  { name: 'Influencer', minXp: 1200 },
  { name: 'Tastemaker', minXp: 2000 },
  { name: 'City Legend', minXp: 3200 },
];

export type RedeemedRewardState = {
  code: string;
  expiresAt: number;
  redeemedAt: number;
  used: boolean;
  usedAt: number | null;
};

export function getXpLevelProgress(xp: number) {
  const currentLevel = [...xpLevels].reverse().find((level) => xp >= level.minXp) ?? xpLevels[0];
  const currentIndex = xpLevels.findIndex((level) => level.name === currentLevel.name);
  const nextLevel = xpLevels[currentIndex + 1] ?? null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel,
      progressPercent: 100,
      xpToNext: 0,
    };
  }

  const levelSpan = nextLevel.minXp - currentLevel.minXp;
  const xpInsideLevel = xp - currentLevel.minXp;
  const progressPercent = Math.min(100, Math.max(0, (xpInsideLevel / levelSpan) * 100));

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    xpToNext: nextLevel.minXp - xp,
  };
}

export function getRewardPickupCode(reward: RewardPartner) {
  return `CQ-${
    reward.id
      .replace(/[^a-z0-9]/gi, '')
      .slice(-4)
      .toUpperCase() || 'REWD'
  }`;
}

export function formatRewardTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
