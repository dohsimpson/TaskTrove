"use client";

import type { Getter, Setter, WritableAtom } from "jotai";
import type { ScheduledNotificationSet } from "@tasktrove/types/utils";
import { safeSetTimeout } from "@tasktrove/utils";
import { log } from "@tasktrove/atoms/utils/atom-helpers";

type TimerAtom = WritableAtom<
  ReturnType<typeof setTimeout> | null,
  [ReturnType<typeof setTimeout> | null],
  void
>;
type BoolAtom = WritableAtom<boolean, [boolean], void>;
type FireAtom = WritableAtom<null, [ScheduledNotificationSet], void>;

export type NotificationSchedulerAtoms = {
  activeTimerAtom: TimerAtom;
  isSystemActiveAtom: BoolAtom;
  fireNotificationsAtom: FireAtom;
};

export const cancelNotificationTimer = (
  get: Getter,
  set: Setter,
  atoms: NotificationSchedulerAtoms,
) => {
  const timer = get(atoms.activeTimerAtom);
  if (timer) {
    clearTimeout(timer);
    set(atoms.activeTimerAtom, null);
  }
};

export const scheduleNotificationTimer = (
  set: Setter,
  nextNotifications: ScheduledNotificationSet,
  atoms: NotificationSchedulerAtoms,
) => {
  if (nextNotifications.size === 0) {
    set(atoms.isSystemActiveAtom, false);
    return;
  }

  const now = new Date();
  const firstNotification = nextNotifications.values().next().value;
  if (!firstNotification) {
    return;
  }
  const timeUntil = firstNotification.notifyAt.getTime() - now.getTime();

  if (timeUntil <= 0) {
    set(atoms.fireNotificationsAtom, nextNotifications);
  } else {
    try {
      const timerId = safeSetTimeout(() => {
        set(atoms.fireNotificationsAtom, nextNotifications);
      }, timeUntil);

      set(atoms.activeTimerAtom, timerId);
      set(atoms.isSystemActiveAtom, true);

      log.info(
        {
          count: nextNotifications.size,
          timeUntil,
          notifyAt: firstNotification.notifyAt.toISOString(),
          module: "notifications",
        },
        "Scheduled notification timer for multiple tasks",
      );
    } catch (error) {
      log.warn(
        {
          count: nextNotifications.size,
          timeUntil,
          notifyAt: firstNotification.notifyAt.toISOString(),
          error: error instanceof Error ? error.message : String(error),
          module: "notifications",
        },
        "Cannot schedule notification timer: this might be caused by delay exceeds maximum safe timeout value. Skipping scheduling.",
      );
    }
  }
};
