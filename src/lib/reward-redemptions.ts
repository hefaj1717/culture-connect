import type { RedeemedRewardState } from '@/data/profile';
import { supabase } from '@/lib/supabase';

type RewardRedemptionRow = {
  code: string;
  expires_at: string;
  redeemed_at: string;
  reward_id: string;
  used_at: string | null;
};

type RedeemOrganizerRewardResponse = {
  code?: string;
  duplicate?: boolean;
  error?: string;
  expires_at?: string;
  redeemed_at?: string;
  redemption_id?: string;
  success?: boolean;
  total_xp?: number;
  used_at?: string | null;
  xp_needed?: number;
  xp_spent?: number;
};

export function getOrganizerRewardUuid(rewardId: string) {
  return rewardId.startsWith('organizer-reward-')
    ? rewardId.replace(/^organizer-reward-/, '')
    : rewardId;
}

export async function fetchRewardRedemptions(rewardIds: string[]) {
  const organizerRewardIds = rewardIds.map(getOrganizerRewardUuid).filter(Boolean);

  if (organizerRewardIds.length === 0) {
    return { error: null, redemptions: {} as Record<string, RedeemedRewardState> };
  }

  const { data, error } = await supabase
    .from('organizer_reward_redemptions')
    .select('reward_id, code, redeemed_at, expires_at, used_at')
    .in('reward_id', organizerRewardIds);

  if (error) {
    return { error: error.message, redemptions: {} as Record<string, RedeemedRewardState> };
  }

  return {
    error: null,
    redemptions: ((data ?? []) as RewardRedemptionRow[]).reduce(
      (nextRedemptions, row) => ({
        ...nextRedemptions,
        [`organizer-reward-${row.reward_id}`]: mapRedemptionRow(row),
      }),
      {} as Record<string, RedeemedRewardState>,
    ),
  };
}

export async function redeemOrganizerReward(rewardId: string) {
  const { data, error } = await supabase.rpc('redeem_organizer_reward', {
    _reward_id: getOrganizerRewardUuid(rewardId),
  });

  if (error) {
    return { error: error.message, redemption: null, totalXp: null, xpNeeded: null };
  }

  const result = data as RedeemOrganizerRewardResponse;

  if (!result.success) {
    return {
      error: getRedeemErrorMessage(result.error, result.xp_needed),
      redemption: null,
      totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
      xpNeeded: typeof result.xp_needed === 'number' ? result.xp_needed : null,
    };
  }

  if (!result.code || !result.redeemed_at || !result.expires_at) {
    return {
      error: 'Reward was redeemed, but the pickup code could not be loaded.',
      redemption: null,
      totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
      xpNeeded: null,
    };
  }

  return {
    error: null,
    redemption: {
      code: result.code,
      expiresAt: Date.parse(result.expires_at),
      redeemedAt: Date.parse(result.redeemed_at),
      used: isRedemptionUsed(result.expires_at, result.used_at ?? null),
      usedAt: result.used_at ? Date.parse(result.used_at) : null,
    } satisfies RedeemedRewardState,
    totalXp: typeof result.total_xp === 'number' ? result.total_xp : null,
    xpNeeded: null,
  };
}

function mapRedemptionRow(row: RewardRedemptionRow): RedeemedRewardState {
  return {
    code: row.code,
    expiresAt: Date.parse(row.expires_at),
    redeemedAt: Date.parse(row.redeemed_at),
    used: isRedemptionUsed(row.expires_at, row.used_at),
    usedAt: row.used_at ? Date.parse(row.used_at) : null,
  };
}

function isRedemptionUsed(expiresAt: string, usedAt: string | null) {
  return !!usedAt || Date.parse(expiresAt) <= Date.now();
}

function getRedeemErrorMessage(error?: string, xpNeeded?: number) {
  if (error === 'insufficient_xp') {
    return `You need ${Math.max(0, xpNeeded ?? 0).toLocaleString()} more XP to redeem this reward.`;
  }
  if (error === 'not_authenticated') {
    return 'Log in again to redeem this reward.';
  }
  if (error === 'reward_unavailable') {
    return 'This reward is not available anymore.';
  }

  return 'Could not redeem this reward. Try again.';
}
