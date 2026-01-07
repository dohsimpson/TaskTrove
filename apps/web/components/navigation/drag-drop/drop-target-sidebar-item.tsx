"use client"

import { useAtomValue } from "jotai"
import { DropTargetItem } from "@/components/ui/drag-drop/drop-target-item"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { createTaskId } from "@tasktrove/types/id"
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
  const taskById = useAtomValue(taskAtoms.derived.taskById)
  const indicatorClassName = groupId ? "ml-6 w-[calc(100%-1.5rem)] flex-none" : "w-full flex-none"

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
        // Only accept sidebar projects/groups (for reordering)
        return sourceData.type === "sidebar-project" || sourceData.type === "sidebar-group"
      }}
      validateInstruction={isValidSidebarOperation}
      onDrop={onDrop}
    >
      <DropTargetItem
        id={`${projectId}-task-drop`}
        index={index}
        mode="group"
        getData={() => ({
          type: "sidebar-project-drop-target",
          projectId,
          index,
          groupId,
        })}
        indicatorClassName={indicatorClassName}
        canDrop={(sourceData) => {
          // Accept tasks (for assignment to project)
          if (sourceData.type !== "list-item" || !Array.isArray(sourceData.ids)) {
            return false
          }

          // Block drops when every task already belongs to this project
          const hasMovableTask = sourceData.ids.some((id) => {
            if (typeof id !== "string") {
              return false
            }
            const task = taskById.get(createTaskId(id))
            return !task || task.projectId !== projectId
          })

          return hasMovableTask
        }}
        onDrop={onDrop}
      >
        {children}
      </DropTargetItem>
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
      canDrop={(sourceData) => {
        // Only accept sidebar projects/groups (for reordering)
        return sourceData.type === "sidebar-project" || sourceData.type === "sidebar-group"
      }}
      validateInstruction={isValidSidebarOperation}
      onDrop={onDrop}
    >
      {children}
    </DropTargetItem>
  )
}
