"use client"

import { useState } from "react"
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import type { ProjectId, GroupId } from "@/lib/types"

export interface SidebarDragState {
  isDraggingOver: boolean
  draggedItemRect?: { height: number }
  draggedItemType?: "project" | "group"
  targetType?: "project" | "group" | "root"
  targetId?: string
  closestEdge?: "top" | "bottom"
  insertionIndex?: number
}

// Instruction types for different drop actions
export type SidebarInstruction =
  | {
      type: "reorder-project"
      projectId: ProjectId
      fromIndex: number
      toIndex: number
      withinGroupId?: GroupId
    }
  | {
      type: "move-project-to-group"
      projectId: ProjectId
      fromGroupId?: GroupId
      toGroupId: GroupId
      insertIndex: number
    }
  | {
      type: "remove-project-from-group"
      projectId: ProjectId
      fromGroupId: GroupId
      insertIndex: number
    }
  | { type: "reorder-group"; groupId: GroupId; fromIndex: number; toIndex: number }
  | null

// Extract instruction from drop data following official Pragmatic pattern
export function extractSidebarInstruction(
  sourceData: Record<string, unknown>,
  targetData: Record<string, unknown>,
  closestEdge?: Edge | null,
): SidebarInstruction {
  // Project being dragged
  if (sourceData.type === "sidebar-project") {
    const projectId = sourceData.projectId as ProjectId
    const sourceIndex = sourceData.index as number
    const sourceGroupId = sourceData.groupId as GroupId | undefined

    // Dropped on another project (reordering)
    if (targetData.type === "sidebar-project-drop-target") {
      const targetIndex = targetData.index as number
      const targetGroupId = targetData.groupId as GroupId | undefined

      const insertIndex = closestEdge === "top" ? targetIndex : targetIndex + 1

      // Same group/context - reorder
      if (sourceGroupId === targetGroupId) {
        return {
          type: "reorder-project",
          projectId,
          fromIndex: sourceIndex,
          toIndex: insertIndex,
          withinGroupId: sourceGroupId,
        }
      }

      // Different groups - move
      if (targetGroupId) {
        return {
          type: "move-project-to-group",
          projectId,
          fromGroupId: sourceGroupId,
          toGroupId: targetGroupId,
          insertIndex,
        }
      } else {
        return {
          type: "remove-project-from-group",
          projectId,
          fromGroupId: sourceGroupId!,
          insertIndex,
        }
      }
    }

    // Dropped on group header (add to group)
    if (targetData.type === "sidebar-group-drop-target") {
      const targetGroupId = targetData.groupId as GroupId
      return {
        type: "move-project-to-group",
        projectId,
        fromGroupId: sourceGroupId,
        toGroupId: targetGroupId,
        insertIndex: 0, // Add to beginning of group
      }
    }

    // Dropped on root (remove from group)
    if (targetData.type === "sidebar-root-drop-target" && sourceGroupId) {
      return {
        type: "remove-project-from-group",
        projectId,
        fromGroupId: sourceGroupId,
        insertIndex: 0,
      }
    }
  }

  // Group being dragged
  if (sourceData.type === "sidebar-group") {
    const groupId = sourceData.groupId as GroupId
    const sourceIndex = sourceData.index as number

    // Dropped on another group (reordering)
    if (targetData.type === "sidebar-group-drop-target") {
      const targetIndex = targetData.index as number
      const insertIndex = closestEdge === "top" ? targetIndex : targetIndex + 1

      return {
        type: "reorder-group",
        groupId,
        fromIndex: sourceIndex,
        toIndex: insertIndex,
      }
    }
  }

  return null
}

export type SidebarDragStates = Map<string, SidebarDragState>

export function useSidebarDragState() {
  const [dragStates, setDragStates] = useState<SidebarDragStates>(new Map())

  const updateDragState = (targetId: string, state: Partial<SidebarDragState>) => {
    setDragStates((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(targetId) || { isDraggingOver: false }
      newMap.set(targetId, { ...current, ...state })
      return newMap
    })
  }

  const clearDragState = (targetId: string) => {
    setDragStates((prev) => {
      const newMap = new Map(prev)
      newMap.delete(targetId)
      return newMap
    })
  }

  const clearAllDragStates = () => {
    setDragStates(new Map())
  }

  const getDragState = (targetId: string): SidebarDragState | undefined => {
    return dragStates.get(targetId)
  }

  return {
    dragStates,
    updateDragState,
    clearDragState,
    clearAllDragStates,
    getDragState,
  }
}

