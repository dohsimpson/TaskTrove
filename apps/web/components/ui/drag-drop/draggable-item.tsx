"use client"

import { useEffect, useRef, useState } from "react"
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { cn } from "@/lib/utils"

export type DraggableMode = "list" | "tree"

interface DraggableItemProps {
  id: string
  index: number
  mode?: DraggableMode
  children: React.ReactNode
  className?: string
  dragClassName?: string
  getData?: () => Record<string, unknown>
  onDragStart?: () => void
  onDrop?: () => void
}

/**
 * Generic draggable item component that works with both list and tree modes.
 * Wraps Atlaskit's draggable with consistent behavior.
 *
 * @example
 * ```tsx
 * <DraggableItem id="task-1" index={0} mode="list">
 *   <TaskItem />
 * </DraggableItem>
 * ```
 */
export function DraggableItem({
  id,
  index,
  mode = "list",
  children,
  className,
  dragClassName = "opacity-50",
  getData,
  onDragStart,
  onDrop,
}: DraggableItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return draggable({
      element,
      getInitialData: () => ({
        type: mode === "tree" ? "tree-item" : "list-item",
        id,
        ids: [id], // Support multi-item drag (can be overridden by getData)
        index,
        rect: element.getBoundingClientRect(),
        ...getData?.(),
      }),
      onDragStart: () => {
        setIsDragging(true)
        onDragStart?.()
      },
      onDrop: () => {
        setIsDragging(false)
        onDrop?.()
      },
    })
  }, [id, index, mode, getData, onDragStart, onDrop])

  return (
    <div ref={ref} className={cn(className, isDragging && dragClassName)}>
      {children}
    </div>
  )
}
