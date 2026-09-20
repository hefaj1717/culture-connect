const mockFrom = jest.fn();
const mockStorageFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
  },
}));

import { createOrganizerEvent } from '@/lib/organizer-events';
import { createQuest } from '@/lib/quests';

describe('Storage upload cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(4) });
  });

  it('removes an uploaded event photo when creating the event fails', async () => {
    const remove = jest.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/image.jpg' } }),
      remove,
      upload: jest.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({ insert: jest.fn().mockResolvedValue({ error: { message: 'insert failed' } }) });

    await expect(
      createOrganizerEvent('user-1', {
        category: 'concert',
        cityId: 'lublin',
        date: 'Mon, Sep 21',
        description: 'Test',
        endDate: 'Mon, Sep 21',
        endTime: '20:00',
        endsAt: '2026-09-21T20:00:00.000Z',
        imageUri: 'file:///photo.jpg',
        isFree: true,
        language: 'pl',
        place: { address: 'Lublin', id: 'place-1', latitude: 51.2, longitude: 22.5, name: 'Venue', source: 'local' },
        startsAt: '2026-09-21T18:00:00.000Z',
        time: '18:00',
        title: 'Test event',
      }),
    ).resolves.toMatchObject({ error: expect.any(String) });

    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^user-1\/\d+\.jpg$/)]);
  });

  it('removes an uploaded quest photo when inserting the quest fails', async () => {
    const remove = jest.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/quest.jpg' } }),
      remove,
      upload: jest.fn().mockResolvedValue({ error: null }),
    });
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    mockFrom.mockReturnValue({ insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) }) });

    await expect(
      createQuest({
        availableFrom: '2026-09-21',
        cityId: 'lublin',
        createdBy: 'admin-1',
        description: 'Test',
        image: 'museum',
        imageUri: 'file:///quest.jpg',
        status: 'draft',
        stops: [],
        theme: 'History',
        title: 'Test quest',
        totalXp: 100,
      }),
    ).resolves.toMatchObject({ error: expect.any(String), questId: null });

    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^admin-1\/\d+\.jpg$/)]);
  });
});
