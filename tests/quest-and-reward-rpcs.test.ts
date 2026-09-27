const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { completeQuest } from '@/lib/quest-completions';
import { redeemOrganizerReward } from '@/lib/reward-redemptions';

describe('critical Supabase RPC clients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the quest proof to the completion RPC and exposes invalid proof errors', async () => {
    mockRpc.mockResolvedValue({
      data: { error: 'wrong_completion_code', success: false, total_xp: 120 },
      error: null,
    });

    await expect(completeQuest('quest-1', 'proof-123')).resolves.toEqual({
      duplicate: false,
      error: 'This QR code does not complete this quest.',
      totalXp: 120,
    });
    expect(mockRpc).toHaveBeenCalledWith('complete_quest', {
      _completion_code: 'proof-123',
      _quest_id: 'quest-1',
    });
  });

  it('does not display a reward code when redemption is incomplete', async () => {
    mockRpc.mockResolvedValue({
      data: { success: true, total_xp: 40 },
      error: null,
    });

    const result = await redeemOrganizerReward('organizer-reward-reward-1');

    expect(mockRpc).toHaveBeenCalledWith('redeem_organizer_reward', { _reward_id: 'reward-1' });
    expect(result.redemption).toBeNull();
    expect(result.error).toContain('pickup code could not be loaded');
  });

  it('returns the remaining QC when the database rejects redemption', async () => {
    mockRpc.mockResolvedValue({
      data: { error: 'insufficient_qc', success: false, total_qc: 3, qc_needed: 2 },
      error: null,
    });

    await expect(redeemOrganizerReward('organizer-reward-reward-1')).resolves.toMatchObject({
      error: 'You need 2 more CultureQuest Credits to redeem this reward.',
      redemption: null,
      totalQc: 3,
      qcNeeded: 2,
    });
  });
});
