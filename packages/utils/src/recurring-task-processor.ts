/**
 * Recurring Task Processor
 *
 * Uses the rrule.js library for RFC 5545 compliance while keeping TaskTrove's
 * timezone-agnostic date handling. We always anchor calculations to the local
 * due date/time that the app stores rather than trusting DTSTART values inside
 * the RRULE string.
 */

import { RRule, type ByWeekday, type Options } from "rrule";
type RRuleType = InstanceType<typeof RRule>;
import type { Subtask, Task } from "@tasktrove/types/core";
import { createTaskId } from "@tasktrove/types/id";
import { v4 as uuidv4 } from "uuid";
const RRULE_PREFIX = "RRULE:";

/**
 * Parsed RRULE components for consumers that still expect the legacy shape
 */
interface ParsedRRule {
  freq:
    | "DAILY"
    | "WEEKLY"
    | "MONTHLY"
    | "YEARLY"
    | "HOURLY"
    | "MINUTELY"
    | "SECONDLY";
  interval?: number;
  count?: number;
  until?: string;
  byday?: string[];
  bymonthday?: number[];
  bymonth?: number[];
  bysetpos?: number[];
}

const FREQUENCY_MAP: Record<number, ParsedRRule["freq"]> = {
  [RRule.YEARLY]: "YEARLY",
  [RRule.MONTHLY]: "MONTHLY",
  [RRule.WEEKLY]: "WEEKLY",
  [RRule.DAILY]: "DAILY",
  [RRule.HOURLY]: "HOURLY",
  [RRule.MINUTELY]: "MINUTELY",
  [RRule.SECONDLY]: "SECONDLY",
};

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function stripRRulePrefix(rrule: string): string | null {
  if (!rrule || !rrule.startsWith(RRULE_PREFIX)) {
    return null;
  }
  return rrule.substring(RRULE_PREFIX.length);
}

function extractUntilValue(rrule: string): string | null {
  const body = stripRRulePrefix(rrule);
  if (!body) {
    return null;
  }

  const parts = body.split(";");
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "UNTIL" && value) {
      return value;
    }
  }

  return null;
}

