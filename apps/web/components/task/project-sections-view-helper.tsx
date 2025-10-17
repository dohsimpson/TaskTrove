"use client"

import { useEffect, useRef } from "react"
import { autoScrollWhileDragging } from "auto-scroll-while-dragging"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { DropTargetItem } from "@/components/ui/drag-drop"

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
    <div ref={autoScrollRef} data-testid={testId}>
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
      >
        {children}
      </DropTargetItem>
    </div>
  )
}
