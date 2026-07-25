import {
  Building2,
  CalendarPlus,
  Coffee,
  Compass,
  Crown,
  Gift,
  Globe,
  Sparkles,
  TicketCheck,
  Trophy,
} from 'lucide-react-native';

import type { AchievementBadge } from '@/components/profile/badges';
import { Colors } from '@/constants/theme';
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
  redeemedAt: number;
  used: boolean;
};

export const achievementBadges: AchievementBadge[] = [
  {
    id: 'first-quest',
    title: 'First Quest',
    description: 'Attend your first CultureQuest event.',
    progress: '0 / 1',
    unlocked: false,
    icon: TicketCheck,
    color: Colors.light.primary,
  },
  {
    id: 'culture-regular',
    title: 'Culture Regular',
    description: 'Attend 10 events across your city.',
    progress: '0 / 10',
    unlocked: false,
    icon: CalendarPlus,
    color: Colors.light.primary,
  },
  {
    id: 'reward-hunter',
    title: 'Reward Hunter',
    description: 'Redeem 10 rewards from local partners.',
    progress: '0 / 10',
    unlocked: false,
    icon: Gift,
    color: Colors.light.primary,
  },
  {
    id: 'museum-mind',
    title: 'Museum Mind',
    description: 'Check in at 5 museum or gallery events.',
    progress: '0 / 5',
    unlocked: false,
    icon: Building2,
    color: Colors.light.primary,
  },
  {
    id: 'city-explorer',
    title: 'City Explorer',
    description: 'Visit 8 different venues in one city.',
    progress: '0 / 8',
    unlocked: false,
    icon: Compass,
    color: Colors.light.primary,
  },
  {
    id: 'social-spark',
    title: 'Social Spark',
    description: 'Mark Going on 5 events before attending.',
    progress: '0 / 5',
    unlocked: false,
    icon: Sparkles,
    color: Colors.light.primary,
  },
  {
    id: 'international-eye',
    title: 'International Eye',
    description: 'Join 3 multilingual or international events.',
    progress: '0 / 3',
    unlocked: false,
    icon: Globe,
    color: Colors.light.primary,
  },
  {
    id: 'coffee-route',
    title: 'Coffee Route',
    description: 'Redeem rewards at 3 cafe partners.',
    progress: '0 / 3',
    unlocked: false,
    icon: Coffee,
    color: Colors.light.primary,
  },
  {
    id: 'top-week',
    title: 'Top 10 Week',
    description: 'Reach the weekly city leaderboard top 10.',
    progress: 'Not ranked',
    unlocked: false,
    icon: Trophy,
    color: Colors.light.primary,
  },
  {
    id: 'founding-student',
    title: 'Founding Student',
    description: 'Join CultureQuest during the pilot season.',
    progress: 'Locked',
    unlocked: false,
    icon: Crown,
    color: Colors.light.primary,
  },
];

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
