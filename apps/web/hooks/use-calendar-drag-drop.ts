"use client"

import { useCallback } from "react"
import { useSetAtom } from "jotai"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { log } from "@/lib/utils/logger"
import { format } from "date-fns"
import type {
  CalendarDropParams,
  CalendarDragDropHookResult as CalendarDragDropHookResultType,
} from "@/lib/calendar/types"
import { extractTaskIdsFromDragData } from "@/lib/calendar/types"
import type { UpdateTaskRequest } from "@tasktrove/types/api-requests"

// Re-export with proper naming
export type CalendarDropHookResult = CalendarDragDropHookResultType

export function useCalendarDragDrop(): CalendarDropHookResult {
  const updateTask = useSetAtom(taskAtoms.actions.updateTask)

  const handleTimeSlotDrop = useCallback(
    async (params: CalendarDropParams) => {
      const { source, targetDate, targetTime } = params
      try {
        const sourceData = source.data

        const taskIds = extractTaskIdsFromDragData(sourceData)
        if (taskIds.length === 0) {
          log.warn({ sourceType: "unknown" }, "Invalid source type for calendar time slot drop")
          return
        }

        // Handle all-day vs specific time
        const logData: {
          taskIds: string[]
          targetDate: string
          targetTime?: number
          dueTime?: Date
        } = {
          taskIds,
          targetDate: format(targetDate, "yyyy-MM-dd"),
          targetTime,
        }

        const updateData: Omit<UpdateTaskRequest, "id"> = {
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
        }

        log.info(logData, "Task date and time updated via time slot drop")

        // Update the task
        taskIds.forEach((id) => {
          updateTask({ updateRequest: { ...updateData, id } })
        })
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
