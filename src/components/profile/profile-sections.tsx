import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Gift,
  GraduationCap,
  LogOut,
  MapPin,
  ReceiptText,
  RefreshCw,
  Settings,
  Users,
  UserRound,
} from 'lucide-react-native';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';

import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { BrandImage } from '@/components/brand-image';
import { PassportBadge, type AchievementBadge } from '@/components/profile/badges';
import { OrganizerStatusCard, OrganizerVerifiedBadge } from '@/components/profile/organizer-status';
import { RankAvatar } from '@/components/profile/profile-avatar';
import { RewardPartnerRow } from '@/components/profile/reward-partner-row';
import { CardStyles, Colors, GamificationColors } from '@/constants/theme';
import { eventCategoryLabels, type CultureEvent, type RewardPartner } from '@/data/culture';
import type { RedeemedRewardState } from '@/data/profile';
import { getEventEngagement } from '@/lib/event-engagement';
import type { UserEventHistoryItem, UserEventStatus } from '@/lib/event-history';
import type { ManagedOrganizerEvent, OrganizerEventStatus } from '@/lib/organizer-events';
import type { ManagedOrganizerReward, OrganizerRewardStatus } from '@/lib/organizer-rewards';
import type { UserUniversityMembership } from '@/lib/university-leaderboard';
import type { XpTransaction } from '@/lib/xp-transactions';
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type OrganizerStatus = 'none' | 'pending' | 'approved' | 'rejected';
type ActivityHistoryFilter = 'all' | UserEventStatus;
type OrganizerHistoryFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'past' | 'cancelled';
type OrganizerRewardHistoryFilter = 'all' | OrganizerRewardStatus;

const activityHistoryFilters: { key: ActivityHistoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'interested', label: 'Interested' },
  { key: 'going', label: 'Going' },
  { key: 'attended', label: 'Attended' },
];

const organizerHistoryFilters: { key: OrganizerHistoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

const organizerRewardHistoryFilters: { key: OrganizerRewardHistoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'archived', label: 'Archived' },
];

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
  onOpenSettings: () => void;
  organizerStatus: OrganizerStatus;
  userXp: number;
};

export function ProfileRankCard({
  avatarInitials,
  avatarUrl,
  cityLabel,
  fullName,
  levelProgress,
  onOpenSettings,
  organizerStatus,
  userXp,
}: ProfileRankCardProps) {
  const layout = useResponsiveLayout();

  return (
    <View
      className="mx-5 mb-5 rounded-[28px] border border-gray-200 bg-white p-4"
      style={{ boxShadow: '0 10px 24px rgba(36, 28, 46, 0.08)' }}
    >
      <View className="mb-5 flex-row items-center gap-4">
        <RankAvatar
          initials={avatarInitials}
          progressPercent={levelProgress.progressPercent}
          uri={avatarUrl}
        />

        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-start justify-between gap-2">
            <Text
              className="min-w-0 flex-1 font-heading font-extrabold text-ink"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={{
                fontSize: layout.profileNameSize,
                lineHeight: layout.profileNameLineHeight,
              }}
            >
              {fullName}
            </Text>
            <Pressable
              accessibilityLabel="Open profile settings"
              onPress={onOpenSettings}
              hitSlop={10}
              className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas active:opacity-80"
            >
              <Settings size={20} color={Colors.light.primary} strokeWidth={2.4} />
            </Pressable>
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

      <View className="mb-4 rounded-2xl border border-accent/15 bg-canvas p-4">
        <View className="mb-3 flex-row items-end justify-between gap-4">
          <View>
            <View className="mb-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Total XP
              </Text>
            </View>
            <Text className="font-heading text-[54px] font-extrabold leading-[58px] text-ink">
              {userXp.toLocaleString()}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-right text-[12px] font-semibold leading-4 text-muted">
              {levelProgress.nextLevel
                ? `${levelProgress.xpToNext.toLocaleString()} XP to ${levelProgress.nextLevel.name}`
                : 'Top city rank reached'}
            </Text>
            <Text className="mt-1 text-[16px] font-extrabold text-accentDeep">
              {Math.round(levelProgress.progressPercent)}%
            </Text>
          </View>
        </View>
        <XpProgressBar progressPercent={levelProgress.progressPercent} />
      </View>
    </View>
  );
}

type UniversityAffiliationSectionProps = {
  membership: UserUniversityMembership | null;
};

