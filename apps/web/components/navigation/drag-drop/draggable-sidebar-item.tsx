"use client"

import { DraggableItem } from "@/components/ui/drag-drop/draggable-item"
import type { ProjectId, GroupId } from "@tasktrove/types/id"

interface DraggableSidebarProjectProps {
  projectId: ProjectId
  index: number
  groupId?: GroupId
  children: React.ReactNode
}

/**
 * Sidebar-specific draggable wrapper for projects.
 * Uses tree mode for hierarchical drag-and-drop.
 */
export function DraggableSidebarProject({
  projectId,
  index,
  groupId,
  children,
}: DraggableSidebarProjectProps) {
  return (
    <DraggableItem
      id={projectId}
      index={index}
      mode="tree"
      getData={() => ({
        type: "sidebar-project",
        projectId,
        index,
        groupId,
        isInGroup: !!groupId,
      })}
    >
      {children}
    </DraggableItem>
  )
}

interface DraggableSidebarGroupProps {
  groupId: GroupId
  index: number
  projectCount: number
  children: React.ReactNode
}

/**
 * Sidebar-specific draggable wrapper for project groups.
 * Uses tree mode for hierarchical drag-and-drop.
 */
export function DraggableSidebarGroup({
  groupId,
  index,
  projectCount,
  children,
}: DraggableSidebarGroupProps) {
  return (
    <DraggableItem
      id={groupId}
      index={index}
      mode="tree"
      getData={() => ({
        type: "sidebar-group",
        groupId,
        index,
        projectCount,
      })}
    >
      {children}
    </DraggableItem>
  )
}
