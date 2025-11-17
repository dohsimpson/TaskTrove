"use client"

import { useCallback, useEffect, useRef } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { currentViewStateAtom, setViewOptionsAtom } from "@tasktrove/atoms/ui/views"
import { draggingTaskIdsAtom } from "@tasktrove/atoms/ui/drag"
import { DEFAULT_SORT_BY, DEFAULT_SORT_DIRECTION } from "@tasktrove/constants"
import type { ViewState } from "@tasktrove/types/core"

interface UseResetSortOnDragOptions {
  isEnabled?: boolean
}

interface SortStateSnapshot {
  sortBy: ViewState["sortBy"]
  sortDirection: ViewState["sortDirection"]
}

type DragSortFinalizeSource = "component-drop" | "component-cleanup" | "global-drop"

const dragSortState: {
  activeParticipantCount: number
  previousSort: SortStateSnapshot | null
  detachGlobalListeners: (() => void) | null
} = {
  activeParticipantCount: 0,
  previousSort: null,
  detachGlobalListeners: null,
}

function attachGlobalDragListeners(callback: () => void) {
  if (typeof window === "undefined") return
  if (dragSortState.detachGlobalListeners) return

  const handleGlobalDrop = () => callback()

  window.addEventListener("dragend", handleGlobalDrop)
  window.addEventListener("drop", handleGlobalDrop)

  dragSortState.detachGlobalListeners = () => {
    window.removeEventListener("dragend", handleGlobalDrop)
    window.removeEventListener("drop", handleGlobalDrop)
    dragSortState.detachGlobalListeners = null
  }
}

/**
 * Ensures drag-and-drop interactions can rely on the canonical section order.
 * When enabled, a drag that begins while a secondary sort is applied will
 * temporarily switch the list back to the default ordering. The prior sort
 * configuration is restored once the drag completes.
 */
export function useResetSortOnDrag({ isEnabled = true }: UseResetSortOnDragOptions = {}) {
  const currentViewState = useAtomValue(currentViewStateAtom)
  const currentSortBy = currentViewState?.sortBy
  const currentSortDirection = currentViewState?.sortDirection
  const setViewOptions = useSetAtom(setViewOptionsAtom)
  const setDraggingTaskIds = useSetAtom(draggingTaskIdsAtom)
  const hasJoinedRef = useRef(false)

  const finalizeSortReset = useCallback(
    (source: DragSortFinalizeSource) => {
      if (!dragSortState.previousSort) return

      const snapshot = dragSortState.previousSort
      dragSortState.previousSort = null
      dragSortState.activeParticipantCount = 0

      dragSortState.detachGlobalListeners?.()

      setViewOptions({
        sortBy: snapshot.sortBy,
        sortDirection: snapshot.sortDirection,
      })
      setDraggingTaskIds([])

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console -- Debug logging for drag/sort behavior
        console.debug("[DragSort] Restored previous sort", { source, snapshot })
      }
    },
    [setDraggingTaskIds, setViewOptions],
  )

  const applyDefaultSort = useCallback(() => {
    if (!isEnabled) return
    if (currentSortBy === DEFAULT_SORT_BY) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console -- Debug logging for drag/sort behavior
        console.debug("[DragSort] Sort already default; no reset applied")
      }
      return
    }

    if (!dragSortState.previousSort) {
      dragSortState.previousSort = {
        sortBy: currentSortBy,
        sortDirection: currentSortDirection,
      }

      setViewOptions({
        sortBy: DEFAULT_SORT_BY,
        sortDirection: DEFAULT_SORT_DIRECTION,
      })

      attachGlobalDragListeners(() => finalizeSortReset("global-drop"))

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console -- Debug logging for drag/sort behavior
        console.debug("[DragSort] Applied default sort to enable drag-and-drop", {
          snapshot: dragSortState.previousSort,
        })
      }
    } else if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console -- Debug logging for drag/sort behavior
      console.debug("[DragSort] Joined existing drag sort reset", {
        snapshot: dragSortState.previousSort,
      })
    }

    dragSortState.activeParticipantCount += 1
    hasJoinedRef.current = true
  }, [currentSortBy, currentSortDirection, finalizeSortReset, isEnabled, setViewOptions])

  const restorePreviousSort = useCallback(() => {
    if (!isEnabled) return
    if (!hasJoinedRef.current) return

    hasJoinedRef.current = false

    if (dragSortState.activeParticipantCount > 0) {
      dragSortState.activeParticipantCount -= 1
    }

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console -- Debug logging for drag/sort behavior
      console.debug("[DragSort] Participant completed drag", {
        remainingParticipants: dragSortState.activeParticipantCount,
      })
    }

    if (dragSortState.activeParticipantCount === 0) {
      finalizeSortReset("component-drop")
    }
  }, [finalizeSortReset, isEnabled])

  useEffect(() => {
    return () => {
      if (!hasJoinedRef.current) return

      hasJoinedRef.current = false

      if (dragSortState.activeParticipantCount > 0) {
        dragSortState.activeParticipantCount -= 1
      }

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console -- Debug logging for drag/sort behavior
        console.debug("[DragSort] Participant unmounted during drag", {
          remainingParticipants: dragSortState.activeParticipantCount,
        })
      }

      // Do not finalize here; allow global dragend to handle restoration if needed.
    }
  }, [])

  return {
    applyDefaultSort,
    restorePreviousSort,
  }
}
