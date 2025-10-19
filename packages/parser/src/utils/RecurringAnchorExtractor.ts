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
  } else {
    // For other frequencies, use reference date as anchor
    dueDate = new Date(referenceDate);
  }

  return { dueDate, time };
}
