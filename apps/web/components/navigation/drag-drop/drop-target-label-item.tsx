"use client"

import { useAtomValue } from "jotai"
import { DropTargetItem } from "@/components/ui/drag-drop/drop-target-item"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { createTaskId } from "@tasktrove/types/id"
import type { LabelId } from "@tasktrove/types/id"
import type { DropEventData } from "@/hooks/use-sidebar-drag-drop"
import { isValidLabelOperation } from "@/lib/label-drag-drop-logic"

interface DropTargetLabelItemProps {
  labelId: LabelId
  index: number
  children: React.ReactNode
  onDrop: (args: DropEventData) => void
}

/**
 * Sidebar-specific drop target wrapper for labels.
 * Uses tree-item mode (same as projects - golden path pattern).
 * Accepts both sidebar labels (for reordering) AND tasks (for adding label to task).
 *
 * Shows tree indicators for both label reordering and task drops.
 * Hides invalid indicators using validateInstruction (golden path).
 */
export function DropTargetLabelItem({
  labelId,
  index,
  children,
  onDrop,
}: DropTargetLabelItemProps) {
  const taskById = useAtomValue(taskAtoms.derived.taskById)

  return (
    <DropTargetItem
      id={labelId}
      index={index}
      mode="tree-item"
      currentLevel={0}
      indentPerLevel={24}
      getData={() => ({
        type: "sidebar-label-drop-target",
        labelId,
        index,
      })}
      canDrop={(sourceData) => {
        // Only accept sidebar labels (for reordering)
        return sourceData.type === "sidebar-label"
      }}
      validateInstruction={isValidLabelOperation}
      onDrop={onDrop}
    >
      <DropTargetItem
        id={`${labelId}-task-drop`}
        index={index}
        mode="group"
        className="w-full"
        indicatorClassName="w-full flex-none"
        getData={() => ({
          type: "sidebar-label-drop-target",
          labelId,
          index,
        })}
        canDrop={(sourceData) => {
          if (sourceData.type !== "list-item" || !Array.isArray(sourceData.ids)) {
            return false
          }

          const hasMovableTask = sourceData.ids.some((id) => {
            if (typeof id !== "string") {
              return false
            }
            const task = taskById.get(createTaskId(id))
            return !task || !task.labels.includes(labelId)
          })

          return hasMovableTask
        }}
        onDrop={onDrop}
      >
        {children}
      </DropTargetItem>
    </DropTargetItem>
  )
}
