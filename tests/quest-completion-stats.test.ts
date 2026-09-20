const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { fetchApprovedQuests } from '@/lib/quests';

const questRows = [
  {
    available_from: '2026-09-20',
    available_until: null,
    description: 'A route through Lublin.',
    id: '00000000-0000-0000-0000-000000000001',
    image_kind: 'museum',
    image_url: null,
    theme: 'City route',
    title: 'Old Town route',
    total_xp: 100,
  },
];

function resolvedQuery(result: unknown) {
  type Query = {
    eq: (...args: unknown[]) => Query;
    in: (...args: unknown[]) => Query;
    order: (...args: unknown[]) => Promise<unknown>;
    select: (...args: unknown[]) => Query;
  };

  const query: Query = {
    eq: jest.fn(() => query),
    in: jest.fn(() => query),
    order: jest.fn(() => Promise.resolve(result)),
    select: jest.fn(() => query),
  };

  return query;
}

describe('quest completion totals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'quests') return resolvedQuery({ data: questRows, error: null });
      if (table === 'quest_stops') return resolvedQuery({ data: [], error: null });
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('uses the aggregate RPC instead of reading private completion rows through a view', async () => {
    mockRpc.mockResolvedValue({
      data: [{ completion_count: 7, quest_id: questRows[0].id }],
      error: null,
    });

    await expect(fetchApprovedQuests('lublin')).resolves.toMatchObject({
      error: null,
      quests: [{ completionCount: 7, id: questRows[0].id }],
    });

    expect(mockRpc).toHaveBeenCalledWith('get_approved_quest_completion_stats', {
      _quest_ids: [questRows[0].id],
    });
    expect(mockFrom).not.toHaveBeenCalledWith('quest_completion_stats');
  });
});
