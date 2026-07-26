import { Pressable, ScrollView, Text, View } from 'react-native';

import { PassportBadge, type AchievementBadge } from '@/components/profile/badges';
import { OrganizerStatusCard, OrganizerVerifiedBadge } from '@/components/profile/organizer-status';
import { RankAvatar } from '@/components/profile/profile-avatar';
import { RewardPartnerRow } from '@/components/profile/reward-partner-row';
import type { CultureEvent, RewardPartner } from '@/data/culture';
import type { UserEventHistoryItem, UserEventStatus } from '@/lib/event-history';
import type { ManagedOrganizerEvent, OrganizerEventStatus } from '@/lib/organizer-events';

type OrganizerStatus = 'none' | 'pending' | 'approved' | 'rejected';

type LevelProgress = {
  currentLevel: { name: string; minXp: number };
  nextLevel: { name: string; minXp: number } | null;
  progressPercent: number;
  xpToNext: number;
};

type ProfileRankCardProps = {
  avatarInitials: string | null;
  avatarUrl?: string | null;
  cityLabel: string;
  fullName: string;
  levelProgress: LevelProgress;
  organizerStatus: OrganizerStatus;
  userXp: number;
};

export function ProfileRankCard({
  avatarInitials,
  avatarUrl,
  cityLabel,
  fullName,
  levelProgress,
  organizerStatus,
  userXp,
}: ProfileRankCardProps) {
  return (
    <View className="mx-5 mb-5 rounded-[28px] border border-gray-200 bg-white p-4">
      <View className="mb-5 flex-row items-center gap-4">
        <RankAvatar
          initials={avatarInitials}
          progressPercent={levelProgress.progressPercent}
          uri={avatarUrl}
        />

        <View className="min-w-0 flex-1">
          <View className="mb-1">
            <Text className="font-heading text-[31px] font-extrabold leading-[35px] text-ink">
              {fullName}
            </Text>
          </View>
          {organizerStatus === 'approved' && (
            <View className="mb-2">
              <OrganizerVerifiedBadge />
            </View>
          )}
          <Text className="text-[13px] font-medium text-muted" numberOfLines={1}>
            {levelProgress.currentLevel.name} · {cityLabel}
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-2xl bg-canvas p-4">
        <View className="mb-3 flex-row items-end justify-between gap-4">
          <View>
            <View className="mb-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Total XP
              </Text>
            </View>
            <Text className="font-ui text-[34px] font-extrabold leading-[38px] text-ink">
              {userXp.toLocaleString()}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-right text-[12px] font-semibold leading-4 text-muted">
              {levelProgress.nextLevel
                ? `${levelProgress.xpToNext.toLocaleString()} XP to ${levelProgress.nextLevel.name}`
                : 'Top city rank reached'}
            </Text>
            <Text className="mt-1 text-[13px] font-extrabold text-primary">
              {Math.round(levelProgress.progressPercent)}%
            </Text>
          </View>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-primary/10">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${levelProgress.progressPercent}%` }}
          />
        </View>
      </View>
    </View>
  );
}

type ProfileActionsProps = {
  onEdit: () => void;
  onSignOut: () => void;
};

