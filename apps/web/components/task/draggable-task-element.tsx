"use client"

import { useState, useCallback, useMemo } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { selectedTasksAtom, multiSelectDraggingAtom } from "@tasktrove/atoms/ui/selection"
import { draggingTaskIdsAtom } from "@tasktrove/atoms/ui/drag"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { projectsAtom } from "@tasktrove/atoms/data/base/atoms"
// Relative import ensures cross-app consumers (e.g. mobile tests) resolve correctly
import { DraggableItem } from "@/components/ui/drag-drop/draggable-item"
import type { TaskId } from "@tasktrove/types/id"
import { useResetSortOnDrag } from "@/hooks/use-reset-sort-on-drag"
import { cn } from "@/lib/utils"
import type { GroupId } from "@tasktrove/types/id"

interface DraggableTaskElementProps {
  taskId: TaskId
  children: React.ReactNode
  className?: string
  draggableClassName?: string
  disableSortResetOnDrag?: boolean
  getDragData?: () => Record<string, unknown>
  /**
   * Optional hint for the task's current section.
   * Useful because task.sectionId is no longer stored; membership is tracked via section.items.
   */
  sectionId?: GroupId
}

/**
 * Task-specific draggable wrapper that handles multi-task drag selection.
 * When dragging a selected task, all selected tasks are included in the drag data.
 * When dragging an unselected task, only that task is dragged.
 *
 * This component accesses selection state directly from atoms, requiring no props
 * beyond the task ID and children. It automatically shows a count badge when
 * dragging multiple tasks.
 */
export function DraggableTaskElement({
  taskId,
  children,
  className,
  draggableClassName,
  disableSortResetOnDrag = false,
  getDragData,
  sectionId,
}: DraggableTaskElementProps) {
  const [isDragging, setIsDragging] = useState(false)

  // Access selection state directly from atom - no props needed!
  const selectedTasksValue = useAtomValue(selectedTasksAtom)
  const selectedTasks = useMemo(
    () => (Array.isArray(selectedTasksValue) ? selectedTasksValue : []),
    [selectedTasksValue],
  )
  const isMulti = selectedTasks.length > 0
  const [multiSelectDragging, setMultiSelectDragging] = useAtom(multiSelectDraggingAtom)
  const setDraggingTaskIds = useSetAtom(draggingTaskIdsAtom)
  const activeDraggingTaskIds = useAtomValue(draggingTaskIdsAtom)
  const taskById = useAtomValue(taskAtoms.derived.taskById)
  const projects = useAtomValue(projectsAtom)
  const { applyDefaultSort, restorePreviousSort } = useResetSortOnDrag({
    isEnabled: !disableSortResetOnDrag,
  })

  // Resolve the current section for a task by scanning project sections
  const resolveSectionId = useCallback(
    (id: TaskId): GroupId | undefined => {
      const task = taskById.get(id)
      if (!task) return undefined
      const project = projects.find((proj) => proj.id === task.projectId)
      if (!project) return undefined
      const matchingSection = project.sections.find((section) => section.items.includes(id))
      return matchingSection?.id
    },
    [projects, taskById],
  )

  const sectionIdCache = useCallback(
    (ids: TaskId[]): GroupId[] => {
      const set = new Set<GroupId>()
      for (const id of ids) {
        const sid = resolveSectionId(id)
        if (sid) set.add(sid)
      }
      return Array.from(set)
    },
    [resolveSectionId],
  )

  // Check if this specific task is selected
  const isThisTaskSelected = selectedTasks.includes(taskId)

  // Handle drag start/stop with proper multi-select state management
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    applyDefaultSort()
    const ids = isMulti ? selectedTasks : [taskId]
    setDraggingTaskIds(ids)

    // If dragging a selected task, enable global multi-select dragging state
    if (isMulti) {
      setMultiSelectDragging(true)
    }
  }, [applyDefaultSort, isMulti, selectedTasks, setDraggingTaskIds, setMultiSelectDragging, taskId])

  const handleDrop = useCallback(() => {
    setIsDragging(false)
    restorePreviousSort()
    setDraggingTaskIds([])
    // Always clear multi-select dragging state when drop completes
    if (isMulti) {
      setMultiSelectDragging(false)
    }
  }, [isMulti, restorePreviousSort, setDraggingTaskIds, setMultiSelectDragging])

  // Show drag style if:
  // 1. This task is being directly dragged, OR
  // 2. A multi-select drag is happening AND this task is selected
  const isTrackedDragging = Array.isArray(activeDraggingTaskIds)
    ? activeDraggingTaskIds.includes(taskId)
    : false
  const shouldShowDragStyle =
    isTrackedDragging || isDragging || (multiSelectDragging && isThisTaskSelected)

  return (
    <div
      className={cn(
        "w-full",
        className,
        shouldShowDragStyle && "opacity-30 scale-95 transition-all",
      )}
    >
      <DraggableItem
        id={taskId}
        index={0} // Index managed by parent list
        mode="list"
        getData={() => ({
          ...(getDragData ? getDragData() : {}),
          ids: isMulti ? selectedTasks : [taskId],
          taskId,
          sectionId: sectionId ?? resolveSectionId(taskId),
          sectionIds: sectionId ? [sectionId] : sectionIdCache(isMulti ? selectedTasks : [taskId]),
        })}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        className={cn("relative", draggableClassName)}
        badgeCount={isMulti ? selectedTasks.length : undefined}
      >
        <div className="h-full" data-testid={`draggable-task-${taskId}`}>
          {children}
        </div>
      </DraggableItem>
    </div>
  )
}
