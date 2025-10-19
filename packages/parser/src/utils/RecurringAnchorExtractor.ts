/**
 * Extract anchor date and time from recurring patterns
 */

export interface RecurringAnchor {
  dueDate: Date;
  time?: string;
}

/**
 * Parse RRULE to extract BYHOUR
 */
function extractByHour(rrule: string): number | undefined {
  const match = rrule.match(/BYHOUR=(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

/**
 * Parse RRULE to extract BYDAY
 */
function extractByDay(rrule: string): string[] | undefined {
  const match = rrule.match(/BYDAY=([A-Z,]+)/);
  if (match && match[1]) {
    return match[1].split(",");
  }
  return undefined;
}

/**
 * Parse RRULE to extract FREQ
 */
function extractFreq(rrule: string): string | undefined {
  const match = rrule.match(/FREQ=(\w+)/);
  if (match && match[1]) {
    return match[1];
  }
  return undefined;
}

/**
 * Parse RRULE to extract BYMONTHDAY
 */
function extractByMonthDay(rrule: string): number[] | undefined {
  const match = rrule.match(/BYMONTHDAY=(-?\d+(?:,-?\d+)*)/);
  if (match && match[1]) {
    return match[1].split(",").map((d) => parseInt(d, 10));
  }
  return undefined;
}

/**
 * Find next occurrence of a weekday
 */
function findNextWeekday(referenceDate: Date, targetDay: string): Date {
  const weekdayMap: Record<string, number> = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  };

  const targetDayNum = weekdayMap[targetDay];
  if (targetDayNum === undefined) {
    return referenceDate;
  }

  const currentDay = referenceDate.getDay();
  let daysToAdd = targetDayNum - currentDay;

  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  const nextDate = new Date(referenceDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
}

/**
 * Find next occurrence of a BYMONTHDAY
 */
function findNextMonthDay(referenceDate: Date, targetDay: number): Date {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  // Handle -1 for last day of month
  let actualDay: number;
  if (targetDay === -1) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    actualDay = lastDay;
  } else {
    actualDay = targetDay;
  }

  // If target day hasn't passed this month, use current month
  if (actualDay > currentDay) {
    const nextDate = new Date(year, month, actualDay);
    return nextDate;
  }

  // Otherwise, move to next month
  const nextMonth = month + 1;
  const nextYear = nextMonth > 11 ? year + 1 : year;
  const finalMonth = nextMonth > 11 ? 0 : nextMonth;

  // Handle -1 for last day of next month
  if (targetDay === -1) {
    const lastDay = new Date(nextYear, finalMonth + 1, 0).getDate();
    return new Date(nextYear, finalMonth, lastDay);
  }

  // Clamp to last day of month if needed
  const lastDayOfMonth = new Date(nextYear, finalMonth + 1, 0).getDate();
  const finalDay = Math.min(actualDay, lastDayOfMonth);

  return new Date(nextYear, finalMonth, finalDay);
}

/**
 * Extract recurring anchor (dueDate and time) from RRULE pattern
 *
 * @param recurring - RRULE string
 * @param referenceDate - Reference date for calculating first occurrence
 * @returns Anchor with dueDate and optional time, or null if invalid
 */
export function extractRecurringAnchor(
  recurring: string,
  referenceDate: Date,
): RecurringAnchor | null {
  if (!recurring.startsWith("RRULE:")) {
    return null;
  }

  const freq = extractFreq(recurring);
  if (!freq) {
    return null;
  }

  // Extract time if BYHOUR exists
  const byHour = extractByHour(recurring);
  const time =
    byHour !== undefined
      ? `${byHour.toString().padStart(2, "0")}:00:00`
      : undefined;

  // Calculate dueDate based on frequency
  let dueDate: Date;

  if (freq === "DAILY") {
    // For daily, first occurrence is the reference date
    dueDate = new Date(referenceDate);
  } else if (freq === "WEEKLY") {
    const byDay = extractByDay(recurring);
    if (byDay && byDay.length > 0 && byDay[0]) {
      // Find next occurrence of the target weekday
      dueDate = findNextWeekday(referenceDate, byDay[0]);
    } else {
      // Simple weekly without BYDAY
      dueDate = new Date(referenceDate);
    }
  } else if (freq === "MONTHLY") {
    const byMonthDay = extractByMonthDay(recurring);
    if (byMonthDay && byMonthDay.length > 0 && byMonthDay[0] !== undefined) {
      // Find next occurrence of the target month day
      dueDate = findNextMonthDay(referenceDate, byMonthDay[0]);
    } else {
      // Simple monthly without BYMONTHDAY - use reference date day
      dueDate = new Date(referenceDate);
    }
  } else {
    // For other frequencies (YEARLY, etc.), use reference date as anchor
    dueDate = new Date(referenceDate);
  }

  return { dueDate, time };
}
