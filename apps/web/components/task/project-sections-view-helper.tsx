"use client"

import { useEffect, useRef, useState } from "react"
import {
  attachInstruction,
  extractInstruction,
  type Instruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item"
import {
  draggable,
  dropTargetForElements,
  ElementDropTargetEventBasePayload,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/list-item"
import { GroupDropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/group"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { autoScrollWhileDragging } from "auto-scroll-while-dragging"

interface DropTargetElementProps {
  type: "list-item" | "group"
  indicator: {
    lineGap?: string // gap between items
  }
  testId?: string
}

function isOver({ location, self }: ElementDropTargetEventBasePayload): boolean {
  return location.current.dropTargets.some(({ element }) => element === self.element)
}

export function DropTargetElement({
  id,
  children,
  options,
}: {
  id: string
  children: React.ReactNode
  options: DropTargetElementProps
}) {
  const { type, indicator, testId } = options
  const [currentInstruction, setCurrentInstruction] = useState<Instruction | null>(null)
  const [isOverElement, setIsOverElement] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    return combine(
      dropTargetForElements({
        element,
        getIsSticky: () => true,
        getData: ({ source, input, element }) => {
          // your base data you want to attach to the drop target
          const data = {
            id,
            type: type === "group" ? "group" : "item",
          }
          // this will 'attach' the closest edge to your `data` object
          return attachInstruction(data, {
            input,
            element,
            operations: {
              "reorder-before": id === source.data.id ? "not-available" : "available",
              "reorder-after": id === source.data.id ? "not-available" : "available",
              combine: "not-available",
            },
          })
        },
        onDrag: (args: ElementDropTargetEventBasePayload) => {
          const instruction: Instruction | null = extractInstruction(args.self.data)
          setCurrentInstruction(instruction)
          setIsOverElement(isOver(args))
        },
        onDragLeave: () => {
          setCurrentInstruction(null)
          setIsOverElement(false)
        },
        onDrop: () => {
          setCurrentInstruction(null)
          setIsOverElement(false)
        },
      }),
      autoScrollWhileDragging({ rootEl: element, gap: 120 }), // this works while auto-scroll package from pragmatic DND doesn't. Read doc for handling virtual list
    )
  }, [id, type])

  if (type === "group") {
    return (
      <div data-testid={testId}>
        <GroupDropIndicator isActive={isOverElement} ref={ref}>
          <div>{children}</div>
        </GroupDropIndicator>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: "relative" }} data-testid={testId}>
      <div>{children}</div>
      {currentInstruction && (
        <DropIndicator
          instruction={currentInstruction}
          lineType="terminal-no-bleed"
          lineGap={indicator.lineGap}
        />
      )}
    </div>
  )
}

export function DraggableElement({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    return draggable({
      element: ref.current,
      getInitialData: () => ({
        id,
      }),
      onDragStart: () => {
        setIsDragging(true)
      },
      onDrop: () => {
        setIsDragging(false)
      },
    })
  }, [id])
  return (
    <div ref={ref} style={{ opacity: isDragging ? 0.5 : 1 }} data-testid={`draggable-${id}`}>
      {children}
    </div>
  )
}
