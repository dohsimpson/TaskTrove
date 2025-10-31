"use client"

import { useCallback } from "react"
import { useSetAtom } from "jotai"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { log } from "@/lib/utils/logger"
import { format } from "date-fns"
import type {
  CalendarDropEventData,
  CalendarDragData,
  CalendarDropParams,
  CalendarDragDropHookResult as CalendarDragDropHookResultType,
} from "@/lib/calendar/types"
import { isCalendarDragData, isValidTaskId } from "@/lib/calendar/types"

// Re-export with proper naming
export type CalendarDropHookResult = CalendarDragDropHookResultType

export function useCalendarDragDrop(): CalendarDropHookResult {
  const updateTask = useSetAtom(taskAtoms.actions.updateTask)

  const handleTimeSlotDrop = useCallback(
    async (params: CalendarDropParams) => {
      const { source, location, targetDate, targetTime } = params
      try {
        const sourceData = source.data

        // Use type guard to validate drag data
        if (!isCalendarDragData(sourceData)) {
          log.warn({ sourceType: "unknown" }, "Invalid source type for calendar time slot drop")
          return
        }

        // Extract task ID with proper typing
        const taskId = sourceData.taskId

        if (!isValidTaskId(taskId)) {
          log.warn({ taskId }, "Invalid task ID in calendar time slot drop")
          return
        }

        // Handle all-day vs specific time
        let logMessage = "Task date and time updated via time slot drop"
        let logData: { taskId: string; targetDate: string; targetTime?: number; dueTime?: Date } = {
          taskId,
          targetDate: format(targetDate, "yyyy-MM-dd"),
          targetTime,
        }

        const updateData: any = {
          id: taskId,
          dueDate: targetDate,
        }

        if (targetTime !== undefined && targetTime >= 0) {
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
          logData.dueTime = dueTime
          logMessage = "Task date and time updated via time slot drop"
        }

        log.info(logData, logMessage)

        // Update the task
        updateTask({ updateRequest: updateData })
      } catch (error) {
        log.error(
          { error, targetDate: format(targetDate, "yyyy-MM-dd"), targetTime },
          "Error in calendar time slot drop",
        )
      }
    },
    [updateTask],
  )

  const handleAllDayDrop = useCallback(
    async (params: Omit<CalendarDropParams, "targetTime">) => {
      // Handle all-day drops by calling time slot drop with special time value
      handleTimeSlotDrop({
        ...params,
        targetTime: -1, // Special value for all-day
      })
    },
    [handleTimeSlotDrop],
  )

  return {
    handleTimeSlotDrop,
    handleAllDayDrop,
  }
}
