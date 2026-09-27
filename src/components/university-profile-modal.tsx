import { ArrowLeft } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { CardStyles, Colors } from '@/constants/theme';
import { useCardSwipeBack } from '@/hooks/use-card-swipe-back';
import type { UniversityProfileSummary, UniversityRankingHistory } from '@/lib/university-profiles';

type UniversityProfileModalProps = {
  error: string | null;
  fallback: {
    memberCount: number;
    name: string;
    rank: number;
    shortName: string;
    totalXp: number;
  } | null;
  loading: boolean;
  onClose: () => void;
  profile: UniversityProfileSummary | null;
  visible: boolean;
};

export function UniversityProfileModal({
  error,
  fallback,
  loading,
  onClose,
  profile,
  visible,
}: UniversityProfileModalProps) {
  const insets = useSafeAreaInsets();
  const { closeWithAnimation, gesture, swipeStyle } = useCardSwipeBack({
    onSwipeBack: onClose,
    visible,
  });
  const university = profile
    ? {
        memberCount: profile.memberCount,
        name: profile.name,
        rank: profile.currentRank,
        shortName: profile.shortName,
        totalXp: profile.totalXp,
      }
    : fallback;

  return (
    <Modal animationType="slide" onRequestClose={closeWithAnimation} transparent visible={visible}>
      <GestureDetector gesture={gesture}>
        <Animated.View className="flex-1 bg-canvas" style={swipeStyle}>
          <ScrollView
            className="flex-1 bg-canvas"
            contentContainerStyle={{ paddingBottom: insets.bottom + 36, paddingTop: insets.top + 8 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="px-5">
              <Pressable
                accessibilityLabel="Back to campus ranking"
                className="mb-5 h-12 w-12 items-center justify-center rounded-full active:opacity-80"
                hitSlop={8}
                onPress={closeWithAnimation}
                style={{ backgroundColor: Colors.light.backgroundElement }}
              >
                <ArrowLeft color={Colors.light.primary} size={22} strokeWidth={2.6} />
              </Pressable>

              {university ? (
                <UniversityProfileContent profile={profile} university={university} />
              ) : loading ? (
                <LoadingState body="Preparing the latest campus ranking." title="Loading university" />
              ) : (
                <ErrorState
                  body={error ?? 'This university profile is not available right now.'}
                  title="University could not load"
                />
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

function UniversityProfileContent({
  profile,
  university,
}: {
  profile: UniversityProfileSummary | null;
  university: NonNullable<UniversityProfileModalProps['fallback']>;
}) {
  const history = profile?.rankingHistory ?? [];
  const description = profile?.description ?? 'Loading this campus community profile.';

  return (
    <>
      <View
        className="overflow-hidden rounded-feature"
        style={[CardStyles.elevated, { backgroundColor: Colors.light.backgroundElement }]}
      >
        <View className="flex-row items-start justify-between gap-4 px-5 pb-4 pt-5">
          <View className="min-w-0 flex-1">
            <View className="self-start rounded-full bg-success/15 px-2.5 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-wide text-success">
                Campus community
              </Text>
            </View>
            <Text className="mt-3 font-heading text-[29px] leading-9 text-ink">{university.name}</Text>
          </View>
          <UniversityMonogram shortName={university.shortName} size={68} />
        </View>

        <View className="border-t border-primary/10 px-5 pb-5 pt-4">
          <View className="mb-2 flex-row items-center gap-3">
            <Text className="font-serifRegular text-[20px] leading-6 text-ink">About</Text>
            <View className="h-px flex-1 bg-primary/15" />
          </View>
          <Text className="text-[14px] leading-6 text-muted">{description}</Text>
          <View className="mt-5">
            <CampusStanding
              memberCount={university.memberCount}
              rank={university.rank}
              totalXp={university.totalXp}
            />
          </View>
        </View>
      </View>

      <View className="mt-7">
        <Text className="mb-3 font-heading text-[27px] leading-8 text-ink">Podium history</Text>
        {profile ? (
          history.length ? (
            <View className="overflow-hidden rounded-feature border border-primary/10 bg-surface px-4">
              {history.map((entry, index) => (
                <PodiumHistoryRow
                  entry={entry}
                  isLast={index === history.length - 1}
                  key={`${entry.academicYear}-${entry.rank}`}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              body="Finished academic years with a top-three campus rank will be recorded here."
              compact
              icon={null}
              title="No podium finishes yet"
            />
          )
        ) : (
          <LoadingState compact title="Loading podium history" />
        )}
      </View>
    </>
  );
}

function UniversityMonogram({ shortName, size }: { shortName: string; size: number }) {
  return (
    <View
      className="items-center justify-center rounded-2xl bg-primary/10"
      style={{ height: size, width: size }}
    >
      <Text className="font-ui text-[17px] font-extrabold text-primary" numberOfLines={2}>
        {shortName.slice(0, 5)}
      </Text>
    </View>
  );
}

function CampusStanding({
  memberCount,
  rank,
  totalXp,
}: {
  memberCount: number;
  rank: number;
  totalXp: number;
}) {
  const rankColor = rank >= 1 && rank <= 3 ? getPodiumColors(rank as 1 | 2 | 3).text : Colors.light.primary;

  return (
    <View
      className="overflow-hidden rounded-card border border-primary/10"
      style={{ backgroundColor: Colors.light.backgroundElement }}
    >
      <CampusStandingRow label="Members" value={memberCount.toLocaleString()} />
      <CampusStandingRow accent label="XP" value={`${totalXp.toLocaleString()} XP`} />
      <CampusStandingRow label="Rank" last value={rank ? `#${rank}` : '—'} valueColor={rankColor} />
    </View>
  );
}

function CampusStandingRow({
  accent = false,
  label,
  last = false,
  value,
  valueColor,
}: {
  accent?: boolean;
  label?: string;
  last?: boolean;
  value: string;
  valueColor?: string;
}) {
  return (
    <View className={`flex-row items-center justify-between px-4 py-3.5 ${last ? '' : 'border-b border-primary/10'}`}>
      <Text className="text-[14px] font-semibold text-muted">{label}</Text>
      <Text
        className="font-ui text-[17px] font-extrabold leading-6"
        style={{ color: valueColor ?? (accent ? Colors.light.accent : Colors.light.ink) }}
      >
        {value}
      </Text>
    </View>
  );
}

function PodiumHistoryRow({ entry, isLast }: { entry: UniversityRankingHistory; isLast: boolean }) {
  const colors = getPodiumColors(entry.rank);

  return (
    <View className={`flex-row items-center gap-3 py-4 ${isLast ? '' : 'border-b border-primary/10'}`}>
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: colors.background }}
      >
        <Text className="font-heading text-[17px] leading-5" style={{ color: colors.text }}>
          #{entry.rank}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-serifRegular text-[18px] leading-6 text-ink">{entry.academicYear}</Text>
        <Text className="mt-0.5 text-[12px] leading-4 text-muted">
          {entry.totalXp.toLocaleString()} XP · {entry.memberCount} students
        </Text>
      </View>
      <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ color: colors.text }}>
        {entry.rank === 1 ? 'Gold' : entry.rank === 2 ? 'Silver' : 'Bronze'}
      </Text>
    </View>
  );
}

function getPodiumColors(rank: 1 | 2 | 3) {
  if (rank === 1) return { background: Colors.light.medalGoldSurface, text: Colors.light.medalGold };
  if (rank === 2) return { background: Colors.light.medalSilverSurface, text: Colors.light.medalSilver };
  return { background: Colors.light.medalBronzeSurface, text: Colors.light.medalBronze };
}
