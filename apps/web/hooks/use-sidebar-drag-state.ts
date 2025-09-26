"use client"

import { useState } from "react"
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import type { ProjectId, GroupId } from "@/lib/types"

import { createGroupId } from "@/lib/types"
import { ROOT_PROJECT_GROUP_ID } from "@/lib/types"

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

/**
 * Calculates correct toIndex for reordering within the same context.
 * Accounts for source removal when moving items within the same list.
 */
function calculateAdjustedToIndex(
  sourceIndex: number,
  targetIndex: number,
  edge: Edge | null | undefined,
): number {
  const insertIndex = edge === "top" ? targetIndex : targetIndex + 1
  return sourceIndex < insertIndex ? insertIndex - 1 : insertIndex
}

type InstructionType = "reorder-above" | "reorder-below" | "make-child"

/**
 * Extracts Atlassian's tree-item instruction from drop target data
 */
function extractInstruction(targetData: Record<string, unknown>): {
  type: InstructionType | null
  edge: Edge | null
} {
  const instructionSymbol = Object.getOwnPropertySymbols(targetData).find((symbol) =>
    symbol.toString().includes("tree-item-instruction"),
  )

  if (!instructionSymbol) {
    return { type: null, edge: null }
  }

  const instruction = (targetData as any)[instructionSymbol] as { type: string }
  const type = instruction?.type as InstructionType

  switch (type) {
    case "reorder-above":
      return { type, edge: "top" }
    case "reorder-below":
      return { type, edge: "bottom" }
    case "make-child":
      return { type, edge: null }
    default:
      return { type: null, edge: null }
  }
}

/**
 * Converts drag and drop event data into sidebar-specific instructions.
 */
export function extractSidebarInstruction(
  sourceData: Record<string, unknown>,
  targetData: Record<string, unknown>,
): SidebarInstruction {
  const instruction = extractInstruction(targetData)

  // Project being dragged
  if (sourceData.type === "sidebar-project") {
    const projectId = sourceData.projectId as ProjectId
    const sourceIndex = sourceData.index as number
    const sourceGroupId = sourceData.groupId as GroupId | undefined

    // Dropped on another project (reordering)
    if (targetData.type === "sidebar-project-drop-target") {
      const targetIndex = targetData.index as number
      const targetGroupId = targetData.groupId as GroupId | undefined

      // Same group/context - reorder
      if (sourceGroupId === targetGroupId) {
        return {
          type: "reorder-project",
          projectId,
          fromIndex: sourceIndex,
          toIndex: calculateAdjustedToIndex(sourceIndex, targetIndex, instruction.edge),
          withinGroupId: sourceGroupId,
        }
      }

      const insertIndex = instruction.edge === "top" ? targetIndex : targetIndex + 1

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
        // Moving to ungrouped area - move to ROOT project group
        // The target project is ungrouped, so we calculate position in ROOT group
        return {
          type: "move-project-to-group",
          projectId,
          fromGroupId: sourceGroupId,
          toGroupId: ROOT_PROJECT_GROUP_ID,
          insertIndex,
        }
      }
    }

    // Dropped on group header
    if (targetData.type === "sidebar-group-drop-target") {
      const targetGroupId = targetData.groupId as GroupId
      const targetIndex = targetData.index as number

      if (instruction.type === "reorder-above" || instruction.type === "reorder-below") {
        // Move to ROOT level at group position - move to ROOT project group
        const insertIndex = instruction.edge === "top" ? targetIndex : targetIndex + 1
        return {
          type: "move-project-to-group",
          projectId,
          fromGroupId: sourceGroupId,
          toGroupId: ROOT_PROJECT_GROUP_ID,
          insertIndex,
        }
      } else {
        // Move INTO the group (shorter bar or no instruction)
        return {
          type: "move-project-to-group",
          projectId,
          fromGroupId: sourceGroupId,
          toGroupId: targetGroupId,
          insertIndex: 0,
        }
      }
    }

    // Dropped on root (move to ROOT project group)
    if (targetData.type === "sidebar-root-drop-target" && sourceGroupId) {
      // Calculate insertion position in ROOT group:
      // ROOT group structure: [group1, group2, ..., ungrouped_project1, ungrouped_project2, ...]
      // We want to insert at the end of ROOT group (after all groups and ungrouped projects)
      return {
        type: "move-project-to-group",
        projectId,
        fromGroupId: sourceGroupId,
        toGroupId: ROOT_PROJECT_GROUP_ID,
        insertIndex: -1, // Special value meaning "append to end"
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

      return {
        type: "reorder-group",
        groupId,
        fromIndex: sourceIndex,
        toIndex: calculateAdjustedToIndex(sourceIndex, targetIndex, instruction.edge),
      }
    }

    // Dropped on a project (reordering to project's position)
    if (targetData.type === "sidebar-project-drop-target") {
      const targetIndex = targetData.index as number

      return {
        type: "reorder-group",
        groupId,
        fromIndex: sourceIndex,
        toIndex: calculateAdjustedToIndex(sourceIndex, targetIndex, instruction.edge),
      }
    }
  }

  return null
}

export function useSidebarDragState() {
  const [dragStates, setDragStates] = useState<Map<string, SidebarDragState>>(new Map())

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
