"use client"

import { useEffect, useRef, useState } from "react"
import {
  dropTargetForElements,
  type ElementDropTargetEventBasePayload,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import {
  attachInstruction as attachListInstruction,
  extractInstruction as extractListInstruction,
  type Instruction as ListInstruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item"
import {
  attachInstruction as attachTreeInstruction,
  extractInstruction as extractTreeInstruction,
  type Instruction as TreeInstruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item"
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/list-item"
import { DropIndicator as TreeDropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item"
import { GroupDropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/group"
import { cn } from "@/lib/utils"

export type DropTargetMode = "list-item" | "group" | "tree-item"
export type Instruction = ListInstruction | TreeInstruction

interface DropTargetItemProps {
  id: string
  index?: number
  mode: DropTargetMode
  children: React.ReactNode
  className?: string
  lineGap?: string
  currentLevel?: number // For tree mode
  indentPerLevel?: number // For tree mode
  getData?: () => Record<string, unknown>
  canDrop?: (sourceData: Record<string, unknown>) => boolean
  validateInstruction?: (
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>,
    instruction: Instruction | null,
  ) => boolean
  onDrop: (args: ElementDropTargetEventBasePayload) => void
  onDragEnter?: (args: ElementDropTargetEventBasePayload) => void
  onDragLeave?: (args: ElementDropTargetEventBasePayload) => void
  onDrag?: (args: ElementDropTargetEventBasePayload) => void
}

/**
 * Generic drop target component that works with list-item, group, and tree-item modes.
 * Automatically handles indicators and instruction attachment based on mode.
 *
 * Modes:
 * - list-item: For vertical lists (tasks, sections). Shows line indicators.
 * - group: For container drops (section backgrounds). Shows group highlight.
 * - tree-item: For hierarchical items (sidebar). Shows tree indicators with indentation.
 *
 * @example
 * ```tsx
 * // List mode (for tasks)
 * <DropTargetItem id="task-1" mode="list-item" onDrop={handleDrop}>
 *   <TaskItem />
 * </DropTargetItem>
 *
 * // Group mode (for section backgrounds)
 * <DropTargetItem id="section-1" mode="group" onDrop={handleDrop}>
 *   <Section />
 * </DropTargetItem>
 *
 * // Tree mode (for sidebar)
 * <DropTargetItem id="project-1" mode="tree-item" currentLevel={1} onDrop={handleDrop}>
 *   <ProjectItem />
 * </DropTargetItem>
 * ```
 */
export function DropTargetItem({
  id,
  index = 0,
  mode,
  children,
  className,
  lineGap = "8px",
  currentLevel = 0,
  indentPerLevel = 0,
  getData,
  canDrop,
  validateInstruction,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDrag,
}: DropTargetItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [instruction, setInstruction] = useState<Instruction | null>(null)
  const [isOver, setIsOver] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return dropTargetForElements({
      element,
      getIsSticky: () => false,
      getData: ({ input, element: el }) => {
        const baseData = {
          type: mode,
          id,
          index,
          ...getData?.(),
        }

        // Attach appropriate instruction based on mode
        if (mode === "tree-item") {
          return attachTreeInstruction(baseData, {
            element: el,
            input,
            currentLevel,
            indentPerLevel,
            mode: "standard",
          })
        }
        if (mode === "list-item") {
          return attachListInstruction(baseData, {
            element: el,
            input,
            operations: {
              "reorder-before": "available",
              "reorder-after": "available",
              combine: "not-available",
            },
          })
        }
        return baseData
      },
      canDrop: canDrop ? ({ source }) => canDrop(source.data) : undefined,
      onDragEnter: (args) => {
        setIsOver(true)
        onDragEnter?.(args)
      },
      onDrag: (args) => {
        const { self, location, source } = args

        // Only show indicator if this is the innermost target
        const innermost = location.current.dropTargets[0]
        if (innermost?.element !== self.element) {
          setInstruction(null)
          onDrag?.(args)
          return
        }

        // Extract instruction based on mode
        let extracted: Instruction | null = null
        if (mode === "tree-item") {
          extracted = extractTreeInstruction(self.data)
        } else if (mode === "list-item") {
          extracted = extractListInstruction(self.data)
        }

        // Validate instruction before showing indicator (golden path!)
        if (validateInstruction) {
          const isValid = validateInstruction(source.data, self.data, extracted)
          if (!isValid) {
            setInstruction(null)
            onDrag?.(args)
            return
          }
        }

        setInstruction(extracted)
        onDrag?.(args)
      },
      onDragLeave: (args) => {
        setIsOver(false)
        setInstruction(null)
        onDragLeave?.(args)
      },
      onDrop: (args) => {
        setIsOver(false)
        setInstruction(null)
        onDrop(args)
      },
    })
  }, [
    id,
    index,
    mode,
    currentLevel,
    indentPerLevel,
    getData,
    canDrop,
    validateInstruction,
    onDrop,
    onDragEnter,
    onDragLeave,
    onDrag,
  ])

  // Group mode: simple highlighting with GroupDropIndicator
  if (mode === "group") {
    return (
      <div className={cn(className, "flex-1 flex")} data-testid={`drop-target-${id}`}>
        {/* NOTE: important!!! Do not remove the className on GroupDropIndicator!!! The className must be applied on this element or the UI would break */}
        <GroupDropIndicator isActive={isOver} ref={ref} className="flex flex-1">
          {children}
        </GroupDropIndicator>
      </div>
    )
  }

  // List-item mode: show line indicators
  if (mode === "list-item") {
    return (
      <div ref={ref} className={cn(className, "relative")} data-testid={`drop-target-${id}`}>
        {children}
        {instruction && "operation" in instruction && (
          <DropIndicator
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type guard ensures this is ListInstruction
            instruction={instruction as ListInstruction}
            lineType="terminal-no-bleed"
            lineGap={lineGap}
          />
        )}
      </div>
    )
  }

  // Tree-item mode: show tree indicators with Atlaskit's tree indicator
  return (
    <div ref={ref} className={cn(className, "relative")} data-testid={`drop-target-${id}`}>
      {children}
      {instruction && (
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- In tree-item mode, instruction is TreeInstruction
        <TreeDropIndicator instruction={instruction as TreeInstruction} />
      )}
    </div>
  )
}
