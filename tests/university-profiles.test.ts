const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { fetchUniversityProfileSummary } from '@/lib/university-profiles';

describe('university profiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads only the aggregate profile RPC and maps finalized podium history', async () => {
    mockRpc.mockResolvedValue({
      data: {
        active_member_count: 12,
        city_key: 'lublin',
        current_rank: 2,
        ranking_history: [
          {
            academic_year: '2026/2027',
            finalized_at: '2027-06-30T12:00:00Z',
            member_count: 10,
            rank: 1,
            total_xp: 8200,
          },
        ],
        success: true,
        total_xp: 10600,
        university_id: 'umcs',
        university_name: 'Maria Curie-Sklodowska University',
        university_short_name: 'UMCS',
      },
      error: null,
    });

    await expect(fetchUniversityProfileSummary('umcs')).resolves.toMatchObject({
      error: null,
      profile: {
        currentRank: 2,
        memberCount: 12,
        rankingHistory: [{ academicYear: '2026/2027', rank: 1, totalXp: 8200 }],
        totalXp: 10600,
      },
    });

    expect(mockRpc).toHaveBeenCalledWith('get_university_profile_summary', {
      _university_id: 'umcs',
    });
  });
});
