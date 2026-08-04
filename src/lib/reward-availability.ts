import type { CityId, RewardPartner } from '@/data/culture';

export const rewardWeekdays = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' },
  { key: 7, label: 'Sun' },
] as const;

export const defaultRewardAvailabilityDays = rewardWeekdays.map((day) => day.key);
export const defaultRewardStartTime = '09:00';
export const defaultRewardEndTime = '18:00';

const cityTimeZones: Record<CityId, string> = {
  leuven: 'Europe/Brussels',
  lublin: 'Europe/Warsaw',
};

export type RewardAvailabilityInput = {
  availableDays: number[];
  availableEndTime: string;
  availableFrom: string;
  availableStartTime: string;
  availableUntil: string;
};

type RewardAvailabilitySource = {
  availableDays?: number[];
  availableEndTime?: string | null;
  availableFrom?: string | null;
  availableStartTime?: string | null;
  availableUntil?: string | null;
  cityId?: CityId;
};

export function getDefaultRewardAvailability(): RewardAvailabilityInput {
  const today = formatDateInput(new Date());

  return {
    availableDays: getIsoDaysInDateRange(today, today),
    availableEndTime: defaultRewardEndTime,
    availableFrom: today,
    availableStartTime: defaultRewardStartTime,
    availableUntil: today,
  };
}

export function normalizeRewardDateInput(value: string) {
  return value.replace(/[^\d-]/g, '').slice(0, 10);
}

export function normalizeRewardTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function getIsoDaysInDateRange(from: string, until?: string | null) {
  if (!isValidDateInput(from)) return defaultRewardAvailabilityDays;

  const end = until && isValidDateInput(until) && until >= from ? until : from;
  const startDate = parseDateInput(from);
  const endDate = parseDateInput(end);
  if (!startDate || !endDate) return defaultRewardAvailabilityDays;

  const days = new Set<number>();
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    days.add(toIsoWeekday(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return Array.from(days).sort((a, b) => a - b);
}

export function validateRewardAvailability(input: RewardAvailabilityInput) {
  if (input.availableDays.length === 0) {
    return 'Choose at least one day when this reward can be redeemed.';
  }
  if (!isValidDateInput(input.availableFrom)) {
    return 'Enter reward start date as YYYY-MM-DD.';
  }
  if (input.availableUntil && !isValidDateInput(input.availableUntil)) {
    return 'Enter reward end date as YYYY-MM-DD, or leave it blank.';
  }
  if (input.availableUntil && input.availableUntil < input.availableFrom) {
    return 'Reward end date cannot be before the start date.';
  }
  if (!isValidTimeInput(input.availableStartTime) || !isValidTimeInput(input.availableEndTime)) {
    return 'Enter reward hours as HH:mm.';
  }
  if (input.availableStartTime >= input.availableEndTime) {
    return 'Reward end time must be after the start time.';
  }

  return null;
}

export function formatRewardAvailability(reward: RewardAvailabilitySource) {
  const days = reward.availableDays?.length
    ? reward.availableDays
    : defaultRewardAvailabilityDays;
  const dayLabel = formatDays(days);
  const startTime = reward.availableStartTime ?? defaultRewardStartTime;
  const endTime = reward.availableEndTime ?? defaultRewardEndTime;
  const fromLabel = reward.availableFrom ? `from ${formatShortDate(reward.availableFrom)}` : '';
  const untilLabel = reward.availableUntil ? `until ${formatShortDate(reward.availableUntil)}` : '';
  const dateLabel = [fromLabel, untilLabel].filter(Boolean).join(' ');

  return `${dayLabel}, ${startTime}-${endTime}${dateLabel ? ` · ${dateLabel}` : ''}`;
}

export function isRewardCurrentlyAvailable(reward: RewardPartner, now = new Date()) {
  const cityId = reward.cityId ?? 'leuven';
  const localParts = getLocalDateParts(now, cityId);
  const today = localParts.date;
  const currentTime = localParts.time;
  const activeDays = reward.availableDays?.length
    ? reward.availableDays
    : defaultRewardAvailabilityDays;
  const startTime = reward.availableStartTime ?? defaultRewardStartTime;
  const endTime = reward.availableEndTime ?? defaultRewardEndTime;

  if (reward.availableFrom && today < reward.availableFrom) return false;
  if (reward.availableUntil && today > reward.availableUntil) return false;
  if (!activeDays.includes(localParts.isoDay)) return false;

  return currentTime >= startTime && currentTime <= endTime;
}

export function toggleRewardAvailabilityDay(days: number[], day: number) {
  if (days.includes(day)) {
    return days.filter((currentDay) => currentDay !== day);
  }

  return [...days, day].sort((a, b) => a - b);
}

function getLocalDateParts(date: Date, cityId: CityId) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: cityTimeZones[cityId],
    weekday: 'short',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = getPart('weekday').toLowerCase();

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    isoDay: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(weekday) + 1,
    time: `${getPart('hour')}:${getPart('minute')}`,
  };
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateInput(value: string) {
  if (!isValidDateInput(value)) return null;
  return new Date(`${value}T00:00:00`);
}

function toIsoWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function isValidTimeInput(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function formatDays(days: number[]) {
  const sortedDays = [...days].sort((a, b) => a - b);
  if (sortedDays.length === 7) return 'Every day';
  if (sameDays(sortedDays, [1, 2, 3, 4, 5])) return 'Weekdays';
  if (sameDays(sortedDays, [6, 7])) return 'Weekends';

  return sortedDays
    .map((day) => rewardWeekdays.find((weekday) => weekday.key === day)?.label)
    .filter(Boolean)
    .join(', ');
}

function sameDays(days: number[], expected: number[]) {
  return days.length === expected.length && days.every((day, index) => day === expected[index]);
}
