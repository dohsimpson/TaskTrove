"use client"

import { useEffect, useRef } from "react"
import { autoScrollWhileDragging } from "auto-scroll-while-dragging"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
// Use relative path so helpers work when imported from other apps (e.g. mobile tests)
import { DraggableItem } from "@/components/ui/drag-drop/draggable-item"
import { DropTargetItem } from "@/components/ui/drag-drop/drop-target-item"

interface DropTargetElementProps {
  type: "list-item" | "group"
  indicator: {
    lineGap?: string // gap between items
  }
  testId?: string
  onDrop?: (args: ElementDropTargetEventBasePayload) => void
}

/**
 * Wrapper around DropTargetItem that adds auto-scrolling support.
 * This is needed for virtualized lists where the standard Atlaskit auto-scroll doesn't work.
 */
export function DropTargetElement({
  id,
  children,
  options,
  onDrop: onDropCallback,
}: {
  id: string
  children: React.ReactNode
  options: DropTargetElementProps
  onDrop?: (args: ElementDropTargetEventBasePayload) => void
}) {
  const { type, indicator, testId } = options
  const autoScrollRef = useRef<HTMLDivElement>(null)

  // Set up auto-scrolling for virtualized lists
  useEffect(() => {
    const element = autoScrollRef.current
    if (!element) return
    return autoScrollWhileDragging({ rootEl: element, gap: 120 })
  }, [])

  // Check if this is the innermost drop target
  const handleDrop = (args: ElementDropTargetEventBasePayload) => {
    const dropTargets = args.location.current.dropTargets
    if (dropTargets.length === 0) return

    const innerMost = dropTargets[0]
    if (innerMost?.element === args.self.element) {
      onDropCallback?.(args)
    }
  }

  return (
    <div ref={autoScrollRef} data-testid={testId} className="flex flex-1 min-h-0">
      <DropTargetItem
        id={id}
        mode={type}
        lineGap={indicator.lineGap}
        onDrop={handleDrop}
        canDrop={(sourceData) => {
          // Prevent dropping item onto itself
          const sourceIds = Array.isArray(sourceData.ids) ? sourceData.ids : []
          return !sourceIds.includes(id)
        }}
        className="flex flex-1 min-h-0"
      >
        {children}
      </DropTargetItem>
    </div>
  )
}

/**
 * Simple draggable element wrapper.
 * Use DraggableTaskElement for task-specific features like multi-select.
 */
export function DraggableElement({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <DraggableItem id={id} index={0} mode="list" getData={() => ({ ids: [id] })}>
      <div data-testid={`draggable-${id}`}>{children}</div>
    </DraggableItem>
  )
}
