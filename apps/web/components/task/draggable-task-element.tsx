"use client"

import { useEffect, useRef, useState } from "react"
import { useAtom, useAtomValue } from "jotai"
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { selectedTasksAtom, multiSelectDraggingAtom } from "@tasktrove/atoms"
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
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Access selection state directly from atom - no props needed!
  const selectedTasks = useAtomValue(selectedTasksAtom)
  const isMulti = selectedTasks.length > 0
  const [multiSelectDragging, setMultiSelectDragging] = useAtom(multiSelectDraggingAtom)

  // Sync multiSelectDragging with isDragging when isMulti
  useEffect(() => {
    if (isMulti) {
      setMultiSelectDragging(isDragging)
    }
  }, [isMulti, isDragging, setMultiSelectDragging])

  useEffect(() => {
    if (!ref.current) return

    return draggable({
      element: ref.current,
      getInitialData: () => ({
        ids: isMulti ? selectedTasks : [taskId],
      }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [taskId, selectedTasks, isMulti])

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging || multiSelectDragging ? 0.5 : 1 }}
      data-testid={`draggable-task-${taskId}`}
    >
      {children}
      {isDragging && isMulti && (
        <div
          className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs font-medium shadow-lg z-10"
          style={{ pointerEvents: "none" }}
        >
          {selectedTasks.length}
        </div>
      )}
    </div>
  )
}
