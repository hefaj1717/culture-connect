const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { buildPendingEventChanges } from '@/lib/admin-moderation';

describe('admin event review changes', () => {
  it('shows a changed event end date alongside other edits', () => {
    const changes = buildPendingEventChanges({
      category: 'concert',
      city_key: 'lublin',
      created_at: '2026-09-28T10:00:00.000Z',
      date_label: 'Sun, Sep 28',
      description: 'Updated description',
      end_date_label: 'Tue, Sep 30',
      end_time_label: '22:00',
      id: 'event-1',
      image_url: null,
      organizer_user_id: 'organizer-1',
      review_previous_snapshot: {
        category: 'concert',
        date_label: 'Sun, Sep 28',
        description: 'Original description',
        end_date_label: 'Mon, Sep 29',
        end_time_label: '22:00',
        image_url: null,
        time_label: '18:00',
        title: 'Concert',
        venue_address: 'Main Street 1',
        venue_name: 'Venue',
      },
      time_label: '18:00',
      title: 'Concert',
      venue_address: 'Main Street 1',
      venue_name: 'Venue',
    });

    expect(changes).toEqual(
      expect.arrayContaining([
        { field: 'End date', from: 'Mon, Sep 29', to: 'Tue, Sep 30' },
        {
          field: 'Description',
          from: 'Original description',
          to: 'Updated description',
        },
      ]),
    );
  });
});
