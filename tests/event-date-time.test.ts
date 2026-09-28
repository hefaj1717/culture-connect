import { buildEditedEventTimestamp } from '@/lib/event-date-time';

describe('buildEditedEventTimestamp', () => {
  it('updates the calendar day and time while preserving the event year', () => {
    const result = buildEditedEventTimestamp('Sat, Sep 19', '21:30', '2026-09-18T14:00:00.000Z');
    const edited = new Date(result!);

    expect(edited.getFullYear()).toBe(2026);
    expect(edited.getMonth()).toBe(8);
    expect(edited.getDate()).toBe(19);
    expect(edited.getHours()).toBe(21);
    expect(edited.getMinutes()).toBe(30);
  });

  it('rejects impossible or incomplete values', () => {
    expect(buildEditedEventTimestamp('Feb 31', '20:00', '2026-02-10T10:00:00.000Z')).toBeNull();
    expect(buildEditedEventTimestamp('Sep 19', '25:00', '2026-09-18T10:00:00.000Z')).toBeNull();
    expect(buildEditedEventTimestamp('Sep 19', '20:00')).toBeNull();
  });
});
