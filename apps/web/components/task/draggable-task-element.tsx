"use client"

import { useState, useCallback } from "react"
import { useAtom, useAtomValue } from "jotai"
import { selectedTasksAtom, multiSelectDraggingAtom } from "@tasktrove/atoms/ui/selection"
import { DraggableItem } from "@/components/ui/drag-drop"
import type { TaskId } from "@/lib/types"

interface DraggableTaskElementProps {
  taskId: TaskId
  children: React.ReactNode
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
export function DraggableTaskElement({ taskId, children }: DraggableTaskElementProps) {
  const [isDragging, setIsDragging] = useState(false)

  // Access selection state directly from atom - no props needed!
  const selectedTasks = useAtomValue(selectedTasksAtom)
  const isMulti = selectedTasks.length > 0
  const [multiSelectDragging, setMultiSelectDragging] = useAtom(multiSelectDraggingAtom)

  // Check if this specific task is selected
  const isThisTaskSelected = selectedTasks.includes(taskId)

  // Handle drag start/stop with proper multi-select state management
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    // If dragging a selected task, enable global multi-select dragging state
    if (isMulti) {
      setMultiSelectDragging(true)
    }
  }, [isMulti, setMultiSelectDragging])

  const handleDrop = useCallback(() => {
    setIsDragging(false)
    // Always clear multi-select dragging state when drop completes
    if (isMulti) {
      setMultiSelectDragging(false)
    }
  }, [isMulti, setMultiSelectDragging])

  // Show drag style if:
  // 1. This task is being directly dragged, OR
  // 2. A multi-select drag is happening AND this task is selected
  const shouldShowDragStyle = isDragging || (multiSelectDragging && isThisTaskSelected)

  return (
    <div className={shouldShowDragStyle ? "opacity-30 scale-95 transition-all" : ""}>
      <DraggableItem
        id={taskId}
        index={0} // Index managed by parent list
        mode="list"
        getData={() => ({
          ids: isMulti ? selectedTasks : [taskId],
          taskId,
        })}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        className="relative"
        badgeCount={isMulti ? selectedTasks.length : undefined}
      >
        <div data-testid={`draggable-task-${taskId}`}>{children}</div>
      </DraggableItem>
    </div>
  )
}
