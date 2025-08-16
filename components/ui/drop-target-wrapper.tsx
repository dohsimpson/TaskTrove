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
}

export function DropTargetWrapper({
  children,
  className,
  dropClassName = "bg-blue-50 border-2 border-blue-300 border-dashed",
  onDrop,
  canDrop,
  getData,
  dropTargetId,
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
      onDragEnter: () => setIsDropTarget(true),
      onDragLeave: () => setIsDropTarget(false),
      onDrop: ({ source, location }) => {
        setIsDropTarget(false)
        onDrop({ source, location })
      },
    })
  }, [onDrop, canDrop, getData, dropTargetId])

  return (
    <div ref={ref} className={cn(className, isDropTarget && dropClassName)}>
      {children}
    </div>
  )
}
