import { X, UserCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { OrganizerAvatar, OrganizerProfileModal } from '@/components/organizer-profile-modal';
import { Colors } from '@/constants/theme';
import { getCultureCityData, type CultureEvent } from '@/data/culture';
import type { OrganizerProfile } from '@/lib/organizer-profiles';

type FollowedOrganizersModalProps = {
  activeProfile: OrganizerProfile | null;
  activeProfileEvents: CultureEvent[];
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onCloseProfile: () => void;
  onOpenEvent: (event: CultureEvent) => void;
  onOpenProfile: (profile: OrganizerProfile) => void;
  onRetry: () => void;
  onUnfollow: (organizerId: string) => Promise<{ error: string | null }>;
  profiles: OrganizerProfile[];
  stableModalTopInset: number;
  visible: boolean;
};

export function FollowedOrganizersModal({
  activeProfile,
  activeProfileEvents,
  error,
  loading,
  onClose,
  onCloseProfile,
  onOpenEvent,
  onOpenProfile,
  onRetry,
  onUnfollow,
  profiles,
  stableModalTopInset,
  visible,
}: FollowedOrganizersModalProps) {
  const [unfollowError, setUnfollowError] = useState<string | null>(null);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  async function handleUnfollow(organizerId: string): Promise<{ error: string | null }> {
    if (unfollowingId) return { error: 'Please wait for the current change to finish.' };

    setUnfollowError(null);
    setUnfollowingId(organizerId);
    const result = await onUnfollow(organizerId);
    setUnfollowError(result.error);
    setUnfollowingId(null);
    return result;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={activeProfile ? onCloseProfile : onClose}
      visible={visible}
    >
      {activeProfile ? (
        <OrganizerProfileModal
          cityName={getCultureCityData(activeProfile.cityId).name}
          embedded
          events={activeProfileEvents}
          onClose={onCloseProfile}
          onOpenEvent={onOpenEvent}
          profile={activeProfile}
        />
      ) : (
      <View className="flex-1 bg-canvas" style={{ paddingTop: stableModalTopInset }}>
        <View className="flex-row items-center px-5 pb-4 pt-3">
          <View className="min-w-0 flex-1">
            <Text className="font-heading text-[30px] leading-9 text-ink">Following</Text>
            <Text className="mt-1 text-[14px] leading-5 text-muted">
              New approved events from these organizers appear in Notifications.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close following"
            className="ml-4 h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-75"
            hitSlop={8}
            onPress={onClose}
          >
            <X size={22} color={Colors.light.textSecondary} strokeWidth={2.2} />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 44, paddingHorizontal: 20, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <LoadingState title="Loading followed organizers" body="Getting your latest list." />
          ) : error && profiles.length === 0 ? (
            <ErrorState
              title="Following could not load"
              body={error}
              onAction={onRetry}
            />
          ) : profiles.length === 0 ? (
            <EmptyState
              title="Not following anyone yet"
              body="Open an organizer profile and tap Follow to receive updates about new events."
              icon={UserCheck}
            />
          ) : (
            <View className="overflow-hidden rounded-feature border border-primary/10 bg-surface px-5">
              {unfollowError ? (
                <Text className="border-b border-primary/10 py-3 text-[12px] leading-4 text-destructive">
                  {unfollowError}
                </Text>
              ) : null}
              {error ? (
                <Text className="border-b border-primary/10 py-3 text-[12px] leading-4 text-muted">
                  Some changes may not be up to date. Pull to retry later.
                </Text>
              ) : null}
              {profiles.map((profile, index) => (
                <FollowedOrganizerRow
                  isLast={index === profiles.length - 1}
                  isUnfollowDisabled={!!unfollowingId}
                  key={profile.id}
                  onOpenProfile={onOpenProfile}
                  onUnfollow={handleUnfollow}
                  profile={profile}
                  unfollowing={unfollowingId === profile.id}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
      )}
    </Modal>
  );
}

function FollowedOrganizerRow({
  isLast,
  isUnfollowDisabled,
  onOpenProfile,
  onUnfollow,
  profile,
  unfollowing,
}: {
  isLast: boolean;
  isUnfollowDisabled: boolean;
  onOpenProfile: (profile: OrganizerProfile) => void;
  onUnfollow: (organizerId: string) => Promise<{ error: string | null }>;
  profile: OrganizerProfile;
  unfollowing: boolean;
}) {
  return (
    <View className={`flex-row items-center gap-3 py-4 ${isLast ? '' : 'border-b border-primary/10'}`}>
      <Pressable
        accessibilityLabel={`Open ${profile.name}`}
        accessibilityRole="button"
        className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-75"
        onPress={() => onOpenProfile(profile)}
      >
        <OrganizerAvatar profile={profile} size={50} />
        <View className="min-w-0 flex-1">
        <Text className="font-serifRegular text-[18px] leading-6 text-ink" numberOfLines={1}>
          {profile.name}
        </Text>
        <Text className="mt-0.5 text-[12px] font-medium text-muted" numberOfLines={1}>
          {getCultureCityData(profile.cityId).name}
        </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Unfollow ${profile.name}`}
        className={`flex-row items-center gap-1 rounded-full bg-success/15 px-2.5 py-2 ${
          unfollowing ? 'opacity-55' : 'active:opacity-75'
        }`}
        disabled={isUnfollowDisabled}
        onPress={() => void onUnfollow(profile.id)}
      >
        <UserCheck size={14} color={Colors.light.success} strokeWidth={2.5} />
        <Text className="text-[11px] font-bold text-success">
          {unfollowing ? 'Saving…' : 'Following'}
        </Text>
      </Pressable>
    </View>
  );
}
