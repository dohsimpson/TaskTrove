/**
 * Notification scheduling helpers shared by web and mobile.
 */

import type { Task } from "@tasktrove/types/core";

/** Default notify time (24h) for all-day tasks */
export const DEFAULT_ALL_DAY_HOUR = 9;
export const DEFAULT_ALL_DAY_MINUTE = 0;

/**
 * Compute the Date when a notification should fire for a task.
 * - If no `dueDate`, returns null (nothing to schedule).
 * - If `dueTime` present, combines date+time.
 * - If only `dueDate`, uses a default time (9:00 AM local).
 */
export function getTaskNotifyAt(
  task: Pick<Task, "dueDate" | "dueTime">,
  opts?: { defaultHour?: number; defaultMinute?: number },
): Date | null {
  if (!task.dueDate) return null;

  const defaultHour = opts?.defaultHour ?? DEFAULT_ALL_DAY_HOUR;
  const defaultMinute = opts?.defaultMinute ?? DEFAULT_ALL_DAY_MINUTE;

  const notifyAt = new Date(task.dueDate);

  if (task.dueTime) {
    const dueTime =
      task.dueTime instanceof Date
        ? new Date(task.dueTime)
        : new Date(task.dueTime);
    notifyAt.setHours(dueTime.getHours(), dueTime.getMinutes(), 0, 0);
  } else {
    // All-day task, use default time
    notifyAt.setHours(defaultHour, defaultMinute, 0, 0);
  }

  return notifyAt;
}
