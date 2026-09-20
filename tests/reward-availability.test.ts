import {
  getIsoDaysInDateRange,
  normalizeRewardTimeInput,
  toggleRewardAvailabilityDay,
  validateRewardAvailability,
} from '@/lib/reward-availability';

describe('reward availability rules', () => {
  it('derives every weekday covered by a date range', () => {
    expect(getIsoDaysInDateRange('2026-09-21', '2026-09-27')).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps reward time input in a valid HH:mm shape', () => {
    expect(normalizeRewardTimeInput('0930')).toBe('09:30');
    expect(normalizeRewardTimeInput('9:3a0')).toBe('93:0');
  });

  it('rejects an end time before the start time', () => {
    expect(
      validateRewardAvailability({
        availableDays: [1],
        availableEndTime: '09:00',
        availableFrom: '2026-09-21',
        availableStartTime: '18:00',
        availableUntil: '2026-09-25',
      }),
    ).toBe('Reward end time must be after the start time.');
  });

  it('toggles a weekday without duplicating it', () => {
    expect(toggleRewardAvailabilityDay([1, 3], 2)).toEqual([1, 2, 3]);
    expect(toggleRewardAvailabilityDay([1, 2, 3], 2)).toEqual([1, 3]);
  });
});