export function UniversityAffiliationSection({ membership }: UniversityAffiliationSectionProps) {
  if (!membership) {
    return null;
  }

  return (
    <View
      className="mx-5 mb-7 rounded-3xl border border-primary/10 bg-primary/5 px-4 py-4"
      style={CardStyles.compact}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary">
          <GraduationCap size={22} color="white" strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-center gap-2">
            <Text className="text-[11px] font-extrabold uppercase tracking-wide text-primary">
              Campus ranking
            </Text>
            <View className="rounded-full bg-white px-2 py-0.5">
              <Text className="text-[10px] font-extrabold text-muted">
                {membership.status === 'verified' ? 'Verified' : 'Pending'}
              </Text>
            </View>
          </View>
          <Text className="font-ui text-[15px] font-extrabold text-ink" numberOfLines={1}>
            {membership.shortName}
          </Text>
          <Text className="mt-0.5 text-[12px] leading-4 text-muted" numberOfLines={1}>
            {membership.studentEmail}
          </Text>
          {membership.status !== 'verified' && (
            <Text className="mt-1 text-[11px] leading-4 text-muted">
              Student email confirmation will be enabled after the email domain setup.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function XpProgressBar({ progressPercent }: { progressPercent: number }) {
  const safeProgress = Math.min(100, Math.max(0, progressPercent));

  return (
    <View
      className="relative h-4 overflow-hidden rounded-full"
      style={{ backgroundColor: GamificationColors.progressTrack }}
    >
      <LinearGradient
        colors={[Colors.light.accent, Colors.light.accentDeep]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          height: '100%',
          width: `${safeProgress}%`,
          borderRadius: 999,
        }}
      />
      {[25, 50, 75].map((tick) => (
        <View
          key={tick}
          className="absolute top-0 h-full w-px bg-white/45"
          style={{ left: `${tick}%` }}
        />
      ))}
    </View>
  );
}

type AccountActionsModalProps = {
  onClose: () => void;
  onEdit: () => void;
  onSignOut: () => void;
  visible: boolean;
};

export function AccountActionsModal({
  onClose,
  onEdit,
  onSignOut,
  visible,
}: AccountActionsModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-ink/25 px-5 pb-8" onPress={onClose}>
        <Pressable
          className="rounded-[28px] border border-gray-200 bg-white p-3"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="mb-2 h-1.5 w-10 self-center rounded-full bg-gray-200" />
          <Pressable
            onPress={() => {
              onClose();
              onEdit();
            }}
            className="flex-row items-center gap-3 rounded-2xl px-3 py-4 active:bg-primary/5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserRound size={18} color="#7C3AED" strokeWidth={2.4} />
            </View>
            <View className="flex-1">
              <Text className="font-ui text-[15px] font-extrabold text-ink">Edit profile</Text>
              <Text className="mt-0.5 text-[12px] text-muted">Name, city, and profile photo</Text>
            </View>
            <ChevronRight size={17} color="#756F7B" strokeWidth={2.4} />
          </Pressable>

          <View className="mx-3 h-px bg-gray-100" />

          <Pressable
            onPress={() => {
              onClose();
              onSignOut();
            }}
            className="flex-row items-center gap-3 rounded-2xl px-3 py-4 active:bg-destructive/5"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <LogOut size={18} color="#756F7B" strokeWidth={2.4} />
            </View>
            <View className="flex-1">
              <Text className="font-ui text-[15px] font-extrabold text-ink">Log out</Text>
              <Text className="mt-0.5 text-[12px] text-muted">
                Leave this account on this device
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
  onOpenAll: () => void;
  transactions: XpTransaction[];
};

export function UserActivitySection({
  history,
  onOpenAll,
  transactions,
}: UserActivitySectionProps) {
  const activityTransactions = getUserVisibleXpTransactions(transactions);
  const activityCount = history.length + activityTransactions.length;

  return (
    <View className="mb-4 px-5">
      <Pressable
        onPress={onOpenAll}
        className="flex-row items-center gap-3 rounded-[26px] border border-primary/10 bg-primary/5 p-3.5 active:opacity-85"
        style={{ boxShadow: '0 8px 18px rgba(36, 28, 46, 0.05)' }}
      >
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
          <CalendarDays size={20} color={Colors.light.primary} strokeWidth={2.4} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-heading text-[19px] font-extrabold text-ink">My activity</Text>
          <Text className="mt-0.5 text-[12px] font-medium text-muted">
            {activityCount > 0
              ? `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`
              : 'Events, reward spends, and XP changes'}
          </Text>
        </View>
        <ChevronRight size={18} color={Colors.light.primary} strokeWidth={2.5} />
      </Pressable>
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
  const layout = useResponsiveLayout();
  const badgeWidth = Math.min(112, Math.max(96, layout.usableWidth * 0.28));

  return (
    <View className="mb-8 mt-2">
      <View className="mb-4 flex-row items-center justify-between px-5">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Digital Passport</Text>
        <Pressable onPress={onOpenAll} className="active:opacity-75">
          <Text className="text-[12px] font-semibold text-primary">View all</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {badges.slice(0, 8).map((badge) => (
          <PassportBadge
            badge={badge}
            itemWidth={badgeWidth}
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
    <View className="mb-4 px-5">
      <View className="mb-2.5 flex-row items-center justify-between">
        <Text className="font-heading text-[21px] font-extrabold text-ink">Organizer Tools</Text>
      </View>

      {status === 'approved' ? (
        <View
          className="rounded-[26px] border border-primary/10 bg-primary/5 p-3.5"
          style={{ boxShadow: '0 8px 18px rgba(36, 28, 46, 0.05)' }}
        >
          <View className="mb-3">
            <View className="mb-1 flex-row items-start justify-between gap-3">
              <Text className="min-w-0 flex-1 font-heading text-[19px] font-extrabold text-ink">
                Event maker tools
              </Text>
              <OrganizerVerifiedBadge compact />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="mt-0.5 text-[12px] leading-4 text-muted">
                Create and publish events for {cityName}.
              </Text>
            </View>
          </View>

          <View className="gap-1.5">
            <Pressable
              onPress={onCreateEvent}
              className="h-10 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
            >
              <Text className="text-[14px] font-semibold text-white">Create event</Text>
            </Pressable>
            <Pressable
              onPress={onCreateReward}
              className="h-10 flex-row items-center justify-center rounded-xl border border-primary/25 bg-white active:opacity-85"
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

type AdminToolsSectionProps = {
  onCreateQuest: () => void;
  onManageEvents: () => void;
  onOpenXpAudit: () => void;
  onOpenReview: () => void;
  pendingCount: number;
};

export function AdminToolsSection({
  onCreateQuest,
  onManageEvents,
  onOpenXpAudit,
  onOpenReview,
  pendingCount,
}: AdminToolsSectionProps) {
  return (
    <View className="mb-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Admin Tools</Text>
      </View>
      <View className="rounded-3xl border border-primary/10 bg-ink p-4">
        <View className="mb-1 flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 font-heading text-[20px] font-extrabold text-white">
            CultureQuest control room
          </Text>
          <View className="rounded-full bg-white/10 px-3 py-1">
            <Text className="text-[11px] font-extrabold text-white">{pendingCount} pending</Text>
          </View>
        </View>
        <Text className="mt-1 text-[13px] leading-5 text-white/70">
          Review organizer submissions and create official city trails.
        </Text>
        <View className="mt-4 gap-2">
          <Pressable
            onPress={onOpenReview}
            className="h-11 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
          >
            <Text className="text-[14px] font-semibold text-white">Review content</Text>
          </Pressable>
          <Pressable
            onPress={onCreateQuest}
            className="h-11 flex-row items-center justify-center rounded-xl border border-white/15 bg-white/10 active:opacity-85"
          >
            <Text className="text-[14px] font-semibold text-white">Create quest</Text>
          </Pressable>
          <Pressable
            onPress={onManageEvents}
            className="h-11 flex-row items-center justify-center rounded-xl border border-white/15 bg-white/10 active:opacity-85"
          >
            <Text className="text-[14px] font-semibold text-white">Manage events</Text>
          </Pressable>
          <Pressable
            onPress={onOpenXpAudit}
            className="h-11 flex-row items-center justify-center rounded-xl border border-white/15 bg-white/10 active:opacity-85"
          >
            <Text className="text-[14px] font-semibold text-white">XP audit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function AdminXpAuditModal({
  error,
  loading,
  onClose,
  onRefresh,
  stableModalTopInset,
  transactions,
  visible,
}: {
  error?: string | null;
  loading?: boolean;
  onClose: () => void;
  onRefresh: () => void;
  stableModalTopInset: number;
  transactions: XpTransaction[];
  visible: boolean;
}) {
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    onSwipeBack: onClose,
    visible,
  });
  const earnedTotal = transactions
    .filter((transaction) => transaction.transactionType === 'earn')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const spentTotal = transactions
    .filter((transaction) => transaction.transactionType === 'spend')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <View
              className="flex-row items-center justify-between bg-white px-5 pb-3"
              style={{ paddingTop: stableModalTopInset + 6 }}
            >
              <Pressable
                onPress={closeWithAnimation}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
              </Pressable>
              <Pressable
                disabled={loading}
                onPress={onRefresh}
                className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 active:opacity-80 disabled:opacity-50"
              >
                <RefreshCw size={19} color={Colors.light.primary} strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <View
                className="mb-4 overflow-hidden rounded-[30px] bg-ink p-5"
                style={{ boxShadow: '0 14px 28px rgba(36, 28, 46, 0.14)' }}
              >
                <Text className="text-[11px] font-extrabold uppercase tracking-[2px] text-white/60">
                  Admin audit
                </Text>
                <Text className="mt-2 font-heading text-[34px] font-extrabold leading-[38px] text-white">
                  XP ledger
                </Text>
                <Text className="mt-2 text-[13px] leading-5 text-white/70">
                  Server-side XP transactions, duplicate protection, reward spends, and quest
                  awards.
                </Text>
                <View className="mt-5 flex-row gap-2">
                  <AuditSummaryPill label="Earned" value={earnedTotal} />
                  <AuditSummaryPill label="Spent" value={spentTotal} />
                </View>
              </View>

              {loading ? (
                <LoadingState title="Loading XP audit" />
              ) : error ? (
                <ErrorState
                  body="Make sure the latest XP transaction migration is applied, then refresh."
                  title="XP audit could not load"
                />
              ) : transactions.length === 0 ? (
                <EmptyState
                  body="New check-ins, quest completions, and reward redemptions will appear here."
                  title="No XP transactions yet"
                />
              ) : (
                <View className="gap-2.5">
                  {transactions.map((transaction) => (
                    <XpTransactionRow admin key={transaction.id} transaction={transaction} />
                  ))}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function AuditSummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl bg-white/10 px-3 py-2">
      <Text className="text-[10px] font-extrabold uppercase tracking-wide text-white/55">
        {label}
      </Text>
      <Text className="mt-0.5 font-heading text-[24px] font-extrabold text-white">
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

function XpTransactionRow({
  admin = false,
  transaction,
}: {
  admin?: boolean;
  transaction: XpTransaction;
}) {
  const isSpend = transaction.transactionType === 'spend';
  const isAdjustment = transaction.transactionType === 'adjustment';
  const amountLabel = `${isSpend ? '-' : '+'}${transaction.amount.toLocaleString()}`;
  const sourceLabel = getXpSourceLabel(transaction.sourceType, transaction.transactionType);

  return (
    <View
      className={`rounded-3xl border p-4 ${
        isSpend ? 'border-gray-200 bg-white' : 'border-accent/15 bg-accent/5'
      }`}
      style={CardStyles.compact}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={`h-11 w-11 items-center justify-center rounded-2xl ${
            isSpend ? 'bg-gray-100' : 'bg-accent/12'
          }`}
        >
          <ReceiptText
            size={20}
            color={isSpend ? '#756F7B' : Colors.light.accentDeep}
            strokeWidth={2.4}
          />
        </View>

        <View className="min-w-0 flex-1">
          <View className="mb-1 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              {admin && (
                <Text className="mb-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary">
                  {transaction.userLabel}
                </Text>
              )}
              <Text className="font-ui text-[15px] font-extrabold leading-5 text-ink">
                {transaction.reason}
              </Text>
            </View>
            <Text
              className={`font-heading text-[24px] font-extrabold leading-7 ${
                isSpend ? 'text-muted' : isAdjustment ? 'text-primary' : 'text-accentDeep'
              }`}
            >
              {amountLabel}
            </Text>
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-[11px] font-semibold text-muted">
              {sourceLabel} · {formatAuditDate(transaction.createdAt)}
            </Text>
            {transaction.balanceAfter !== null && (
              <View className="rounded-full bg-white px-2 py-0.5">
                <Text className="text-[10px] font-extrabold text-muted">
                  Balance {transaction.balanceAfter.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

type OrganizerEventHistorySectionProps = {
  error?: string | null;
  events: ManagedOrganizerEvent[];
  loading?: boolean;
  onOpenAll: () => void;
};

export function OrganizerEventHistorySection({
  error,
  events,
  loading = false,
  onOpenAll,
}: OrganizerEventHistorySectionProps) {
  return (
    <View className="mb-4 px-5">
      {loading ? (
        <LoadingState compact title="Loading your event history" />
      ) : error ? (
        <ErrorState
          body="Apply the latest Supabase migration if needed, then refresh the app."
          compact
          title="Your event history could not load"
        />
      ) : (
        <Pressable
          onPress={onOpenAll}
          className="flex-row items-center gap-3 rounded-[26px] border border-gray-200 bg-white p-3.5 active:opacity-85"
        >
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-canvas">
            <CalendarDays size={20} color={Colors.light.primary} strokeWidth={2.4} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-heading text-[19px] font-extrabold text-ink">My events</Text>
            <Text className="mt-0.5 text-[12px] font-medium text-muted">
              {events.length > 0
                ? `${events.length} submitted ${events.length === 1 ? 'event' : 'events'}`
                : 'Submitted, pending, and past events'}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.light.primary} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
}

type OrganizerRewardHistorySectionProps = {
  error?: string | null;
  loading?: boolean;
  onOpenAll: () => void;
  rewards: ManagedOrganizerReward[];
};

export function OrganizerRewardHistorySection({
  error,
  loading = false,
  onOpenAll,
  rewards,
}: OrganizerRewardHistorySectionProps) {
  return (
    <View className="mb-4 px-5">
      {loading ? (
        <LoadingState compact title="Loading your reward history" />
      ) : error ? (
        <ErrorState
          body="Apply the latest Supabase migration if needed, then refresh the app."
          compact
          title="Your reward history could not load"
        />
      ) : (
        <Pressable
          onPress={onOpenAll}
          className="flex-row items-center gap-3 rounded-[26px] border border-gray-200 bg-white p-3.5 active:opacity-85"
        >
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent/10">
            <Gift size={20} color={Colors.light.accent} strokeWidth={2.4} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-heading text-[19px] font-extrabold text-ink">My rewards</Text>
            <Text className="mt-0.5 text-[12px] font-medium text-muted">
              {rewards.length > 0
                ? `${rewards.length} submitted ${rewards.length === 1 ? 'reward' : 'rewards'}`
                : 'Submitted, pending, and approved rewards'}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.light.primary} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
}

export function UserActivityHistoryModal({
  error,
  history,
  loading = false,
  onClose,
  stableModalTopInset,
  transactions,
  visible,
}: {
  error?: string | null;
  history: UserEventHistoryItem[];
  loading?: boolean;
  onClose: () => void;
  stableModalTopInset: number;
  transactions: XpTransaction[];
  visible: boolean;
}) {
  const [selectedEvent, setSelectedEvent] = useState<CultureEvent | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityHistoryFilter>('all');
  const selectedHistoryItem = selectedEvent
    ? history.find((item) => item.event.id === selectedEvent.id)
    : null;
  const transactionsByEventId = useMemo(
    () => getEventTransactionLookup(transactions),
    [transactions],
  );
  const visibleXpTransactions = useMemo(
    () => getUserVisibleXpTransactions(transactions),
    [transactions],
  );
  const filteredHistory =
    activityFilter === 'all' ? history : history.filter((item) => item.status === activityFilter);
  const showXpTransactions = activityFilter === 'all';
  const hasAnyActivity = history.length > 0 || visibleXpTransactions.length > 0;
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    enabled: !selectedEvent,
    onSwipeBack: onClose,
    visible,
  });
  const {
    closeWithAnimation: closeDetailWithAnimation,
    gesture: detailGesture,
    swipeStyle: detailSwipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => setSelectedEvent(null),
    resetKey: selectedEvent?.id ?? null,
    visible: visible && !!selectedEvent,
  });

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <View className="bg-white px-5 pb-2" style={{ paddingTop: stableModalTopInset + 6 }}>
              <Pressable
                onPress={closeWithAnimation}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
              </Pressable>
            </View>
            <HistoryFilterBar
              activeKey={activityFilter}
              filters={activityHistoryFilters}
              onSelect={setActivityFilter}
            />

            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 36,
              }}
              showsVerticalScrollIndicator={false}
            >
              {loading && !hasAnyActivity ? (
                <LoadingState title="Loading your activity" />
              ) : error && !hasAnyActivity ? (
                <ErrorState
                  body="Your event history loaded, but XP activity could not be refreshed."
                  title="Some activity could not load"
                />
              ) : !hasAnyActivity ? (
                <HistoryEmptyState
                  body="Events you mark as Interested, Going, or Attended, plus reward spends and quest awards, will appear here."
                  title="No activity yet"
                />
              ) : filteredHistory.length === 0 && !showXpTransactions ? (
                <HistoryEmptyState
                  body={`No ${getActivityFilterEmptyLabel(activityFilter)} events in your history yet.`}
                  title="Nothing here yet"
                />
              ) : (
                <>
                  {filteredHistory.map((item) => (
                    <EventHistoryRow
                      event={item.event}
                      key={`${item.event.id}-${item.status}-full`}
                      onPress={() => setSelectedEvent(item.event)}
                      status={item.status}
                      transaction={transactionsByEventId[item.event.id]}
                    />
                  ))}
                  {showXpTransactions &&
                    visibleXpTransactions.map((transaction) => (
                      <XpTransactionRow
                        key={`${transaction.id}-activity`}
                        transaction={transaction}
                      />
                    ))}
                </>
              )}
            </ScrollView>

            {selectedEvent && (
              <GestureDetector gesture={detailGesture}>
                <Animated.View className="absolute inset-0 bg-white" style={detailSwipeStyle}>
                  <HistoryEventDetail
                    event={selectedEvent}
                    onBack={closeDetailWithAnimation}
                    stableModalTopInset={stableModalTopInset}
                    status={selectedHistoryItem?.status}
                    transaction={transactionsByEventId[selectedEvent.id]}
                  />
                </Animated.View>
              </GestureDetector>
            )}
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

export function OrganizerEventHistoryModal({
  events,
  onClose,
  onEditEvent,
  stableModalTopInset,
  visible,
}: {
  events: ManagedOrganizerEvent[];
  onClose: () => void;
  onEditEvent: (event: ManagedOrganizerEvent) => void;
  stableModalTopInset: number;
  visible: boolean;
}) {
  const [selectedEvent, setSelectedEvent] = useState<ManagedOrganizerEvent | null>(null);
  const [organizerFilter, setOrganizerFilter] = useState<OrganizerHistoryFilter>('all');
  const filteredEvents =
    organizerFilter === 'all'
      ? events
      : events.filter((event) =>
          organizerFilter === 'past'
            ? event.reviewStatus === 'approved' && isPastEventDateLabel(event.date)
            : event.reviewStatus === organizerFilter,
        );
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    enabled: !selectedEvent,
    onSwipeBack: onClose,
    visible,
  });
  const {
    closeWithAnimation: closeDetailWithAnimation,
    gesture: detailGesture,
    swipeStyle: detailSwipeStyle,
  } = useCardSwipeBack({
    onSwipeBack: () => setSelectedEvent(null),
    resetKey: selectedEvent?.id ?? null,
    visible: visible && !!selectedEvent,
  });

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <View className="bg-white px-5 pb-2" style={{ paddingTop: stableModalTopInset + 6 }}>
              <Pressable
                onPress={closeWithAnimation}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
              </Pressable>
            </View>
            <HistoryFilterBar
              activeKey={organizerFilter}
              filters={organizerHistoryFilters}
              onSelect={setOrganizerFilter}
            />

            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 36,
              }}
              showsVerticalScrollIndicator={false}
            >
              {events.length === 0 ? (
                <HistoryEmptyState
                  body="Events you submit for review will appear here with their approval status."
                  title="No organizer events yet"
                />
              ) : filteredEvents.length === 0 ? (
                <HistoryEmptyState
                  body={`No ${getOrganizerFilterEmptyLabel(organizerFilter)} events in your organizer history.`}
                  title="Nothing here yet"
                />
              ) : (
                filteredEvents.map((event) => (
                  <OrganizerEventRow
                    event={event}
                    key={`${event.id}-full`}
                    onPress={() => setSelectedEvent(event)}
                  />
                ))
              )}
            </ScrollView>

            {selectedEvent && (
              <GestureDetector gesture={detailGesture}>
                <Animated.View className="absolute inset-0 bg-white" style={detailSwipeStyle}>
                  <HistoryEventDetail
                    event={selectedEvent}
                    onBack={closeDetailWithAnimation}
                    onEditEvent={() => onEditEvent(selectedEvent)}
                    organizerStatus={selectedEvent.reviewStatus}
                    stableModalTopInset={stableModalTopInset}
                  />
                </Animated.View>
              </GestureDetector>
            )}
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

export function OrganizerRewardHistoryModal({
  onClose,
  rewards,
  stableModalTopInset,
  visible,
}: {
  onClose: () => void;
  rewards: ManagedOrganizerReward[];
  stableModalTopInset: number;
  visible: boolean;
}) {
  const [rewardFilter, setRewardFilter] = useState<OrganizerRewardHistoryFilter>('all');
  const filteredRewards =
    rewardFilter === 'all'
      ? rewards
      : rewards.filter((reward) => reward.reviewStatus === rewardFilter);
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    onSwipeBack: onClose,
    visible,
  });

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <View className="bg-white px-5 pb-2" style={{ paddingTop: stableModalTopInset + 6 }}>
              <Pressable
                onPress={closeWithAnimation}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
              </Pressable>
            </View>

            <HistoryFilterBar
              activeKey={rewardFilter}
              filters={organizerRewardHistoryFilters}
              onSelect={setRewardFilter}
            />

            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 36,
              }}
              showsVerticalScrollIndicator={false}
            >
              {rewards.length === 0 ? (
                <HistoryEmptyState
                  body="Rewards you submit for review will appear here with their approval status."
                  title="No organizer rewards yet"
                />
              ) : filteredRewards.length === 0 ? (
                <HistoryEmptyState
                  body={`No ${getOrganizerRewardFilterEmptyLabel(rewardFilter)} rewards in your history.`}
                  title="Nothing here yet"
                />
              ) : (
                filteredRewards.map((reward) => (
                  <OrganizerRewardRow key={`${reward.id}-organizer`} reward={reward} />
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function HistoryEmptyState({ body, title }: { body: string; title: string }) {
  return <EmptyState body={body} title={title} />;
}

function HistoryFilterBar<T extends string>({
  activeKey,
  filters,
  onSelect,
}: {
  activeKey: T;
  filters: { key: T; label: string }[];
  onSelect: (key: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, height: 52, maxHeight: 52 }}
      contentContainerStyle={{
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 8,
      }}
    >
      {filters.map((filter) => {
        const active = activeKey === filter.key;

        return (
          <Pressable
            key={filter.key}
            onPress={() => onSelect(filter.key)}
            className={`h-9 justify-center rounded-full px-4 ${
              active ? 'bg-primary' : 'border border-gray-200 bg-gray-100'
            }`}
          >
            <Text className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-muted'}`}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function getActivityFilterEmptyLabel(filter: ActivityHistoryFilter) {
  if (filter === 'going') return 'going';
  if (filter === 'attended') return 'attended';
  if (filter === 'interested') return 'interested';
  return 'saved';
}

function getOrganizerFilterEmptyLabel(filter: OrganizerHistoryFilter) {
  if (filter === 'cancelled') return 'cancelled';
  if (filter === 'approved') return 'approved';
  if (filter === 'rejected') return 'rejected';
  if (filter === 'pending') return 'pending';
  if (filter === 'past') return 'past';
  return 'submitted';
}

function getOrganizerRewardFilterEmptyLabel(filter: OrganizerRewardHistoryFilter) {
  if (filter === 'approved') return 'approved';
  if (filter === 'rejected') return 'rejected';
  if (filter === 'pending') return 'pending';
  if (filter === 'archived') return 'archived';
  if (filter === 'draft') return 'draft';
  return 'submitted';
}

function getXpSourceLabel(
  sourceType: string | null,
  transactionType: XpTransaction['transactionType'],
) {
  if (sourceType === 'event') return 'Event award';
  if (sourceType === 'quest') return 'Quest award';
  if (sourceType === 'reward') return transactionType === 'spend' ? 'Reward spend' : 'Reward award';
  if (sourceType === 'admin') return 'Admin adjustment';
  return transactionType === 'spend' ? 'XP spend' : 'XP award';
}

function formatAuditDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

function getUserVisibleXpTransactions(transactions: XpTransaction[]) {
  return transactions.filter((transaction) => transaction.sourceType !== 'event');
}

function getEventTransactionLookup(transactions: XpTransaction[]) {
  return transactions
    .filter((transaction) => transaction.sourceType === 'event')
    .reduce<Record<string, XpTransaction>>((lookup, transaction) => {
      const eventId = transaction.sourceId
        ? `organizer-${transaction.sourceId}`
        : transaction.sourceKey?.startsWith('event:')
          ? `organizer-${transaction.sourceKey.replace(/^event:/, '')}`
          : null;

      if (!eventId) return lookup;

      return {
        ...lookup,
        [eventId]: transaction,
      };
    }, {});
}

function getEventXpLabel(event: CultureEvent, transaction?: XpTransaction) {
  const amount =
    transaction && transaction.transactionType === 'earn' && transaction.amount > 0
      ? transaction.amount
      : event.xpBonus;

  return `+${amount.toLocaleString()} XP`;
}

function isPastEventDateLabel(dateLabel: string) {
  const match = dateLabel.match(/\b([A-Z][a-z]{2,8})\s+(\d{1,2})\b/);
  if (!match) return false;

  const monthIndex = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ].indexOf(match[1].slice(0, 3).toLowerCase());

  if (monthIndex < 0) return false;

  const today = new Date();
  const eventDate = new Date(today.getFullYear(), monthIndex, Number(match[2]), 23, 59, 59);

  return eventDate.getTime() < today.getTime();
}

function EventHistoryRow({
  event,
  onPress,
  status,
  transaction,
}: {
  event: CultureEvent;
  onPress?: () => void;
  status: UserEventStatus;
  transaction?: XpTransaction;
}) {
  const xpLabel = getEventXpLabel(event, transaction);

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-primary/10 bg-white active:opacity-85"
      style={CardStyles.compact}
    >
      <View className="h-[126px] bg-gray-200">
        <BrandImage
          source={getEventImageSource(event)}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View className="p-4">
        <View className="mb-2 flex-row items-center justify-between gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {event.date}
          </Text>
          <UserEventStatusPill status={status} />
        </View>
        <Text className="font-ui text-[16px] font-extrabold text-ink" numberOfLines={2}>
          {event.title}
        </Text>
        <Text className="mt-1 text-[13px] font-medium text-muted" numberOfLines={1}>
          {event.venueName} · {formatEventTimeRange(event)}
        </Text>
        <View className="mt-3 self-start rounded-full bg-accent/10 px-3 py-1">
          <Text className="text-[12px] font-extrabold text-accentDeep">{xpLabel}</Text>
        </View>
        <HistoryEngagementStats event={event} status={status} />
      </View>
    </Pressable>
  );
}

function OrganizerEventRow({
  event,
  onPress,
}: {
  event: ManagedOrganizerEvent;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-3xl border border-primary/10 bg-white active:opacity-85"
      style={CardStyles.compact}
    >
      <View className="h-[126px] bg-gray-200">
        <BrandImage
          source={getEventImageSource(event)}
          contentFit="cover"
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View className="p-4">
        <View className="mb-2 flex-row items-center justify-between gap-3">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {event.date}
          </Text>
          <OrganizerEventStatusPill status={event.reviewStatus} />
        </View>
        <Text className="font-ui text-[16px] font-extrabold text-ink" numberOfLines={2}>
          {event.title}
        </Text>
        <Text className="mt-1 text-[13px] font-medium text-muted" numberOfLines={1}>
          {event.venueName} · {formatEventTimeRange(event)}
        </Text>
        <HistoryEngagementStats event={event} />
      </View>
    </Pressable>
  );
}

function OrganizerRewardRow({ reward }: { reward: ManagedOrganizerReward }) {
  return (
    <View
      className="overflow-hidden rounded-3xl border border-primary/10 bg-white"
      style={CardStyles.compact}
    >
      <View className="flex-row gap-3 p-3">
        <View className="h-[96px] w-[96px] overflow-hidden rounded-[22px] bg-gray-100">
          <BrandImage
            contentFit="cover"
            source={getRewardHistoryImageSource(reward)}
            style={StyleSheet.absoluteFillObject}
            withTextGradient={false}
          />
        </View>

        <View className="min-w-0 flex-1 justify-between py-1">
          <View>
            <View className="mb-1 flex-row items-center justify-between gap-2">
              <Text className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {formatSubmittedDate(reward.createdAt)}
              </Text>
              <OrganizerRewardStatusPill status={reward.reviewStatus} />
            </View>
            <Text
              className="font-ui text-[16px] font-extrabold leading-5 text-ink"
              numberOfLines={2}
            >
              {reward.discount}
            </Text>
            <Text className="mt-1 text-[12px] font-medium leading-4 text-muted" numberOfLines={1}>
              {reward.name}
            </Text>
          </View>

          <View className="mt-2 flex-row items-center justify-between gap-3">
            <Text className="min-w-0 flex-1 text-[12px] font-semibold text-muted" numberOfLines={1}>
              Unlock at {reward.xpCost.toLocaleString()} XP
            </Text>
            <Text className="text-[12px] font-extrabold text-primary">
              {reward.reviewStatus === 'approved' ? 'Live' : 'Review'}
            </Text>
          </View>
        </View>
      </View>

      {reward.reviewStatus === 'rejected' && !!reward.rejectionReason && (
        <View className="border-t border-gray-100 bg-destructive/5 px-4 py-3">
          <Text className="text-[12px] leading-4 text-destructive" numberOfLines={2}>
            {reward.rejectionReason}
          </Text>
        </View>
      )}
    </View>
  );
}

function HistoryEventDetail({
  event,
  onBack,
  onEditEvent,
  organizerStatus,
  stableModalTopInset,
  status,
  transaction,
}: {
  event: CultureEvent;
  onBack: () => void;
  onEditEvent?: () => void;
  organizerStatus?: OrganizerEventStatus;
  stableModalTopInset: number;
  status?: UserEventStatus;
  transaction?: XpTransaction;
}) {
  const [qrPassOpen, setQrPassOpen] = useState(false);
  const canShowOrganizerQr = organizerStatus === 'approved';

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="h-[260px] bg-gray-200">
          <BrandImage
            source={getEventImageSource(event)}
            contentFit="cover"
            style={StyleSheet.absoluteFillObject}
            withTextGradient
          >
            <View className="absolute bottom-5 left-5 right-5">
              <View className="mb-2 flex-row flex-wrap items-center gap-2">
                <View className="rounded-full bg-white/90 px-2.5 py-1">
                  <Text className="text-[11px] font-bold text-primary">
                    {eventCategoryLabels[event.category]}
                  </Text>
                </View>
                {status && <UserEventStatusPill status={status} />}
                {organizerStatus && <OrganizerEventStatusPill status={organizerStatus} />}
              </View>
              <Text className="font-ui text-[28px] font-extrabold leading-8 text-white">
                {event.title}
              </Text>
            </View>
          </BrandImage>
          <Pressable
            onPress={onBack}
            className="absolute left-5 h-10 w-10 items-center justify-center rounded-full bg-black/35 active:opacity-80"
            style={{ top: stableModalTopInset + 6 }}
          >
            <ArrowLeft size={21} color="#FFFFFF" strokeWidth={2.6} />
          </Pressable>
        </View>

        <View className="px-5 pt-5">
          <View className="mb-5 gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <HistoryInfoRow icon={<MapPin size={17} color="#7C3AED" />} label={event.venueName} />
            <HistoryInfoRow
              icon={<Clock size={17} color="#7C3AED" />}
              label={`${event.date}, ${formatEventTimeRange(event)}`}
            />
            <View className="flex-row gap-2">
              <HistoryStatPill
                icon={<Users size={15} color="#7C3AED" strokeWidth={2.4} />}
                label="Interested"
                value={getEventEngagement(event, status).interested}
              />
              <HistoryStatPill
                icon={<CheckCircle2 size={15} color="#7C3AED" strokeWidth={2.4} />}
                label="Going"
                value={getEventEngagement(event, status).going}
              />
              <HistoryStatPill
                icon={<CheckCircle2 size={15} color="#7C3AED" strokeWidth={2.4} />}
                label="Attended"
                value={getEventEngagement(event, status).attended}
              />
            </View>
            <View className="rounded-2xl bg-primary/5 px-3 py-2.5">
              <Text className="text-[13px] font-semibold text-primary">
                {getEventXpLabel(event, transaction)} after confirmed attendance
              </Text>
            </View>
          </View>

          <Text className="mb-2 font-ui text-[16px] font-extrabold text-ink">About this event</Text>
          <Text className="mb-5 text-[14px] leading-5 text-ink/75">{event.description}</Text>

          <View className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <Text className="text-[12px] font-semibold uppercase tracking-wide text-muted">
              Organiser
            </Text>
            <Text className="mt-1 text-[15px] font-bold text-ink">{event.organizerName}</Text>
            {canShowOrganizerQr && (
              <Pressable
                onPress={() => setQrPassOpen(true)}
                className="mt-4 h-11 flex-row items-center justify-center rounded-xl bg-primary active:opacity-85"
              >
                <Text className="text-[14px] font-semibold text-white">Open check-in QR</Text>
              </Pressable>
            )}
            {onEditEvent && (
              <Pressable
                onPress={onEditEvent}
                className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 active:opacity-85"
              >
                <Edit3 size={16} color={Colors.light.primary} strokeWidth={2.5} />
                <Text className="text-[14px] font-semibold text-primary">Edit event</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <OrganizerEventQrModal
        event={event}
        onClose={() => setQrPassOpen(false)}
        stableModalTopInset={stableModalTopInset}
        visible={qrPassOpen}
      />
    </>
  );
}

function OrganizerEventQrModal({
  event,
  onClose,
  stableModalTopInset,
  visible,
}: {
  event: CultureEvent;
  onClose: () => void;
  stableModalTopInset: number;
  visible: boolean;
}) {
  const qrCardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    onSwipeBack: onClose,
    visible,
  });

  async function shareQrPass() {
    if (!qrCardRef.current || sharing) return;

    setSharing(true);
    try {
      const uri = await captureRef(qrCardRef, {
        fileName: `culturequest-${slugifyForFile(event.title)}-qr`,
        format: 'png',
        quality: 1,
      });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'This device cannot share files right now.');
        return;
      }

      await Sharing.shareAsync(uri, {
        dialogTitle: `Share check-in QR for ${event.title}`,
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch {
      Alert.alert('Could not export QR', 'Try again in a moment.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <View className="bg-white px-5 pb-3" style={{ paddingTop: stableModalTopInset + 6 }}>
              <Pressable
                onPress={closeWithAnimation}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
              >
                <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 }}
              showsVerticalScrollIndicator={false}
            >
              <View
                ref={qrCardRef}
                collapsable={false}
                className="overflow-hidden rounded-[30px] bg-ink"
                style={{ boxShadow: '0 14px 28px rgba(36, 28, 46, 0.14)' }}
              >
                <View className="bg-ink p-6">
                  <Text className="text-[11px] font-extrabold uppercase tracking-[2px] text-white/60">
                    CultureQuest check-in
                  </Text>
                  <Text className="mt-2 font-heading text-[30px] font-extrabold leading-[34px] text-white">
                    {event.title}
                  </Text>
                  <Text
                    className="mt-2 text-[14px] font-semibold leading-5"
                    style={{ color: 'rgba(255,255,255,0.78)' }}
                  >
                    {event.venueName} · {event.date}, {formatEventTimeRange(event)}
                  </Text>

                  <View className="mt-7 items-center rounded-[28px] bg-white p-6">
                    <QRCode
                      backgroundColor="#FFFFFF"
                      color={Colors.light.ink}
                      size={220}
                      value={event.checkInCode}
                    />
                    <Text className="mt-5 text-center text-[11px] font-extrabold uppercase tracking-[1.8px] text-muted">
                      Backup code
                    </Text>
                    <Text className="mt-1 text-center font-ui text-[22px] font-extrabold tracking-[2px] text-ink">
                      {event.checkInCode}
                    </Text>
                  </View>

                  <Text
                    className="mt-5 text-center text-[12px] leading-5"
                    style={{ color: 'rgba(255,255,255,0.72)' }}
                  >
                    Place this card at the venue entrance. Students must scan it in CultureQuest
                    while they are within 500m of the venue.
                  </Text>
                </View>
              </View>

              <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="font-ui text-[15px] font-extrabold text-ink">Organizer note</Text>
                <Text className="mt-1 text-[13px] leading-5 text-muted">
                  Share this PNG with the venue, save it to Files, or print it from the iOS share
                  sheet. The QR code contains only the event check-in code.
                </Text>
              </View>

              <Pressable
                disabled={sharing}
                onPress={shareQrPass}
                className="mt-4 h-[52px] flex-row items-center justify-center rounded-2xl bg-primary active:opacity-85 disabled:opacity-60"
              >
                <Text className="text-[15px] font-extrabold text-white">
                  {sharing ? 'Preparing PNG...' : 'Share / save PNG'}
                </Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function HistoryInfoRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/10">{icon}</View>
      <Text className="flex-1 text-[13px] font-medium text-ink/75">{label}</Text>
    </View>
  );
}

function slugifyForFile(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'event'
  );
}

function HistoryEngagementStats({
  event,
  status,
}: {
  event: CultureEvent;
  status?: UserEventStatus;
}) {
  const engagement = getEventEngagement(event, status);

  return (
    <View className="mt-3 flex-row gap-2">
      <HistoryStatPill
        icon={<Users size={14} color="#7C3AED" strokeWidth={2.4} />}
        label="Interested"
        value={engagement.interested}
      />
      <HistoryStatPill
        icon={<CheckCircle2 size={14} color="#7C3AED" strokeWidth={2.4} />}
        label="Going"
        value={engagement.going}
      />
      <HistoryStatPill
        icon={<CheckCircle2 size={14} color="#7C3AED" strokeWidth={2.4} />}
        label="Attended"
        value={engagement.attended}
      />
    </View>
  );
}

function HistoryStatPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5 rounded-2xl bg-primary/5 px-2.5 py-2">
      {icon}
      <Text className="min-w-0 flex-1 text-[11px] font-semibold text-ink/70" numberOfLines={1}>
        {value.toLocaleString()} {label}
      </Text>
    </View>
  );
}

function getEventImageSource(event: CultureEvent) {
  if (event.imageUrl) {
    return { uri: event.imageUrl };
  }
  if (event.organizerAvatarUrl) {
    return { uri: event.organizerAvatarUrl };
  }

  if (event.organizerImage === 'cafe') {
    return require('@/assets/images/culture/venue-cafe.jpg');
  }
  if (event.organizerImage === 'theater') {
    return require('@/assets/images/culture/venue-theater.jpg');
  }

  return require('@/assets/images/culture/venue-museum.jpg');
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

function OrganizerRewardStatusPill({ status }: { status: OrganizerRewardStatus }) {
  const statusStyle = getOrganizerRewardStatusStyle(status);

  return (
    <View className={`rounded-full px-2.5 py-1 ${statusStyle.container}`}>
      <Text className={`text-[10px] font-extrabold ${statusStyle.text}`}>{statusStyle.label}</Text>
    </View>
  );
}

function getOrganizerRewardStatusStyle(status: OrganizerRewardStatus) {
  if (status === 'approved') {
    return { container: 'bg-primary/10', label: 'Approved', text: 'text-primary' };
  }
  if (status === 'rejected') {
    return { container: 'bg-destructive/10', label: 'Rejected', text: 'text-destructive' };
  }
  if (status === 'archived') {
    return { container: 'bg-gray-100', label: 'Archived', text: 'text-muted' };
  }
  if (status === 'draft') {
    return { container: 'bg-gray-100', label: 'Draft', text: 'text-muted' };
  }

  return { container: 'bg-secondary/12', label: 'Pending', text: 'text-secondary' };
}

function getRewardHistoryImageSource(reward: ManagedOrganizerReward) {
  if (reward.organizerAvatarUrl) {
    return { uri: reward.organizerAvatarUrl };
  }
  if (reward.imageUrl) {
    return { uri: reward.imageUrl };
  }

  if (reward.category === 'bookstore') {
    return require('@/assets/images/culture/venue-museum.jpg');
  }
  if (reward.category === 'bar' || reward.name.toLowerCase().includes('brew')) {
    return require('@/assets/images/culture/venue-theater.jpg');
  }

  return require('@/assets/images/culture/venue-cafe.jpg');
}

function formatSubmittedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Submitted';

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
}

function formatEventTimeRange(event: CultureEvent) {
  return event.endTime ? `${event.time}-${event.endTime}` : event.time;
}

type RewardsSectionProps = {
  cityName: string;
  error?: string | null;
  loading?: boolean;
  onOpenAll: () => void;
  onSelectReward: (reward: RewardPartner) => void;
  redeemedRewards: Record<string, RedeemedRewardState>;
  rewards: RewardPartner[];
  userXp: number;
};

export function RewardsSection({
  cityName,
  error,
  loading = false,
  onOpenAll,
  onSelectReward,
  redeemedRewards,
  rewards,
  userXp,
}: RewardsSectionProps) {
  const featuredReward = getFeaturedReward(rewards, userXp, redeemedRewards);
  const hasMoreRewards = rewards.length > 1;

  return (
    <View className="mb-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-heading text-[22px] font-extrabold text-ink">Rewards</Text>
        {hasMoreRewards ? (
          <Pressable onPress={onOpenAll} className="active:opacity-75">
            <Text className="text-[12px] font-extrabold text-primary">View all</Text>
          </Pressable>
        ) : (
          <Text className="text-[11px] font-semibold text-primary">{cityName}</Text>
        )}
      </View>

      {loading ? (
        <LoadingState
          body={`Loading approved partner rewards for ${cityName}.`}
          compact
          title="Loading rewards"
        />
      ) : error ? (
        <ErrorState
          body="Apply the latest Supabase migration if you have not done it."
          compact
          style={{ marginBottom: 12 }}
          title="Rewards could not load"
        />
      ) : rewards.length === 0 ? (
        <EmptyState
          body={`Approved partner rewards in ${cityName} will appear here after CultureQuest review.`}
          title="No rewards yet"
        />
      ) : null}

      {!loading && featuredReward && (
        <View>
          <RewardPartnerRow
            reward={featuredReward.reward}
            onPress={() => onSelectReward(featuredReward.reward)}
            redemption={redeemedRewards[featuredReward.reward.id]}
            userXp={userXp}
            variantIndex={featuredReward.index}
          />
        </View>
      )}
    </View>
  );
}

export function RewardsListModal({
  cityName,
  onClose,
  onSelectReward,
  redeemedRewards,
  rewards,
  stableModalTopInset,
  userXp,
  visible,
}: {
  cityName: string;
  onClose: () => void;
  onSelectReward: (reward: RewardPartner) => void;
  redeemedRewards: Record<string, RedeemedRewardState>;
  rewards: RewardPartner[];
  stableModalTopInset: number;
  userXp: number;
  visible: boolean;
}) {
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    onSwipeBack: onClose,
    visible,
  });

  return (
    <Modal animationType="slide" transparent onRequestClose={closeWithAnimation} visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-white" style={swipeStyle}>
          <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <View className="bg-white px-5 pb-3" style={{ paddingTop: stableModalTopInset + 6 }}>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={closeWithAnimation}
                  className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 active:opacity-80"
                >
                  <ArrowLeft size={21} color="#756F7B" strokeWidth={2.6} />
                </Pressable>
                <View className="items-end">
                  <Text className="font-heading text-[25px] font-extrabold text-ink">Rewards</Text>
                  <Text className="text-[12px] font-semibold text-primary">{cityName}</Text>
                </View>
              </View>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                gap: 12,
                paddingHorizontal: 20,
                paddingTop: 12,
                paddingBottom: 36,
              }}
              showsVerticalScrollIndicator={false}
            >
              {getRewardDisplayOrder(rewards, userXp, redeemedRewards).map(({ index, reward }) => (
                <RewardPartnerRow
                  key={reward.id}
                  onPress={() => {
                    onClose();
                    onSelectReward(reward);
                  }}
                  redemption={redeemedRewards[reward.id]}
                  reward={reward}
                  userXp={userXp}
                  variantIndex={index}
                />
              ))}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function getFeaturedReward(
  rewards: RewardPartner[],
  userXp: number,
  redeemedRewards: Record<string, RedeemedRewardState>,
) {
  return getRewardDisplayOrder(rewards, userXp, redeemedRewards)[0] ?? null;
}

function getRewardDisplayOrder(
  rewards: RewardPartner[],
  userXp: number,
  redeemedRewards: Record<string, RedeemedRewardState>,
) {
  return rewards
    .map((reward, index) => ({ index, reward }))
    .sort((first, second) => {
      const firstPriority = getRewardSortPriority(
        first.reward,
        userXp,
        redeemedRewards[first.reward.id],
      );
      const secondPriority = getRewardSortPriority(
        second.reward,
        userXp,
        redeemedRewards[second.reward.id],
      );

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      return first.index - second.index;
    });
}

function getRewardSortPriority(
  reward: RewardPartner,
  userXp: number,
  redemption?: RedeemedRewardState,
) {
  if (redemption?.used) return 3;
  if (userXp >= reward.xpCost && !redemption) return 0;
  if (redemption) return 1;
  return 2;
}
