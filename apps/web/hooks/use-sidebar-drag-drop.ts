"use client"

import { useCallback } from "react"
import { useSetAtom, useAtomValue } from "jotai"
import { extractInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { allGroupsAtom } from "@tasktrove/atoms/core/groups"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { projectsAtom } from "@tasktrove/atoms/data/base/atoms"
import { updateProjectGroupAtom } from "@tasktrove/atoms/core/groups"
import { updateTasksAtom } from "@tasktrove/atoms/core/tasks"
import { updateProjectsAtom } from "@tasktrove/atoms/core/projects"
import {
  createGroupId,
  createProjectId,
  createTaskId,
  type ProjectId,
  type GroupId,
} from "@tasktrove/types/id"
import type { UpdateTaskRequest } from "@tasktrove/types/api-requests"
import { getDefaultSectionId } from "@tasktrove/types/defaults"
import { toast } from "@/lib/toast"
import { insertIdsAtSectionEnd, removeIdsFromProjects } from "@tasktrove/dom-utils"
import {
  findContainingGroup,
  resolveTargetLocation,
  calculateMove,
  validateDrop,
} from "@/lib/sidebar-drag-drop-logic"

// Re-export for convenience
export type DropEventData = ElementDropTargetEventBasePayload

/**
 * Simplified sidebar drag-and-drop hook using pure functions.
 *
 * Architecture:
 * 1. Pure business logic in sidebar-drag-drop-logic.ts (easy to test)
 * 2. This hook orchestrates: read atoms → call pure functions → update atoms
 *
 * Key principle: ROOT is just another ProjectGroup, not special!
 *
 * Supports:
 * - Dragging projects/groups within sidebar (reordering)
 * - Dragging tasks onto projects (assignment)
 */
export function useSidebarDragDrop() {
  const updateGroup = useSetAtom(updateProjectGroupAtom)
  const updateTasks = useSetAtom(updateTasksAtom)
  const updateProjects = useSetAtom(updateProjectsAtom)
  const allGroups = useAtomValue(allGroupsAtom)
  const projects = useAtomValue(projectsAtom)
  const taskById = useAtomValue(taskAtoms.derived.taskById)

  /**
   * Main drop handler - handles both sidebar reordering and task assignment
   */
  const handleDrop = useCallback(
    async (args: DropEventData) => {
      const { source, location, self } = args
      const sourceData = source.data
      const dropTargets = location.current.dropTargets

      // Get innermost drop target
      const dropTarget = dropTargets[0]
      if (!dropTarget) return

      // CRITICAL: Only handle drop if this is the innermost drop target
      // This prevents the same drop from being processed multiple times
      // when there are nested drop targets (golden path pattern)
      if (dropTarget.element !== self.element) {
        return
      }

      const targetData = dropTarget.data

      // Handle TASK drops (assignment to project)
      if (
        Reflect.get(sourceData, "type") === "list-item" &&
        Array.isArray(Reflect.get(sourceData, "ids")) &&
        typeof Reflect.get(targetData, "projectId") === "string"
      ) {
        try {
          const projectIdValue = Reflect.get(targetData, "projectId")
          if (typeof projectIdValue !== "string") {
            return
          }

          const idsValue = Reflect.get(sourceData, "ids")
          if (!Array.isArray(idsValue)) {
            return
          }

          const taskIds = idsValue
            .filter((id): id is string => typeof id === "string")
            .map((id) => createTaskId(id))
          const targetProjectId = createProjectId(projectIdValue)

          // Find target project to get its default section
          const targetProject = projects.find((p) => p.id === targetProjectId)
          if (!targetProject) {
            toast.error("Target project not found")
            return
          }

          const targetSectionId = getDefaultSectionId(targetProject)
          if (!targetSectionId) {
            toast.error("Target project has no default section")
            return
          }

          // Build update requests for tasks that are not already in the target project
          const updateRequests: UpdateTaskRequest[] = taskIds
            .map((taskId): UpdateTaskRequest | null => {
              const task = taskById.get(taskId)
              if (!task) {
                return {
                  id: taskId,
                  projectId: targetProjectId,
                  sectionId: targetSectionId,
                }
              }

              if (task.projectId === targetProjectId) {
                return null
              }

              return {
                id: taskId,
                projectId: targetProjectId,
                sectionId: targetSectionId,
              }
            })
            .filter((req): req is UpdateTaskRequest => req !== null)

          if (updateRequests.length === 0) {
            const count = taskIds.length
            toast.info(
              count === 1
                ? `Task already belongs to ${targetProject.name}`
                : `All tasks already belong to ${targetProject.name}`,
            )
            return
          }

          // Update all tasks at once
          await updateTasks(updateRequests)

          // Update project section membership for moved tasks
          const movingTaskIds = updateRequests.map((request) => request.id)
          const affectedProjectIds = new Set<ProjectId>([targetProjectId])
          for (const taskId of movingTaskIds) {
            const task = taskById.get(taskId)
            if (task?.projectId) {
              affectedProjectIds.add(task.projectId)
            }
          }

          const affectedProjects = Array.from(affectedProjectIds)
            .map((pid) => projects.find((p) => p.id === pid))
            .filter((p): p is (typeof projects)[number] => Boolean(p))

          if (affectedProjects.length > 0) {
            const movingIds = movingTaskIds.map((id) => id.toString())
            const cleaned = removeIdsFromProjects(affectedProjects, movingIds)
            const cleanedTarget = cleaned.find((p) => p.id === targetProjectId)

            if (cleanedTarget) {
              const updatedTarget = insertIdsAtSectionEnd(cleanedTarget, targetSectionId, movingIds)
              const merged = cleaned.map((proj) =>
                proj.id === targetProjectId ? updatedTarget : proj,
              )

              await updateProjects(
                merged.map((proj) => ({
                  id: createProjectId(proj.id),
                  sections: proj.sections,
                })),
              )
            }
          }

          const count = updateRequests.length
          toast.success(
            count === 1
              ? `Task moved to ${targetProject.name}`
              : `${count} tasks moved to ${targetProject.name}`,
          )

          console.log("✅ Task(s) assigned to project:", {
            taskCount: count,
            targetProject: targetProject.name,
            targetProjectId,
            targetSectionId,
          })
        } catch (error) {
          toast.error("Failed to move tasks. Please try again.")
          console.error("Error moving tasks to project:", error)
        }
        return
      }

      // Handle SIDEBAR ITEM drops (project/group reordering)
      const instruction = extractInstruction(targetData)
      if (!instruction) return

      try {
        // 1. Validate the drop operation
        const error = validateDrop(sourceData, targetData)
        if (error) {
          toast.error(error)
          return
        }

        // 2. Extract the dragged item ID
        const projectId = Reflect.get(sourceData, "projectId")
        const groupId = Reflect.get(sourceData, "groupId")
        let draggedItemId: ProjectId | GroupId | null = null
        if (typeof projectId === "string") {
          draggedItemId = createProjectId(projectId)
        } else if (typeof groupId === "string") {
          draggedItemId = createGroupId(groupId)
        }
        if (!draggedItemId) return

        // 3. Find where the item currently is (pure function)
        const rootGroup = allGroups.projectGroups
        const sourceLocation = findContainingGroup(draggedItemId, rootGroup)
        if (!sourceLocation) {
          console.warn("Source location not found for item:", draggedItemId)
          return
        }

        // 4. Resolve where the item should go (pure function)
        const targetLocation = resolveTargetLocation(targetData, instruction, rootGroup)
        if (!targetLocation) {
          console.warn("Could not resolve target location")
          return
        }

        // 5. Calculate the move (pure function - no mutations)
        const moveResult = calculateMove(draggedItemId, sourceLocation, targetLocation, rootGroup)

        // 6. Apply updates (only side effects happen here)
        for (const update of moveResult.updates) {
          console.log("Updating group:", update.groupId, update.newItems)
          await updateGroup({ id: update.groupId, items: update.newItems })
        }
        // Debug logging to help track down issues
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Drag-drop complete:", {
            item: draggedItemId,
            updates: moveResult.updates.map((u) => ({
              groupId: u.groupId,
              itemCount: u.newItems.length,
            })),
          })
        }
      } catch (error) {
        toast.error("Failed to reorder items. Please try again.")
        console.error("Error executing sidebar drag-and-drop:", error)
      }
    },
    [updateGroup, updateProjects, updateTasks, allGroups, projects, taskById],
  )

  return { handleDrop }
}
