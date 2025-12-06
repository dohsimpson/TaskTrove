"use client"

import { DropTargetItem } from "@/components/ui/drag-drop/drop-target-item"
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
        // Accept sidebar labels (for reordering)
        if (sourceData.type === "sidebar-label") {
          return true
        }
        // Accept tasks (for adding label to task) - golden path pattern
        if (sourceData.type === "list-item" && sourceData.ids) {
          return true
        }
        return false
      }}
      validateInstruction={isValidLabelOperation}
      onDrop={onDrop}
    >
      {children}
    </DropTargetItem>
  )
}