export function ProfileActions({ onEdit, onSignOut }: ProfileActionsProps) {
  return (
    <View className="mx-5 mb-6">
      <View className="flex-row gap-3">
        <Pressable
          onPress={onEdit}
          className="h-12 flex-1 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
        >
          <Text className="text-[14px] font-semibold text-white">Edit profile</Text>
        </Pressable>

        <Pressable
          onPress={onSignOut}
          className="h-12 flex-1 flex-row items-center justify-center rounded-xl border border-gray-200 active:opacity-80"
        >
          <Text className="text-[14px] font-semibold text-muted">Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

type UserActivitySectionProps = {
  history: UserEventHistoryItem[];
};

export function UserActivitySection({ history }: UserActivitySectionProps) {
  return (
    <View className="mb-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">My activity</Text>
        <Text className="text-[11px] font-semibold text-primary">{history.length}</Text>
      </View>

      {history.length === 0 ? (
        <View className="rounded-3xl border border-gray-200 bg-white p-5">
          <Text className="font-ui text-[15px] font-extrabold text-ink">No saved events yet</Text>
          <Text className="mt-1 text-[13px] leading-5 text-muted">
            Events you mark as Interested, Going, or Attended will appear here.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          {history.slice(0, 6).map((item) => (
            <EventHistoryRow
              event={item.event}
              key={`${item.event.id}-${item.status}`}
              status={item.status}
            />
          ))}
        </View>
      )}
    </View>
  );
}

type DigitalPassportSectionProps = {
  badges: AchievementBadge[];
  onOpenAll: () => void;
  onOpenBadge: (badge: AchievementBadge) => void;
};

export function DigitalPassportSection({
  badges,
  onOpenAll,
  onOpenBadge,
}: DigitalPassportSectionProps) {
  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center justify-between px-5">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Digital Passport</Text>
        <Pressable onPress={onOpenAll} className="active:opacity-75">
          <Text className="text-[12px] font-semibold text-primary">View all</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {badges.slice(0, 8).map((badge) => (
          <PassportBadge
            badge={badge}
            key={badge.id}
            onPress={() => {
              onOpenBadge(badge);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

type OrganizerToolsSectionProps = {
  cityName: string;
  onCreateEvent: () => void;
  onCreateReward: () => void;
  status: OrganizerStatus;
};

export function OrganizerToolsSection({
  cityName,
  onCreateEvent,
  onCreateReward,
  status,
}: OrganizerToolsSectionProps) {
  if (status === 'none') {
    return null;
  }

  return (
    <View className="mb-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Organizer Tools</Text>
      </View>

      {status === 'approved' ? (
        <View className="rounded-3xl border border-primary/10 bg-primary/5 p-4">
          <View className="mb-4">
            <View className="mb-1 flex-row items-start justify-between gap-3">
              <Text className="min-w-0 flex-1 font-heading text-[20px] font-extrabold text-ink">
                Event maker tools
              </Text>
              <OrganizerVerifiedBadge compact />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="mt-1 text-[13px] leading-5 text-muted">
                Create and publish events for {cityName}.
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <Pressable
              onPress={onCreateEvent}
              className="h-11 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
            >
              <Text className="text-[14px] font-semibold text-white">Create event</Text>
            </Pressable>
            <Pressable
              onPress={onCreateReward}
              className="h-11 flex-row items-center justify-center rounded-xl border border-primary/25 bg-white active:opacity-85"
            >
              <Text className="text-[14px] font-semibold text-primary">Create reward</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <OrganizerStatusCard status={status} />
      )}
    </View>
  );
}

type OrganizerEventHistorySectionProps = {
  error?: string | null;
  events: ManagedOrganizerEvent[];
};

export function OrganizerEventHistorySection({ error, events }: OrganizerEventHistorySectionProps) {
  return (
    <View className="mb-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">My events</Text>
        <Text className="text-[11px] font-semibold text-primary">{events.length}</Text>
      </View>

      {error && (
        <View className="rounded-2xl border border-secondary/20 bg-secondary/10 p-3">
          <Text className="text-[12px] leading-4 text-muted">
            Your event history could not load yet. Apply the latest Supabase migration if needed.
          </Text>
        </View>
      )}

      {!error && events.length === 0 && (
        <View className="rounded-3xl border border-gray-200 bg-white p-5">
          <Text className="font-ui text-[15px] font-extrabold text-ink">
            No organizer events yet
          </Text>
          <Text className="mt-1 text-[13px] leading-5 text-muted">
            Events you submit for review will appear here with their approval status.
          </Text>
        </View>
      )}

      <View className="gap-2">
        {events.map((event) => (
          <OrganizerEventRow event={event} key={event.id} />
        ))}
      </View>
    </View>
  );
}

function EventHistoryRow({ event, status }: { event: CultureEvent; status: UserEventStatus }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
        <Text className="text-[12px] font-extrabold text-primary">{event.date.slice(0, 3)}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-ui text-[14px] font-extrabold text-ink" numberOfLines={1}>
          {event.title}
        </Text>
        <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
          {event.venueName} · {event.time}
        </Text>
      </View>
      <UserEventStatusPill status={status} />
    </View>
  );
}

function OrganizerEventRow({ event }: { event: ManagedOrganizerEvent }) {
  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-3">
      <View className="mb-2 flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-ui text-[14px] font-extrabold text-ink" numberOfLines={1}>
            {event.title}
          </Text>
          <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
            {event.date} · {event.venueName}
          </Text>
        </View>
        <OrganizerEventStatusPill status={event.reviewStatus} />
      </View>
      <Text className="text-[12px] leading-4 text-muted" numberOfLines={2}>
        {event.description}
      </Text>
    </View>
  );
}

function UserEventStatusPill({ status }: { status: UserEventStatus }) {
  const label = status === 'attended' ? 'Attended' : status === 'going' ? 'Going' : 'Interested';

  return (
    <View className="rounded-full bg-primary/10 px-2.5 py-1">
      <Text className="text-[10px] font-extrabold text-primary">{label}</Text>
    </View>
  );
}

function OrganizerEventStatusPill({ status }: { status: OrganizerEventStatus }) {
  const statusStyle = getOrganizerEventStatusStyle(status);

  return (
    <View className={`rounded-full px-2.5 py-1 ${statusStyle.container}`}>
      <Text className={`text-[10px] font-extrabold ${statusStyle.text}`}>{statusStyle.label}</Text>
    </View>
  );
}

function getOrganizerEventStatusStyle(status: OrganizerEventStatus) {
  if (status === 'approved') {
    return { container: 'bg-primary/10', label: 'Approved', text: 'text-primary' };
  }
  if (status === 'rejected') {
    return { container: 'bg-destructive/10', label: 'Rejected', text: 'text-destructive' };
  }
  if (status === 'cancelled') {
    return { container: 'bg-gray-100', label: 'Cancelled', text: 'text-muted' };
  }
  if (status === 'draft') {
    return { container: 'bg-gray-100', label: 'Draft', text: 'text-muted' };
  }

  return { container: 'bg-secondary/12', label: 'Pending', text: 'text-secondary' };
}

type RewardsSectionProps = {
  cityName: string;
  error?: string | null;
  onSelectReward: (reward: RewardPartner) => void;
  rewards: RewardPartner[];
};

export function RewardsSection({ cityName, error, onSelectReward, rewards }: RewardsSectionProps) {
  return (
    <View className="px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Rewards</Text>
        <Text className="text-[11px] font-semibold text-primary">{cityName}</Text>
      </View>

      {error && (
        <View className="mb-3 rounded-2xl border border-secondary/20 bg-secondary/10 p-3">
          <Text className="text-[12px] leading-4 text-muted">
            Rewards could not load yet. Apply the latest Supabase migration if you have not done it.
          </Text>
        </View>
      )}

      {!error && rewards.length === 0 && (
        <View className="rounded-3xl border border-gray-200 bg-white p-5">
          <Text className="font-heading text-[20px] font-extrabold text-ink">
            No approved rewards yet
          </Text>
          <Text className="mt-2 text-[13px] leading-5 text-muted">
            Approved partner rewards for {cityName} will appear here after CultureQuest review.
          </Text>
        </View>
      )}

      <View className="gap-3">
        {rewards.map((reward, index) => (
          <RewardPartnerRow
            key={reward.id}
            reward={reward}
            onPress={() => onSelectReward(reward)}
            variantIndex={index}
          />
        ))}
      </View>
    </View>
  );
}
