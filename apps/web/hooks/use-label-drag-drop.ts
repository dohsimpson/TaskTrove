"use client"

import { useCallback } from "react"
import { extractInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { useSetAtom, useAtomValue } from "jotai"
import { labelsAtom, tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { reorderLabelsAtom } from "@tasktrove/atoms/core/labels"
import { updateTasksAtom } from "@tasktrove/atoms/core/tasks"
import type { LabelId, TaskId } from "@tasktrove/types/id"
import type { UpdateTaskRequest } from "@tasktrove/types/api-requests"
import { toast } from "@/lib/toast"
import {
  findContainingLabel,
  resolveLabelTargetLocation,
  calculateLabelMove,
  validateLabelDrop,
} from "@/lib/label-drag-drop-logic"

type TaskDropSource = { type: "list-item"; ids: TaskId[] }
type SidebarLabelSource = { type: "sidebar-label"; labelId: LabelId }
type LabelDropTarget = { labelId: LabelId }

const isTaskDropSource = (data: unknown): data is TaskDropSource =>
  typeof data === "object" &&
  data !== null &&
  Reflect.get(data, "type") === "list-item" &&
  Array.isArray(Reflect.get(data, "ids"))

const isLabelDropTarget = (data: unknown): data is LabelDropTarget =>
  typeof data === "object" && data !== null && typeof Reflect.get(data, "labelId") === "string"

const isSidebarLabelSource = (data: unknown): data is SidebarLabelSource =>
  typeof data === "object" &&
  data !== null &&
  Reflect.get(data, "type") === "sidebar-label" &&
  typeof Reflect.get(data, "labelId") === "string"

// Re-export for convenience
export type DropEventData = ElementDropTargetEventBasePayload

/**
 * Simplified label drag-and-drop hook using pure functions.
 *
 * Architecture:
 * 1. Pure business logic in label-drag-drop-logic.ts (easy to test)
 * 2. This hook orchestrates: read atoms → call pure functions → update atoms
 *
 * Supports:
 * - Dragging labels within the labels section (reordering)
 * - Dragging tasks onto labels (adding label to task) - golden path pattern
 */
export function useLabelDragDrop() {
  const reorderLabels = useSetAtom(reorderLabelsAtom)
  const updateTasks = useSetAtom(updateTasksAtom)
  const labels = useAtomValue(labelsAtom)
  const tasks = useAtomValue(tasksAtom)

  /**
   * Main drop handler - handles both label reordering and task labeling
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

      // Handle TASK drops (adding label to task) - golden path pattern
      if (isTaskDropSource(sourceData) && isLabelDropTarget(targetData)) {
        try {
          const taskIds = sourceData.ids
          const targetLabelId = targetData.labelId

          // Find target label
          const targetLabel = labels.find((l) => l.id === targetLabelId)
          if (!targetLabel) {
            toast.error("Label not found")
            return
          }

          // Build update requests for all tasks
          // Add the label to each task's labels array if not already present
          const updateRequests = taskIds
            .map((taskId): UpdateTaskRequest | null => {
              const task = tasks.find((t) => t.id === taskId)
              if (!task) return null

              // Check if label already exists on task
              if (task.labels.includes(targetLabelId)) {
                return null // Skip if label already exists
              }

              // Add label to task
              return {
                id: taskId,
                labels: [...task.labels, targetLabelId],
              }
            })
            .filter((req): req is UpdateTaskRequest => req !== null)

          // Only update if there are tasks to update
          if (updateRequests.length === 0) {
            const count = taskIds.length
            toast.info(
              count === 1
                ? `Task already has label "${targetLabel.name}"`
                : `All tasks already have label "${targetLabel.name}"`,
            )
            return
          }

          // Update all tasks at once
          await updateTasks(updateRequests)

          const count = updateRequests.length
          toast.success(
            count === 1
              ? `Added label "${targetLabel.name}" to task`
              : `Added label "${targetLabel.name}" to ${count} tasks`,
          )

          console.log("✅ Label added to task(s):", {
            taskCount: count,
            label: targetLabel.name,
            labelId: targetLabelId,
          })
        } catch (error) {
          toast.error("Failed to add label to tasks. Please try again.")
          console.error("Error adding label to tasks:", error)
        }
        return
      }

      // Handle LABEL drops (reordering)
      if (isSidebarLabelSource(sourceData)) {
        try {
          // 1. Validate the drop operation
          const error = validateLabelDrop(sourceData, targetData)
          if (error) {
            toast.error(error)
            return
          }

          // 2. Extract the dragged label ID
          const draggedLabelId = sourceData.labelId
          if (!draggedLabelId) return

          // 3. Find where the label currently is (pure function)
          const sourceIndex = findContainingLabel(draggedLabelId, labels)
          if (sourceIndex === null) {
            console.warn("Source label not found:", draggedLabelId)
            return
          }

          // 4. Resolve where the label should go (pure function)
          const instruction = extractInstruction(targetData)
          if (!instruction) return

          const targetIndex = resolveLabelTargetLocation(targetData, instruction, labels)
          if (targetIndex === null) {
            console.warn("Could not resolve target location")
            return
          }

          // 5. Calculate the move (pure function - no mutations)
          calculateLabelMove(draggedLabelId, sourceIndex, targetIndex, labels)

          // 6. Apply updates (only side effects happen here)
          await reorderLabels({ fromIndex: sourceIndex, toIndex: targetIndex })

          // Debug logging to help track down issues
          if (process.env.NODE_ENV === "development") {
            console.log("✅ Label drag-drop complete:", {
              label: draggedLabelId,
              fromIndex: sourceIndex,
              toIndex: targetIndex,
            })
          }
        } catch (error) {
          toast.error("Failed to reorder labels. Please try again.")
          console.error("Error executing label drag-and-drop:", error)
        }
      }
    },
    [labels, reorderLabels, tasks, updateTasks],
  )

  return { handleDrop }
}
