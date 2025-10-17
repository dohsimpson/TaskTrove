"use client"

import { DraggableItem } from "@/components/ui/drag-drop"
import type { LabelId } from "@/lib/types"

interface DraggableLabelItemProps {
  labelId: LabelId
  index: number
  name: string
  color: string
  children: React.ReactNode
}

/**
 * Sidebar-specific draggable wrapper for labels.
 * Uses list mode for flat label list drag-and-drop.
 */
export function DraggableLabelItem({
  labelId,
  index,
  name,
  color,
  children,
}: DraggableLabelItemProps) {
  return (
    <DraggableItem
      id={labelId}
      index={index}
      mode="list"
      getData={() => ({
        type: "sidebar-label",
        labelId,
        index,
        name,
        color,
      })}
    >
      {children}
    </DraggableItem>
  )
}
