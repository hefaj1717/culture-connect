const monthIndexes: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Rebuilds an event timestamp edited through the admin's compact date fields.
 * The UI stores labels such as `Fri, Sep 18`, so the existing timestamp remains
 * the source of truth for the year and local timezone.
 */
export function buildEditedEventTimestamp(
  dateLabel: string,
  timeLabel: string,
  fallbackTimestamp?: string,
) {
  if (!fallbackTimestamp) return null;

  const fallback = new Date(fallbackTimestamp);
  if (Number.isNaN(fallback.getTime())) return null;

  const dateMatch = dateLabel.trim().match(/^(?:[A-Za-z]{3},\s*)?([A-Za-z]{3})\s+(\d{1,2})$/);
  const timeMatch = timeLabel.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  const month = monthIndexes[dateMatch[1].toLowerCase()];
  const day = Number(dateMatch[2]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month === undefined || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const edited = new Date(fallback);
  edited.setMonth(month, day);
  edited.setHours(hour, minute, 0, 0);

  if (edited.getMonth() !== month || edited.getDate() !== day) return null;
  return edited.toISOString();
}
