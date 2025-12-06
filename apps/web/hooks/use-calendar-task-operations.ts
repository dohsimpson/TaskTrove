"use client"

import { useCallback } from "react"
import { useAddTaskToSection } from "@/hooks/use-add-task-to-section"
import { useSetAtom } from "jotai"
import { updateQuickAddTaskAtom } from "@tasktrove/atoms/ui/dialogs"
import type { Task, Project } from "@tasktrove/types/core"
import type { ProjectId } from "@tasktrove/types/id"
import type { CalendarTaskOperationsHookResult as CalendarTaskOperationsHookResultType } from "@/lib/calendar/types"

// Re-export with proper naming
export type CalendarTaskOperationsHookResult = CalendarTaskOperationsHookResultType

// Constants
const DEFAULT_TASK_DURATION = 1800 // 30 minutes in seconds

export function useCalendarTaskOperations(project?: Project): CalendarTaskOperationsHookResult {
  const addTaskToSection = useAddTaskToSection()
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)

  const createTaskAtDateTime = useCallback(
    (date: Date, hour?: number) => {
      // Use the project's default section (first section) or undefined
      const defaultSectionId = project?.sections[0]?.id

      // Open quick add with project/section prefilled
      addTaskToSection(project?.id, defaultSectionId)

      // Create the date/time for the selected slot
      const taskDate =
        hour !== undefined
          ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0)
          : date

      // Immediately update with the selected date and time
      updateQuickAddTask({
        updateRequest: {
          dueDate: taskDate,
          dueTime: hour !== undefined ? taskDate : null, // Date object with time or null for all-day
          estimation: DEFAULT_TASK_DURATION,
        },
      })
    },
    [project, addTaskToSection, updateQuickAddTask],
  )

  const createAllDayTask = useCallback(
    (date: Date) => {
      createTaskAtDateTime(date, undefined)
    },
    [createTaskAtDateTime],
  )

  return {
    createTaskAtDateTime,
    createAllDayTask,
  }
}
