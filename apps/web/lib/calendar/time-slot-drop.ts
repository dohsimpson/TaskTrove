import { format } from "date-fns"
import type { Task } from "@tasktrove/types/core"
import type { UpdateTaskRequest } from "@tasktrove/types/api-requests"
import { extractTaskIdsFromDragData } from "@/lib/calendar/types"
import { toMinutesFromMidnight } from "@/lib/calendar/time-grid"

type Logger = {
  info: (data: Record<string, unknown>, message: string) => void
  warn: (data: Record<string, unknown>, message: string) => void
  error: (data: Record<string, unknown>, message: string) => void
}

type TimeSlotDropParams = {
  source: { data: Record<string, unknown> }
  targetDate: Date
  targetTime: number
  taskById: Map<string, Task>
  updateTasks: (updateRequests: UpdateTaskRequest[]) => void | Promise<void>
  log: Logger
  onAdditionalDrop?: (params: {
    source: { data: Record<string, unknown> }
    location: { current: { dropTargets: { data: Record<string, unknown> }[] } }
    targetDate: Date
    targetTime: number
  }) => void
}

export function handleTaskTimeSlotDrop({
  source,
  targetDate,
  targetTime,
  taskById,
  updateTasks,
  log,
  onAdditionalDrop,
}: TimeSlotDropParams) {
  const sourceData = source.data
  const taskIds = extractTaskIdsFromDragData(sourceData)

  if (taskIds.length === 0) {
    if (onAdditionalDrop) {
      onAdditionalDrop({
        source,
        location: { current: { dropTargets: [] } },
        targetDate,
        targetTime,
      })
      return
    }
    log.warn({ sourceType: "unknown" }, "Invalid source type for time slot drop")
    return
  }

  // Handle all-day vs specific time
  let logMessage = "Task date updated via time slot drop"
  let finalLogData: {
    taskIds: string[]
    targetDate: string
    isAllDay?: boolean
    dueTime?: Date
  }

  const updateData: Omit<UpdateTaskRequest, "id"> = {
    dueDate: targetDate,
  }

  const fromTimeSlotValue = sourceData.fromTimeSlot
  let fromTimeSlotDate: string | undefined
  let fromTimeSlotTime: number | undefined

  if (fromTimeSlotValue && typeof fromTimeSlotValue === "object") {
    if ("date" in fromTimeSlotValue && typeof fromTimeSlotValue.date === "string") {
      fromTimeSlotDate = fromTimeSlotValue.date
    }
    if ("time" in fromTimeSlotValue && typeof fromTimeSlotValue.time === "number") {
      fromTimeSlotTime = fromTimeSlotValue.time
    }
  }

  if (targetTime === -1) {
    // All-day task - clear dueTime by setting to null
    updateData.dueTime = null
    logMessage = "Task scheduled as all-day via time slot drop"
    finalLogData = {
      taskIds,
      targetDate: format(targetDate, "yyyy-MM-dd"),
      isAllDay: true,
    }
  } else {
    // Specific time task - set dueTime
    const hours = Math.floor(targetTime / 60)
    const minutes = targetTime % 60
    const dueTime = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      hours,
      minutes,
    )
    updateData.dueTime = dueTime
    finalLogData = {
      taskIds,
      targetDate: format(targetDate, "yyyy-MM-dd"),
      dueTime,
    }
    logMessage = "Task date and time updated via time slot drop"
  }

  const canShiftTime =
    targetTime >= 0 && typeof fromTimeSlotDate === "string" && typeof fromTimeSlotTime === "number"

  const targetDateTime =
    targetTime >= 0
      ? new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          Math.floor(targetTime / 60),
          targetTime % 60,
        )
      : null

  const sourceDateTime = canShiftTime
    ? (() => {
        if (typeof fromTimeSlotDate !== "string" || typeof fromTimeSlotTime !== "number") {
          return null
        }
        const parts = fromTimeSlotDate.split("-").map(Number)
        if (parts.length < 3) return null
        const year = parts[0] ?? NaN
        const month = parts[1] ?? NaN
        const day = parts[2] ?? NaN
        if (![year, month, day].every((value) => Number.isFinite(value))) return null
        return new Date(
          year,
          month - 1,
          day,
          Math.floor(fromTimeSlotTime / 60),
          fromTimeSlotTime % 60,
        )
      })()
    : null

  const shiftDeltaMs =
    targetDateTime && sourceDateTime ? targetDateTime.getTime() - sourceDateTime.getTime() : 0

  const updates: UpdateTaskRequest[] = []

  taskIds.forEach((id) => {
    const task = taskById.get(id)
    if (canShiftTime && sourceDateTime && targetDateTime && task?.dueDate) {
      const baseMinutes = toMinutesFromMidnight(task.dueTime) ?? 0
      const baseDateTime = new Date(
        task.dueDate.getFullYear(),
        task.dueDate.getMonth(),
        task.dueDate.getDate(),
        Math.floor(baseMinutes / 60),
        baseMinutes % 60,
      )
      const shiftedDateTime = new Date(baseDateTime.getTime() + shiftDeltaMs)
      const shiftedDate = new Date(
        shiftedDateTime.getFullYear(),
        shiftedDateTime.getMonth(),
        shiftedDateTime.getDate(),
      )
      const shiftedDueTime = new Date(
        shiftedDateTime.getFullYear(),
        shiftedDateTime.getMonth(),
        shiftedDateTime.getDate(),
        shiftedDateTime.getHours(),
        shiftedDateTime.getMinutes(),
      )

      updates.push({
        id,
        dueDate: shiftedDate,
        dueTime: shiftedDueTime,
      })
      return
    }

    updates.push({
      ...updateData,
      id,
    })
  })

  if (updates.length > 0) {
    updateTasks(updates)
  }

  log.info(finalLogData, logMessage)
}
