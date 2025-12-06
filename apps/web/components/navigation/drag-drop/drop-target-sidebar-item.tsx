"use client"

import { DropTargetItem } from "@/components/ui/drag-drop/drop-target-item"
import type { ProjectId, GroupId } from "@tasktrove/types/id"
import type { DropEventData } from "@/hooks/use-sidebar-drag-drop"
import { isValidSidebarOperation } from "@/lib/sidebar-drag-drop-logic"

interface DropTargetSidebarProjectProps {
  projectId: ProjectId
  index: number
  groupId?: GroupId
  children: React.ReactNode
  onDrop: (args: DropEventData) => void
}

/**
 * Sidebar-specific drop target wrapper for projects.
 * Uses tree-item mode with proper indentation for nested projects.
 * Accepts both sidebar items (projects/groups) AND tasks for assignment.
 *
 * Prevents invalid nesting:
 * - Projects cannot be nested under other projects (make-child blocked)
 * - Groups can only exist at ROOT level
 *
 * Hides invalid indicators using validateInstruction (golden path).
 */
export function DropTargetSidebarProject({
  projectId,
  index,
  groupId,
  children,
  onDrop,
}: DropTargetSidebarProjectProps) {
  const currentLevel = groupId ? 1 : 0 // Projects in groups are at level 1

  return (
    <DropTargetItem
      id={projectId}
      index={index}
      mode="tree-item"
      currentLevel={currentLevel}
      indentPerLevel={24}
      getData={() => ({
        type: "sidebar-project-drop-target",
        projectId,
        index,
        groupId,
      })}
      canDrop={(sourceData) => {
        // Accept sidebar projects/groups (for reordering)
        if (sourceData.type === "sidebar-project" || sourceData.type === "sidebar-group") {
          return true
        }
        // Accept tasks (for assignment to project)
        if (sourceData.type === "list-item" && sourceData.ids) {
          return true
        }
        return false
      }}
      validateInstruction={isValidSidebarOperation}
      onDrop={onDrop}
    >
      {children}
    </DropTargetItem>
  )
}

interface DropTargetSidebarGroupProps {
  groupId: GroupId
  index: number
  children: React.ReactNode
  onDrop: (args: DropEventData) => void
}

/**
 * Sidebar-specific drop target wrapper for project groups.
 * Uses tree-item mode at level 0 (root level).
 *
 * Prevents invalid nesting:
 * - Groups cannot be nested under other groups (make-child blocked)
 *
 * Hides invalid indicators using validateInstruction (golden path).
 */
export function DropTargetSidebarGroup({
  groupId,
  index,
  children,
  onDrop,
}: DropTargetSidebarGroupProps) {
  return (
    <DropTargetItem
      id={groupId}
      index={index}
      mode="tree-item"
      currentLevel={0}
      indentPerLevel={24}
      getData={() => ({
        type: "sidebar-group-drop-target",
        groupId,
        index,
      })}
      validateInstruction={isValidSidebarOperation}
      onDrop={onDrop}
    >
      {children}
    </DropTargetItem>
  )
}
