"use client"

import { useEffect, useRef, useState } from "react"
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview"
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
  badgeCount?: number // Show count badge on drag preview (only if > 1)
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
  badgeCount,
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
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            const clone = element.cloneNode(true)
            if (!(clone instanceof HTMLElement)) return

            clone.style.transform = "rotate(2deg)"
            clone.style.position = "relative"

            // Add count badge if dragging multiple items
            if (badgeCount && badgeCount > 1) {
              const badge = document.createElement("div")
              badge.textContent = String(badgeCount)
              badge.className =
                "absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full min-w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-20 pointer-events-none"
              clone.appendChild(badge)
            }

            container.appendChild(clone)
          },
        })
      },
      onDragStart: () => {
        setIsDragging(true)
        onDragStart?.()
      },
      onDrop: () => {
        setIsDragging(false)
        onDrop?.()
      },
    })
  }, [id, index, mode, getData, onDragStart, onDrop, badgeCount])

  return (
    <div ref={ref} className={cn(className, isDragging && dragClassName)}>
      {children}
    </div>
  )
}
