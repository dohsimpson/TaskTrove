"use client"

import React, { useEffect, useRef, useState } from "react"
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { cn } from "@/lib/utils"

// Define interfaces for drag and drop data structures
interface DragSource {
  data: Record<string, unknown>
}

interface DropLocation {
  current: {
    dropTargets: Array<{
      data: Record<string, unknown>
    }>
  }
}

interface DropEventData {
  source: DragSource
  location: DropLocation
}

interface CanDropEventData {
  source: DragSource
}

interface GetDataArgs {
  input: unknown
  element?: HTMLElement
}

interface DropTargetWrapperProps {
  children: React.ReactNode
  className?: string
  dropClassName?: string
  onDrop: (data: DropEventData) => void
  canDrop?: (data: CanDropEventData) => boolean
  getData?: (() => Record<string, unknown>) | ((args?: GetDataArgs) => Record<string, unknown>)
  dropTargetId?: string
  onDragEnter?: (data: DropEventData) => void
  onDragLeave?: (data: DropEventData) => void
  onDrag?: (data: DropEventData) => void
}

export function DropTargetWrapper({
  children,
  className,
  dropClassName = "",
  onDrop,
  canDrop,
  getData,
  dropTargetId,
  onDragEnter: onDragEnterProp,
  onDragLeave: onDragLeaveProp,
  onDrag: onDragProp,
}: DropTargetWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDropTarget, setIsDropTarget] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return dropTargetForElements({
      element,
      getData: ({ input }) => ({
        type: "drop-target",
        dropTargetId,
        ...(getData
          ? typeof getData === "function" && getData.length === 0
            ? getData()
            : getData({ input, element })
          : {}),
      }),
      canDrop: canDrop ? ({ source }) => canDrop({ source }) : undefined,
      onDragEnter: ({ source, location }) => {
        setIsDropTarget(true)
        onDragEnterProp?.({ source, location })
      },
      onDragLeave: ({ source, location }) => {
        setIsDropTarget(false)
        onDragLeaveProp?.({ source, location })
      },
      onDrag: ({ source, location }) => {
        onDragProp?.({ source, location })
      },
      onDrop: ({ source, location }) => {
        setIsDropTarget(false)
        onDrop({ source, location })
      },
    })
  }, [onDrop, canDrop, getData, dropTargetId, onDragEnterProp, onDragLeaveProp, onDragProp])

  return (
    <div ref={ref} className={cn(className, isDropTarget && dropClassName)}>
      {children}
    </div>
  )
}