function isValidUntilValue(until: string): boolean {
  const match = until.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}`);
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

function parseRRuleOptions(rrule: string): Partial<Options> | null {
  const ruleBody = stripRRulePrefix(rrule);
  if (!ruleBody) {
    return null;
  }

  try {
    return RRule.parseString(ruleBody);
  } catch {
    return null;
  }
}

function frequencyToLabel(freq?: number): ParsedRRule["freq"] | null {
  if (typeof freq !== "number") {
    return null;
  }
  return FREQUENCY_MAP[freq] ?? null;
}

function ensureNumberArray(
  value?: number | number[] | null,
): number[] | undefined {
  if (typeof value === "number") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return undefined;
}

function normalizeWeekdays(
  value?: ByWeekday | ByWeekday[] | null,
): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const items = Array.isArray(value) ? value : [value];
  return items
    .filter((weekday): weekday is ByWeekday => Boolean(weekday))
    .map((weekday) => weekday.toString());
}

function normalizeToLocalDate(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/**
 * For date-only recurrences (no BYHOUR), rrule.js yields UTC-based instants.
 * We want to treat them as floating local dates: Y-M-D from UTC, time = 00:00 local.
 */
function finalizeOccurrenceDate(rrule: string, date: Date): Date {
  const options = parseRRuleOptions(rrule);
  if (!options) {
    return normalizeToLocalDate(date);
  }
  const byhourArray = options.byhour;
  const hasByHour = Array.isArray(byhourArray)
    ? byhourArray.length > 0
    : typeof options.byhour === "number";
  // If there is an explicit hour, preserve local components as-is.
  if (hasByHour) {
    return normalizeToLocalDate(date);
  }
  // Date-only: use UTC Y-M-D, set local midnight
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0,
  );
}

function copyUtcTime(source: Date, target: Date): void {
  target.setUTCHours(
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds(),
  );
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function calculateSimpleMonthlyNextDate(
  fromDate: Date,
  interval: number,
): Date {
  const originalDay = fromDate.getDate();

  const target = new Date(fromDate);
  target.setDate(1);
  target.setMonth(target.getMonth() + interval);

  const targetYear = target.getFullYear();
  const targetMonth = target.getMonth();
  const lastDay = daysInMonth(targetYear, targetMonth);
  target.setDate(Math.min(originalDay, lastDay));
  copyUtcTime(fromDate, target);

  return target;
}

function isSimpleMonthlyRule(parsed?: ParsedRRule | null): boolean {
  if (!parsed) {
    return false;
  }

  const hasByMonthDay = parsed.bymonthday && parsed.bymonthday.length > 0;
  const hasByDay = parsed.byday && parsed.byday.length > 0;
  const hasBySetPos = parsed.bysetpos && parsed.bysetpos.length > 0;

  return (
    parsed.freq === "MONTHLY" && !hasByMonthDay && !hasByDay && !hasBySetPos
  );
}

function findWeekdayDatesInMonth(
  year: number,
  monthIndex: number,
  weekdays: number[],
): Date[] {
  const dates: Date[] = [];
  const totalDays = daysInMonth(year, monthIndex);

  for (let day = 1; day <= totalDays; day++) {
    const candidate = new Date(year, monthIndex, day);
    if (weekdays.includes(candidate.getDay())) {
      dates.push(candidate);
    }
  }

  return dates;
}

function applyBysetpos(dates: Date[], bysetpos: number[]): Date[] {
  const result: Date[] = [];

  for (const pos of bysetpos) {
    if (pos === 0) {
      continue;
    }

    let targetIndex: number;
    if (pos > 0) {
      targetIndex = pos - 1;
    } else {
      targetIndex = dates.length + pos;
    }

    if (targetIndex >= 0 && targetIndex < dates.length) {
      const targetDate = dates[targetIndex];
      if (targetDate) {
        result.push(targetDate);
      }
    }
  }

  return result.sort((a, b) => a.getTime() - b.getTime());
}

function resolveMonthDaysForMonth(
  bymonthday: number[],
  year: number,
  monthIndex: number,
): number[] {
  const lastDay = daysInMonth(year, monthIndex);
  const resolved = bymonthday
    .map((day) => {
      if (day === -1) {
        return lastDay;
      }
      if (day < 0) {
        const candidate = lastDay + day + 1;
        return Math.max(1, candidate);
      }
      return Math.min(day, lastDay);
    })
    .filter((day) => Number.isFinite(day));

  return Array.from(new Set(resolved)).sort((a, b) => a - b);
}

function calculateMonthlyByMonthDayNextDate(
  fromDate: Date,
  parsed: ParsedRRule,
  interval: number,
): Date {
  const bymonthday = parsed.bymonthday || [];
  const currentYear = fromDate.getFullYear();
  const currentMonth = fromDate.getMonth();

  if (interval === 1) {
    const currentMonthDays = resolveMonthDaysForMonth(
      bymonthday,
      currentYear,
      currentMonth,
    );
    const fromDay = fromDate.getDate();
    const nextDayThisMonth = currentMonthDays.find((day) => day > fromDay);
    if (nextDayThisMonth !== undefined) {
      const candidate = new Date(fromDate);
      candidate.setDate(nextDayThisMonth);
      copyUtcTime(fromDate, candidate);
      return candidate;
    }
  }

  const target = new Date(fromDate);
  target.setHours(0, 0, 0, 0);
  target.setDate(1);
  target.setMonth(target.getMonth() + interval);

  // Continue stepping through interval-sized months until we find a match
  for (let safety = 0; safety < 240; safety += 1) {
    const targetYear = target.getFullYear();
    const targetMonth = target.getMonth();
    const resolvedDays = resolveMonthDaysForMonth(
      bymonthday,
      targetYear,
      targetMonth,
    );

    if (resolvedDays.length > 0) {
      const nextDay = resolvedDays[0];
      if (nextDay !== undefined && Number.isFinite(nextDay)) {
        target.setDate(nextDay);
        copyUtcTime(fromDate, target);
        return target;
      }
    }

    target.setMonth(target.getMonth() + interval);
  }

  // Fallback: if no match found (shouldn't happen), return original date
  return new Date(fromDate);
}

function calculateMonthlyByWeekdaySetposNextDate(
  fromDate: Date,
  parsed: ParsedRRule,
  interval: number,
): Date | null {
  const weekdayMap: Record<string, number> = {
    SU: 0,
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
  };

  const targetWeekdays = (parsed.byday || [])
    .map((day) => day.slice(-2))
    .map((code) => weekdayMap[code])
    .filter((day): day is number => typeof day === "number");

  if (targetWeekdays.length === 0) {
    return null;
  }

  const referenceTime = fromDate.getTime();

  if (interval === 1) {
    const currentMonthDates = findWeekdayDatesInMonth(
      fromDate.getFullYear(),
      fromDate.getMonth(),
      targetWeekdays,
    );
    const filteredCurrent = applyBysetpos(
      currentMonthDates,
      parsed.bysetpos || [],
    );
    const nextCurrent = filteredCurrent.find(
      (date) => date.getTime() > referenceTime,
    );
    if (nextCurrent) {
      const result = new Date(nextCurrent);
      copyUtcTime(fromDate, result);
      return result;
    }
  }

  const target = new Date(fromDate);
  target.setHours(0, 0, 0, 0);
  target.setDate(1);
  target.setMonth(target.getMonth() + interval);

  for (let safety = 0; safety < 240; safety += 1) {
    const matchingDates = findWeekdayDatesInMonth(
      target.getFullYear(),
      target.getMonth(),
      targetWeekdays,
    );

    if (matchingDates.length > 0) {
      const filteredDates = applyBysetpos(matchingDates, parsed.bysetpos || []);
      if (filteredDates.length > 0) {
        const targetDate = filteredDates[0];
        if (targetDate) {
          const result = new Date(targetDate);
          copyUtcTime(fromDate, result);
          return result;
        }
      }
    }

    target.setMonth(target.getMonth() + interval);
  }

  return null;
}

function isAfterUntil(date: Date, until?: string): boolean {
  if (!until) {
    return false;
  }

  const match = until.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  const untilDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999),
  );
  return date.getTime() > untilDate.getTime();
}

function buildRRuleInstance(
  rrule: string,
  referenceDate: Date,
): RRuleType | null {
  const options = parseRRuleOptions(rrule);
  if (!options || typeof options.freq !== "number") {
    return null;
  }

  const normalizedReference = normalizeToLocalDate(referenceDate);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dtstart, ...rest } = options;

  let adjustedUntil = rest.until;
  const untilValue = extractUntilValue(rrule);
  if (untilValue && /^\d{8}$/.test(untilValue) && rest.until) {
    const year = Number(untilValue.slice(0, 4));
    const month = Number(untilValue.slice(4, 6)) - 1;
    const day = Number(untilValue.slice(6, 8));
    adjustedUntil = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }

  try {
    return new RRule({
      ...rest,
      ...(adjustedUntil ? { until: adjustedUntil } : {}),
      dtstart: normalizedReference,
    });
  } catch {
    return null;
  }
}

/**
 * Parse RRULE string into components (legacy helper, now powered by rrule.js)
 */
export function parseRRule(rrule: string): ParsedRRule | null {
  const untilValue = extractUntilValue(rrule);
  if (untilValue && !isValidUntilValue(untilValue)) {
    return null;
  }

  const options = parseRRuleOptions(rrule);
  if (!options) {
    return null;
  }

  const freq = frequencyToLabel(options.freq);
  if (!freq) {
    return null;
  }

  const untilString = untilValue
    ? untilValue
    : options.until
      ? formatUtcDate(options.until)
      : undefined;

  const normalizedWeekdays = normalizeWeekdays(options.byweekday);
  if (
    options.byweekday &&
    (!normalizedWeekdays || normalizedWeekdays.length === 0)
  ) {
    return null;
  }

  return {
    freq,
    interval: options.interval,
    count: options.count ?? undefined,
    until: untilString,
    byday: normalizedWeekdays,
    bymonthday: ensureNumberArray(options.bymonthday),
    bymonth: ensureNumberArray(options.bymonth),
    bysetpos: ensureNumberArray(options.bysetpos),
  };
}

/**
 * Check if a date matches a recurring pattern using rrule.js
 */
export function dateMatchesRecurringPattern(
  date: Date,
  rrule: string,
  referenceDate: Date,
): boolean {
  const lines = rrule
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const evaluate = (single: string): boolean => {
    const parsed = parseRRule(single);
    const rule = buildRRuleInstance(single, referenceDate);
    if (!rule || !parsed) return false;

    const isSubDaily =
      parsed.freq === "HOURLY" ||
      parsed.freq === "MINUTELY" ||
      parsed.freq === "SECONDLY";

    if (isSubDaily) {
      const occurrence = rule.after(date, true);
      return !!occurrence && occurrence.getTime() === date.getTime();
    }

    const utcStart = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const occurrence = rule.after(utcStart, true);
    if (!occurrence) return false;
    return (
      occurrence.getUTCFullYear() === date.getUTCFullYear() &&
      occurrence.getUTCMonth() === date.getUTCMonth() &&
      occurrence.getUTCDate() === date.getUTCDate()
    );
  };

  if (lines.length <= 1) {
    return evaluate(rrule);
  }
  for (const single of lines) {
    if (evaluate(single)) return true;
  }
  return false;
}

/**
 * Calculate the reference date for recurring task calculations based on recurringMode
 * - For "completedAt" mode: uses the later of actionDate and dueDate to prevent backwards scheduling
 * - For "dueDate" mode: always uses the dueDate
 */
export function getRecurringReferenceDate(
  dueDate: Date,
  recurringMode: "dueDate" | "completedAt" | "autoRollover" | undefined,
  actionDate?: Date,
): Date {
  if (recurringMode === "completedAt" && actionDate) {
    return new Date(Math.max(actionDate.getTime(), dueDate.getTime()));
  }
  return new Date(dueDate);
}

function calculateNextDueDateSingle(
  rrule: string,
  fromDate: Date,
  includeFromDate: boolean = false,
): Date | null {
  const parsed = parseRRule(rrule);
  if (!parsed) {
    return null;
  }
  const reference = normalizeToLocalDate(fromDate);

  if (!includeFromDate && parsed.freq === "MONTHLY") {
    if (
      parsed.byday &&
      parsed.byday.length > 0 &&
      parsed.bysetpos &&
      parsed.bysetpos.length > 0
    ) {
      const result = calculateMonthlyByWeekdaySetposNextDate(
        reference,
        parsed,
        parsed.interval || 1,
      );
      if (result) {
        return isAfterUntil(result, parsed.until) ? null : result;
      }
      return null;
    }

    if (parsed.bymonthday && parsed.bymonthday.length > 0) {
      const result = calculateMonthlyByMonthDayNextDate(
        reference,
        parsed,
        parsed.interval || 1,
      );
      return isAfterUntil(result, parsed.until) ? null : result;
    }
  }

  if (isSimpleMonthlyRule(parsed) && !includeFromDate) {
    const result = calculateSimpleMonthlyNextDate(
      reference,
      parsed.interval || 1,
    );
    if (isAfterUntil(result, parsed.until)) return null;
    return normalizeToLocalDate(result);
  }

  const rule = buildRRuleInstance(rrule, fromDate);
  if (!rule) {
    return null;
  }

  if (includeFromDate) {
    const inclusiveMatch = rule.after(reference, true);
    if (inclusiveMatch && inclusiveMatch.getTime() === reference.getTime()) {
      return normalizeToLocalDate(reference);
    }
  }

  const nextOccurrence = rule.after(reference, includeFromDate);
  return nextOccurrence ? normalizeToLocalDate(nextOccurrence) : null;
}

export function calculateNextDueDate(
  rrule: string,
  fromDate: Date,
  includeFromDate: boolean = false,
): Date | null {
  const lines = rrule
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length <= 1) {
    return calculateNextDueDateSingle(rrule, fromDate, includeFromDate);
  }
  let best: { date: Date; rule: string } | null = null;
  for (const single of lines) {
    const next = calculateNextDueDateSingle(single, fromDate, includeFromDate);
    if (!next) continue;
    if (!best || next.getTime() < best.date.getTime()) {
      best = { date: next, rule: single };
    }
  }
  return best ? finalizeOccurrenceDate(best.rule, best.date) : null;
}

/**
 * Generate next task instance from a completed recurring task
 */
export function generateNextTaskInstance(completedTask: Task): Task | null {
  if (!completedTask.recurring || !completedTask.dueDate) {
    return null;
  }

  const parsed = parseRRule(completedTask.recurring);
  if (!parsed) {
    return null;
  }

  // Handle COUNT limitation
  let nextRecurringPattern = completedTask.recurring;
  if (parsed.count !== undefined) {
    if (parsed.count <= 1) {
      return null;
    }

    const newCount = parsed.count - 1;
    nextRecurringPattern = completedTask.recurring.replace(
      /COUNT=\d+/,
      `COUNT=${newCount}`,
    );
  }

  // Determine the reference date for calculating next occurrence
  const referenceDate = getRecurringReferenceDate(
    completedTask.dueDate,
    completedTask.recurringMode,
    completedTask.completedAt,
  );

  const nextDueDate = calculateNextDueDate(
    completedTask.recurring,
    referenceDate,
  );

  if (!nextDueDate) {
    return null;
  }

  const resetSubtasks: Subtask[] = completedTask.subtasks.map((subtask) => ({
    ...subtask,
    completed: false,
  }));

  const nextTask: Task = {
    ...completedTask,
    id: createTaskId(uuidv4()),
    completed: false,
    completedAt: undefined,
    dueDate: nextDueDate,
    createdAt: new Date(),
    recurring: nextRecurringPattern,
    subtasks: resetSubtasks,
  };

  return nextTask;
}

/**
 * Check if a task should generate a next instance when completed
 */
export function shouldGenerateNextInstance(task: Task): boolean {
  return !!(task.recurring && task.dueDate);
}

/**
 * Main processor function to handle recurring task completion
 */
export function processRecurringTaskCompletion(task: Task): Task | null {
  if (!shouldGenerateNextInstance(task)) {
    return null;
  }

  return generateNextTaskInstance(task);
}
