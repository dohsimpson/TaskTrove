"use client"

import { useEffect, useRef } from "react"
import { autoScrollWhileDragging } from "auto-scroll-while-dragging"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
// Use relative path so helpers work when imported from other apps (e.g. mobile tests)
import { DraggableItem } from "@/components/ui/drag-drop/draggable-item"
import { DropTargetItem } from "@/components/ui/drag-drop/drop-target-item"

type ListDropTargetOptions = {
  type: "list-item"
  indicator: {
    lineGap?: string
  }
  testId?: string
}

type GroupDropTargetOptions = {
  type: "group"
  indicator: {
    lineGap?: string
  }
  /**
   * Section/group identifier this drop zone represents.
   * Required so we can reliably block same-section drops.
   */
  groupSectionId: string
  testId?: string
}

type DropTargetElementProps = ListDropTargetOptions | GroupDropTargetOptions

const getSourceIds = (sourceData: Record<string, unknown>): string[] => {
  return Array.isArray(sourceData.ids)
    ? sourceData.ids.filter((id): id is string => typeof id === "string")
    : []
}

const collectSourceSectionIds = (sourceData: Record<string, unknown>): Set<string> => {
  const primary = typeof sourceData.sectionId === "string" ? [sourceData.sectionId] : []
  const list = Array.isArray(sourceData.sectionIds)
    ? sourceData.sectionIds.filter((id): id is string => typeof id === "string")
    : []
  return new Set<string>([...primary, ...list])
}

const isSelfDrop = (targetId: string, sourceData: Record<string, unknown>): boolean => {
  return getSourceIds(sourceData).includes(targetId)
}

const isSameSectionDrop = (
  targetSectionId: string,
  sourceData: Record<string, unknown>,
): boolean => {
  const sectionIds = collectSourceSectionIds(sourceData)
  return sectionIds.size > 0 && sectionIds.size === 1 && sectionIds.has(targetSectionId)
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
          if (isSelfDrop(id, sourceData)) return false
          if (type === "group" && isSameSectionDrop(options.groupSectionId, sourceData)) {
            return false
          }
          return true
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
