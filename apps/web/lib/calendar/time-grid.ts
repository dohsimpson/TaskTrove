import type { Task } from "@tasktrove/types/core"

export const DEFAULT_TASK_DURATION = 1800 // 30 minutes in seconds
export const HOUR_SLOT_HEIGHT = 60 // px per hour row
export const MINUTES_PER_HOUR = 60
export const MINUTES_PER_SUBSLOT = 15
export const SUBSLOTS_PER_HOUR = MINUTES_PER_HOUR / MINUTES_PER_SUBSLOT
export const PIXELS_PER_MINUTE = HOUR_SLOT_HEIGHT / MINUTES_PER_HOUR
export const MINUTES_PER_DAY = MINUTES_PER_HOUR * 24

export function toMinutesFromMidnight(dueTime: Task["dueTime"] | string | null): number | null {
  if (!dueTime) return null

  if (dueTime instanceof Date) {
    const hours = dueTime.getHours()
    const minutes = dueTime.getMinutes()
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null
  }

  if (typeof dueTime === "string") {
    const parts = dueTime.split(":")
    if (parts.length < 2) return null
    const hours = Number.parseInt(parts[0] ?? "", 10)
    const minutes = Number.parseInt(parts[1] ?? "", 10)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
    return hours * 60 + minutes
  }

  return null
}
