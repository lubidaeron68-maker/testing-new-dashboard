/**
 * Utility functions for date and time formatting
 * Converts execution time formats like "21-10-2026 22:01:10" to 12-Hour format ("21-10-2026 10:01:10 PM").
 */

/**
 * Converts a datetime string or time string to 12-Hour format with AM/PM.
 * Handles:
 * - "21-10-2026 22:01:10" -> "21-10-2026 10:01:10 PM"
 * - "2026-10-21 22:01:10" -> "2026-10-21 10:01:10 PM"
 * - "22:01:10" -> "10:01:10 PM"
 * - "09:15:00" -> "09:15:00 AM"
 * - "00:00:00" -> "12:00:00 AM"
 * - Already 12-hour format -> returns as-is
 */
export function convertTo12HourFormat(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  const s = String(dateTimeStr).trim();

  // If already contains AM or PM, return as-is
  if (/am|pm/i.test(s)) {
    return s;
  }

  // Match optional date prefix and time: (prefix) (HH:mm(:ss)?)
  // Prefix can be "21-10-2026", "2026-10-21", "21/10/2026", etc.
  const match = s.match(/^(?:(.*?)[\sT])?(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return s;

  const datePrefix = match[1] ? match[1].trim() + ' ' : '';
  const rawHour = parseInt(match[2], 10);
  const minutes = match[3];
  const seconds = match[4] !== undefined ? `:${match[4]}` : '';

  if (isNaN(rawHour) || rawHour < 0 || rawHour > 23) {
    return s;
  }

  const ampm = rawHour >= 12 ? 'PM' : 'AM';
  let hour12 = rawHour % 12;
  if (hour12 === 0) hour12 = 12;
  const hour12Str = hour12 < 10 ? `0${hour12}` : String(hour12);

  return `${datePrefix}${hour12Str}:${minutes}${seconds} ${ampm}`;
}

/**
 * Extracts 12-hour label for an hour number (0-23)
 * 0 -> "12 AM", 1 -> "1 AM", 12 -> "12 PM", 22 -> "10 PM"
 */
export function get12HourHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Parses the numeric hour (0-23) from any execution time string.
 * Handles both 24-hour and 12-hour format:
 * - "21-10-2026 22:01:10" -> 22
 * - "21-10-2026 10:01:10 PM" -> 22
 * - "21-10-2026 10:01:10 AM" -> 10
 * - "22:01:10" -> 22
 * - "12:00:00 AM" -> 0
 * - "12:00:00 PM" -> 12
 */
export function parseHourFromExecutionTime(timeStr: string): number | null {
  if (!timeStr) return null;
  const s = String(timeStr).trim();

  // 1. Check for 12-hour format with AM/PM (e.g., "10:01:10 PM" or "21-10-2026 10:01:10 PM")
  const match12 = s.match(/(?:^|[\sT])(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const ampm = match12[3].toLowerCase();
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) return h;
  }

  // 2. Check for 24-hour format (e.g., "21-10-2026 22:01:10" or "22:01:10")
  const match24 = s.match(/(?:^|[\sT])(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h;
  }

  return null;
}
