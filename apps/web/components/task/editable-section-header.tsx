"use client"

import React from "react"
import { useAtomValue } from "jotai"
import { Badge } from "@/components/ui/badge"
import { EditableDiv } from "@/components/ui/custom/editable-div"
import { SectionContextMenu } from "./section-context-menu"
import { editingSectionIdAtom } from "@tasktrove/atoms"
import { createGroupId } from "@/lib/types"
import { cn } from "@/lib/utils"

interface EditableSectionHeaderProps {
  /** Section ID */
  sectionId: string
  /** Section name */
  sectionName: string
  /** Section color */
  sectionColor: string
  /** Number of tasks in section */
  taskCount: number
  /** Whether this is the default section */
  isDefaultSection?: boolean
  /** Whether to show the context menu */
  showContextMenu?: boolean
  /** Custom className for the container */
  className?: string
  /** Custom className for the section name element */
  nameClassName?: string
  /** Element tag for the section name (h2, h3, etc.) */
  nameElement?: "h1" | "h2" | "h3" | "h4" | "p" | "div" | "span"
  /** Additional content to render on the right side */
  rightContent?: React.ReactNode
  /** Additional content to render on the left side */
  leftContent?: React.ReactNode
  /** Handler for when editing is saved */
  onSaveEdit: (newName: string) => void
  /** Handler for when editing is cancelled */
  onCancelEdit: () => void
  /** Handler for mouse enter events */
  onMouseEnter?: () => void
  /** Handler for mouse leave events */
  onMouseLeave?: () => void
  /** Additional click handlers for the container */
  onClick?: (e: React.MouseEvent) => void
}

/**
 * Reusable section header component with inline editing capabilities.
 * Used by both kanban board and project sections view for consistent UX.
 *
 * Features:
 * - Inline name editing with EditableDiv
 * - Color indicator dot
 * - Task count badge
 * - Context menu integration
 * - Hover state management
 * - Flexible layout with custom content slots
 */
export function EditableSectionHeader({
  sectionId,
  sectionName,
  sectionColor,
  taskCount,
  isDefaultSection = false,
  showContextMenu = true,
  className,
  nameClassName = "font-medium text-foreground",
  nameElement = "h3",
  rightContent,
  leftContent,
  onSaveEdit,
  onCancelEdit,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: EditableSectionHeaderProps) {
  const editingSectionId = useAtomValue(editingSectionIdAtom)
  const isEditing = editingSectionId === sectionId

  return (
    <div
      className={cn("flex items-center justify-between", className)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Custom left content (e.g., collapse/expand arrow) */}
        {leftContent}

        {/* Color indicator */}
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: sectionColor }} />

        <div className="flex items-center gap-2 cursor-default">
          {/* Editable section name */}
          {isEditing ? (
            <EditableDiv
              as={nameElement}
              value={sectionName}
              onChange={onSaveEdit}
              onCancel={onCancelEdit}
              className={nameClassName}
              autoFocus={true}
              cursorPosition="end"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            React.createElement(
              nameElement,
              {
                className: nameClassName,
              },
              sectionName,
            )
          )}

          {/* Task count badge */}
          <Badge
            variant="secondary"
            className="text-xs px-1.5 py-0.5 h-auto bg-transparent border-none text-muted-foreground font-medium"
          >
            {taskCount}
          </Badge>

          {/* Default section indicator */}
          {isDefaultSection && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0.5 h-auto text-muted-foreground font-normal"
            >
              Default
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Custom right content (e.g., add button) */}
        {rightContent}

        {/* Section context menu */}
        {showContextMenu && (
          <SectionContextMenu sectionId={createGroupId(sectionId)} isVisible={true} />
        )}
      </div>
    </div>
  )
}
