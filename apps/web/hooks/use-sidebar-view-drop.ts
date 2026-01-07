"use client"

import { useCallback } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { taskAtoms, updateTasksAtom } from "@tasktrove/atoms/core/tasks"
import { userAtom } from "@tasktrove/atoms/data/base/atoms"
import { createTaskId } from "@tasktrove/types/id"
import type { UpdateTaskRequest } from "@tasktrove/types/api-requests"
import { toast } from "@/lib/toast"
import {
  getSidebarViewDropUpdate,
  isSidebarViewDropId,
  getSidebarViewDropNoChangeMessage,
  getSidebarViewDropSuccessMessage,
} from "@/lib/sidebar-view-drop-logic"

type TaskDropSource = { type: "list-item"; ids: unknown[] }

const isTaskDropSource = (data: unknown): data is TaskDropSource =>
  typeof data === "object" &&
  data !== null &&
  Reflect.get(data, "type") === "list-item" &&
  Array.isArray(Reflect.get(data, "ids"))

export type DropEventData = ElementDropTargetEventBasePayload

/**
 * Handles task drops onto standard sidebar views (inbox, today, upcoming, completed).
 */
export function useSidebarViewDrop() {
  const updateTasks = useSetAtom(updateTasksAtom)
  const taskById = useAtomValue(taskAtoms.derived.taskById)
  const currentUserId = useAtomValue(userAtom).id

  const handleDrop = useCallback(
    async (args: DropEventData) => {
      const { source, location, self } = args
      const sourceData = source.data
      const dropTargets = location.current.dropTargets

      const dropTarget = dropTargets[0]
      if (!dropTarget) return

      if (dropTarget.element !== self.element) {
        return
      }

      const targetData = dropTarget.data

      if (!isTaskDropSource(sourceData)) return

      const viewIdValue = Reflect.get(targetData, "viewId")
      if (!isSidebarViewDropId(viewIdValue)) return

      const taskIds = sourceData.ids
        .filter((id): id is string => typeof id === "string")
        .map((id) => createTaskId(id))

      if (taskIds.length === 0) return

      const now = new Date()
      const updateRequests = taskIds
        .map((taskId) =>
          getSidebarViewDropUpdate(taskId, taskById.get(taskId), viewIdValue, now, currentUserId),
        )
        .filter((request): request is UpdateTaskRequest => request !== null)

      if (updateRequests.length === 0) {
        toast.info(getSidebarViewDropNoChangeMessage(viewIdValue, taskIds.length))
        return
      }

      try {
        await updateTasks(updateRequests)
        toast.success(getSidebarViewDropSuccessMessage(viewIdValue, updateRequests.length))
      } catch (error) {
        toast.error("Failed to update tasks. Please try again.")
        console.error("Error updating tasks via sidebar view drop:", error)
      }
    },
    [taskById, updateTasks, currentUserId],
  )

  return { handleDrop }
}
