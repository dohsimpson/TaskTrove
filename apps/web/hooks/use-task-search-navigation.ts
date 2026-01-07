"use client"

import { useCallback } from "react"
import { useSetAtom } from "jotai"
import { focusTaskActionAtom } from "@tasktrove/atoms/ui/task-focus"
import { setSelectedTaskIdAtom } from "@tasktrove/atoms/ui/selection"
import { showTaskPanelAtom } from "@tasktrove/atoms/ui/dialogs"
import type { Task } from "@tasktrove/types/core"

/**
 * Thin wrapper for search results to request task focus using the shared utility.
 */
export function useTaskSearchNavigation() {
  const focusTask = useSetAtom(focusTaskActionAtom)
  const setSelectedTaskId = useSetAtom(setSelectedTaskIdAtom)
  const setShowTaskPanel = useSetAtom(showTaskPanelAtom)

  const focusTaskFromSearch = useCallback(
    (task: Task) => {
      // Ensure the panel stays open even if the same task was already selected
      setSelectedTaskId(task.id)
      setShowTaskPanel(true)
      focusTask(task.id)
    },
    [focusTask, setSelectedTaskId, setShowTaskPanel],
  )

  return { focusTaskFromSearch }
}
