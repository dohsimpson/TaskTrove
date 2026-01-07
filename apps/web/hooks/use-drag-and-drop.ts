"use client"

import { useCallback } from "react"
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder"
import { useAtom } from "jotai"
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { taskAtoms } from "@tasktrove/atoms/core/tasks"
import { projectAtoms } from "@tasktrove/atoms/core/projects"
import { toast } from "@/lib/toast"
import type { Task, Project } from "@tasktrove/types/core"
import { createProjectId, createLabelId, createTaskId, TaskId } from "@tasktrove/types/id"

type DragPayload = {
  type: string
  dragId: string
  index: number
  [key: string]: unknown
}

type DropTargetData = {
  type: string
  dropTargetId?: string
  projectId?: string
  labelId?: string
  date?: Date
  [key: string]: unknown
}

interface DragResult {
  source: {
    data: DragPayload
  }
  location: {
    current: {
      dropTargets: Array<{
        data: DropTargetData
      }>
    }
  }
}

export function useDragAndDrop() {
  const [tasksData] = useAtom(tasksAtom)
  const [projectsData] = useAtom(projectAtoms.derived.visibleProjects)
  const updateTask = useAtom(taskAtoms.actions.updateTask)[1]

  const handleTaskReorder = useCallback(
    (taskIds: TaskId[], startIndex: number, endIndex: number) => {
      if (startIndex === endIndex) return taskIds

      return reorder({
        list: taskIds,
        startIndex,
        finishIndex: endIndex,
      })
    },
    [],
  )

  const handleTaskDropOnProject = useCallback(
    (taskId: TaskId, targetProjectId: string) => {
      const task = tasksData.find((t: Task) => t.id === taskId)
      const targetProject = projectsData.find((p: Project) => p.id === targetProjectId)

      if (!task || !targetProject) {
        toast.error("Task or project not found")
        return
      }

      if (task.projectId === targetProjectId) {
        toast.info("Task is already in this project")
        return
      }

      updateTask({
        updateRequest: { id: taskId, projectId: createProjectId(targetProjectId) },
      })

      toast.success(`Moved task to ${targetProject.name}`)
    },
    [tasksData, projectsData, updateTask],
  )

  const handleTaskDropOnLabel = useCallback(
    (taskId: TaskId, targetLabelId: string) => {
      const task = tasksData.find((t: Task) => t.id === taskId)

      if (!task) {
        toast.error("Task not found")
        return
      }

      const labelId = createLabelId(targetLabelId)
      if (task.labels.includes(labelId)) {
        toast.info("Task already has this label")
        return
      }

      const updatedLabels = [...task.labels, labelId]
      updateTask({
        updateRequest: { id: taskId, labels: updatedLabels },
      })

      toast.success("Added label to task")
    },
    [tasksData, updateTask],
  )

  const handleDrop = useCallback(
    (result: DragResult) => {
      const { source, location } = result
      const destination = location.current.dropTargets[0]

      if (!destination) return

      const sourceData = source.data
      const destinationData = destination.data

      // Handle task drop on project
      if (sourceData.type === "draggable-item" && destinationData.type === "project") {
        const { dragId } = sourceData
        const targetProjectId = destinationData.dropTargetId ?? destinationData.projectId

        if (dragId && targetProjectId) {
          const taskId = createTaskId(dragId)
          handleTaskDropOnProject(taskId, targetProjectId)
        }
        return
      }

      // Handle task drop on label
      if (sourceData.type === "draggable-item" && destinationData.type === "label") {
        const { dragId } = sourceData
        const targetLabelId = destinationData.dropTargetId ?? destinationData.labelId

        if (dragId && targetLabelId) {
          const taskId = createTaskId(dragId)
          handleTaskDropOnLabel(taskId, targetLabelId)
        }
        return
      }

      // Handle task reordering within lists
      if (sourceData.type === "draggable-item" && destinationData.type === "task-list") {
        // This will be handled by individual list components
        return
      }

      // Handle calendar day drops
      if (sourceData.type === "draggable-item" && destinationData.type === "calendar-day") {
        const { dragId } = sourceData
        const targetDate = destinationData.date

        if (dragId && targetDate) {
          const taskId = createTaskId(dragId)
          updateTask({
            updateRequest: { id: taskId, dueDate: targetDate },
          })

          toast.success("Updated task due date")
        }
        return
      }
    },
    [handleTaskDropOnProject, handleTaskDropOnLabel, updateTask],
  )

  return {
    handleDrop,
    handleTaskReorder,
    handleTaskDropOnProject,
    handleTaskDropOnLabel,
  }
}
