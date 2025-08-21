"use client"

import React, { useEffect, useRef, useState } from "react"
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { cn } from "@/lib/utils"

interface DraggableWrapperProps {
  dragId: string
  index: number
  children: React.ReactNode
  className?: string
  dragClassName?: string
  onDragStart?: (data: { dragId: string; index: number }) => void
  onDrop?: () => void
  getData?: () => Record<string, unknown>
}

export function DraggableWrapper({
  dragId,
  index,
  children,
  className,
  dragClassName = "opacity-50 rotate-1 shadow-lg",
  onDragStart,
  onDrop,
  getData,
}: DraggableWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return draggable({
      element,
      getInitialData: ({ element }) => ({
        type: "draggable-item",
        dragId,
        index,
        rect: element.getBoundingClientRect(),
        ...getData?.(),
      }),
      onDragStart: () => {
        setIsDragging(true)
        onDragStart?.({ dragId, index })
      },
      onDrop: () => {
        setIsDragging(false)
        onDrop?.()
      },
    })
  }, [dragId, index, onDragStart, onDrop, getData])

  return (
    <div ref={ref} className={cn(className, isDragging && dragClassName)}>
      {children}
    </div>
  )
}
