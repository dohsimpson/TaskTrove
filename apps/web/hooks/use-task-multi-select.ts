import { useCallback } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  lastSelectedTaskAtom,
  selectRangeAtom,
  selectedTaskIdAtom,
  toggleTaskSelectionAtom,
} from "@tasktrove/atoms/ui/selection"
import type { TaskId } from "@tasktrove/types/id"

export interface MultiSelectClickEvent {
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
}

interface MultiSelectClickPayload {
  taskId: TaskId
  sortedTaskIds?: TaskId[]
  // Optional resolver for range selection (e.g., time-grid uses due date/time range filtering).
  getRangeTaskIds?: (startTaskId: TaskId, endTaskId: TaskId) => TaskId[] | null
  event: MultiSelectClickEvent
}

export function useTaskMultiSelectClick() {
  const lastSelectedTask = useAtomValue(lastSelectedTaskAtom)
  const selectedTaskId = useAtomValue(selectedTaskIdAtom)
  const toggleTaskSelection = useSetAtom(toggleTaskSelectionAtom)
  const selectRange = useSetAtom(selectRangeAtom)

  return useCallback(
    ({ taskId, sortedTaskIds, getRangeTaskIds, event }: MultiSelectClickPayload) => {
      const isCmdOrCtrl = event.metaKey || event.ctrlKey
      const isShift = event.shiftKey
      const rangeAnchor = lastSelectedTask ?? selectedTaskId

      if (isCmdOrCtrl) {
        toggleTaskSelection(taskId)
        return true
      }

      if (isShift && !sortedTaskIds && !getRangeTaskIds) {
        toggleTaskSelection(taskId)
        return true
      }

      if (isShift && sortedTaskIds && rangeAnchor && !sortedTaskIds.includes(rangeAnchor)) {
        toggleTaskSelection(taskId)
        return true
      }

      if (isShift && rangeAnchor && (sortedTaskIds || getRangeTaskIds)) {
        const rangeTaskIds = getRangeTaskIds?.(rangeAnchor, taskId) ?? null
        selectRange({
          startTaskId: rangeAnchor,
          endTaskId: taskId,
          sortedTaskIds,
          rangeTaskIds: rangeTaskIds ?? undefined,
        })
        return true
      }

      if (isShift && !rangeAnchor) {
        toggleTaskSelection(taskId)
        return true
      }

      return false
    },
    [lastSelectedTask, selectRange, selectedTaskId, toggleTaskSelection],
  )
}