// Execute instruction following official Pragmatic pattern
export async function executeSidebarInstruction(
  instruction: SidebarInstruction,
  atomStore: {
    set: <T>(atom: any, value: T) => Promise<void>
  },
): Promise<void> {
  if (!instruction) return

  // Import the atoms we need - using dynamic imports to avoid circular dependencies
  const {
    reorderProjectWithinGroupAtom,
    moveProjectToGroupAtom,
    removeProjectFromGroupWithIndexAtom,
    reorderGroupAtom,
  } = await import("@/lib/atoms/core/groups")
  const { reorderProjectAtom } = await import("@/lib/atoms/core/ordering")

  try {
    switch (instruction.type) {
      case "reorder-project":
        if (instruction.withinGroupId) {
          // Reorder within a group
          await atomStore.set(reorderProjectWithinGroupAtom, {
            groupId: instruction.withinGroupId,
            projectId: instruction.projectId,
            newIndex: instruction.toIndex,
          })
        } else {
          // Reorder in ungrouped projects
          await atomStore.set(reorderProjectAtom, {
            projectId: instruction.projectId,
            newIndex: instruction.toIndex,
          })
        }
        break

      case "move-project-to-group":
        await atomStore.set(moveProjectToGroupAtom, {
          projectId: instruction.projectId,
          fromGroupId: instruction.fromGroupId,
          toGroupId: instruction.toGroupId,
          insertIndex: instruction.insertIndex,
        })
        break

      case "remove-project-from-group":
        await atomStore.set(removeProjectFromGroupWithIndexAtom, {
          projectId: instruction.projectId,
          insertIndex: instruction.insertIndex,
        })
        break

      case "reorder-group":
        await atomStore.set(reorderGroupAtom, {
          groupId: instruction.groupId,
          fromIndex: instruction.fromIndex,
          toIndex: instruction.toIndex,
        })
        break

      default:
        console.log("❓ Unknown instruction:", instruction)
    }
  } catch (error) {
    console.error("🚨 Error executing sidebar instruction:", error)
    throw error
  }
}

// Legacy mock actions (for backward compatibility)
export const mockSidebarActions = {
  moveProject: ({
    projectId,
    fromGroupId,
    toGroupId,
    insertIndex,
  }: {
    projectId: ProjectId
    fromGroupId?: GroupId
    toGroupId?: GroupId
    insertIndex: number
  }) => {
    console.log("🔄 Mock Action: moveProject", {
      projectId,
      fromGroupId: fromGroupId || "ungrouped",
      toGroupId: toGroupId || "ungrouped",
      insertIndex,
    })
  },

  reorderProject: ({
    projectId,
    fromIndex,
    toIndex,
    withinGroupId,
  }: {
    projectId: ProjectId
    fromIndex: number
    toIndex: number
    withinGroupId?: GroupId
  }) => {
    console.log("📋 Mock Action: reorderProject", {
      projectId,
      fromIndex,
      toIndex,
      context: withinGroupId || "ungrouped",
    })
  },

  reorderGroup: ({
    groupId,
    fromIndex,
    toIndex,
  }: {
    groupId: GroupId
    fromIndex: number
    toIndex: number
  }) => {
    console.log("📁 Mock Action: reorderGroup", {
      groupId,
      fromIndex,
      toIndex,
    })
  },

  addProjectToGroup: ({
    projectId,
    groupId,
    insertIndex,
  }: {
    projectId: ProjectId
    groupId: GroupId
    insertIndex: number
  }) => {
    console.log("➕ Mock Action: addProjectToGroup", {
      projectId,
      groupId,
      insertIndex,
    })
  },

  removeProjectFromGroup: ({
    projectId,
    groupId,
    insertIndex,
  }: {
    projectId: ProjectId
    groupId: GroupId
    insertIndex: number
  }) => {
    console.log("➖ Mock Action: removeProjectFromGroup", {
      projectId,
      groupId,
      insertIndex,
    })
  },
}
