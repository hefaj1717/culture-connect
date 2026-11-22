import { CalendarCheck2, HeartHandshake, Route, Sparkles } from 'lucide-react-native';

import type { AchievementBadge } from '@/components/profile/badges';
import type { DigitalPassportProgress } from '@/lib/digital-passport';

const eventMilestones = [
  [5, 'City Regular', 'Attend 5 verified events.'],
  [20, 'Culture Collector', 'Attend 20 verified events.'],
  [50, 'City Fixture', 'Attend 50 verified events.'],
  [100, 'Culture Champion', 'Attend 100 verified events.'],
  [500, 'Culture Legend', 'Attend 500 verified events.'],
] as const;

const questMilestones = [
  [3, 'Trail Starter', 'Complete 3 city quests.'],
  [10, 'Route Rover', 'Complete 10 city quests.'],
  [30, 'Quest Seeker', 'Complete 30 city quests.'],
  [50, 'Trailblazer', 'Complete 50 city quests.'],
] as const;

export function buildPassportAchievements(
  progress: DigitalPassportProgress,
): AchievementBadge[] {
  return [
    {
      category: 'status',
      color: '#1F3A44',
      description: 'Joined CultureQuest during the founding beta period in 2026.',
      icon: Sparkles,
      id: 'beta-explorer',
      progress: progress.betaUser ? 'Unlocked' : 'Available until 31 Dec 2026',
      title: 'Founding Explorer',
      unlocked: progress.betaUser,
    },
    ...eventMilestones.map(([target, title, description]) =>
      createMilestoneBadge({
        category: 'culture',
        color: '#A63446',
        current: progress.eventsCompleted,
        description,
        icon: CalendarCheck2,
        id: `events-${target}`,
        target,
        title,
      }),
    ),
    ...questMilestones.map(([target, title, description]) =>
      createMilestoneBadge({
        category: 'quest',
        color: '#1F3A44',
        current: progress.questsCompleted,
        description,
        icon: Route,
        id: `quests-${target}`,
        target,
        title,
      }),
    ),
    createMilestoneBadge({
      category: 'social',
      color: '#1F3A44',
      current: progress.sameOrganizerEvents,
      description: 'Attend 5 verified events from the same organizer.',
      icon: HeartHandshake,
      id: 'organizer-loyalist',
      target: 5,
      title: 'Local Loyalist',
    }),
    ...progress.universityRankingAwards.map((award) => ({
      category: 'culture' as const,
      color: getRankingAwardColor(award.rank),
      description: `${award.universityName} finished ${getOrdinal(award.rank)} in the ${award.academicYear} campus ranking.`,
      icon: award.rank === 1 ? Sparkles : CalendarCheck2,
      id: `campus-ranking-${award.academicYear}-${award.cityKey}-${award.rank}`,
      progress: `${award.academicYear} · ${getRankingPlace(award.rank)}`,
      title: getRankingAwardTitle(award.rank),
      unlocked: true,
    })),
  ];
}

function createMilestoneBadge({
  category,
  color,
  current,
  description,
  icon,
  id,
  target,
  title,
}: Omit<AchievementBadge, 'progress' | 'unlocked'> & { current: number; target: number }): AchievementBadge {
  return {
    category,
    color,
    description,
    icon,
    id,
    progress: `${Math.min(current, target)} / ${target}`,
    title,
    unlocked: current >= target,
  };
}

function getRankingAwardTitle(rank: 1 | 2 | 3) {
  if (rank === 1) return 'Campus Champions';
  if (rank === 2) return 'Campus Silver';
  return 'Campus Bronze';
}

function getRankingPlace(rank: 1 | 2 | 3) {
  return rank === 1 ? '1st place' : rank === 2 ? '2nd place' : '3rd place';
}

function getOrdinal(rank: 1 | 2 | 3) {
  return rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';
}

function getRankingAwardColor(rank: 1 | 2 | 3) {
  if (rank === 1) return '#A63446';
  if (rank === 2) return '#1F3A44';
  return '#1F3A44';
}
