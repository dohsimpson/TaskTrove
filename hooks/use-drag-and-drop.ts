"use client"

import { useCallback } from "react"
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder"
import { useAtom } from "jotai"
import { tasks, taskActions, projectDerived } from "@/lib/atoms"
import { toast } from "@/hooks/use-toast"
import { Task, Project, createProjectId, createLabelId, TaskId } from "@/lib/types"

interface DragResult {
  source: {
    data: {
      type: string
      dragId: string
      index: number
      [key: string]: any
    }
  }
  location: {
    current: {
      dropTargets: Array<{
        data: {
          type: string
          dropTargetId?: string
          [key: string]: any
        }
      }>
    }
  }
}

export function useDragAndDrop() {
  const [tasksData] = useAtom(tasks)
  const [projectsData] = useAtom(projectDerived.visibleProjects)
  const updateTask = useAtom(taskActions.updateTask)[1]

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
        toast({
          title: "Error",
          description: "Task or project not found",
          variant: "destructive",
        })
        return
      }

      if (task.projectId === targetProjectId) {
        toast({
          title: "Info",
          description: "Task is already in this project",
        })
        return
      }

      updateTask({
        updateRequest: { id: taskId, projectId: createProjectId(targetProjectId) },
      })

      toast({
        title: "Task moved",
        description: `Moved task to ${targetProject.name}`,
      })
    },
    [tasksData, projectsData, updateTask],
  )

  const handleTaskDropOnLabel = useCallback(
    (taskId: TaskId, targetLabelId: string) => {
      const task = tasksData.find((t: Task) => t.id === taskId)

      if (!task) {
        toast({
          title: "Error",
          description: "Task not found",
          variant: "destructive",
        })
        return
      }

      const labelId = createLabelId(targetLabelId)
      if (task.labels.includes(labelId)) {
        toast({
          title: "Info",
          description: "Task already has this label",
        })
        return
      }

      const updatedLabels = [...task.labels, labelId]
      updateTask({
        updateRequest: { id: taskId, labels: updatedLabels },
      })

      toast({
        title: "Label added",
        description: `Added label to task`,
      })
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
        const taskId = sourceData.dragId
        const targetProjectId = destinationData.dropTargetId || destinationData.projectId

        if (taskId && targetProjectId) {
          handleTaskDropOnProject(taskId as TaskId, targetProjectId)
        }
        return
      }

      // Handle task drop on label
      if (sourceData.type === "draggable-item" && destinationData.type === "label") {
        const taskId = sourceData.dragId
        const targetLabelId = destinationData.dropTargetId || destinationData.labelId

        if (taskId && targetLabelId) {
          handleTaskDropOnLabel(taskId as TaskId, targetLabelId)
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
        const taskId = sourceData.dragId
        const targetDate = destinationData.date

        if (taskId && targetDate) {
          updateTask({
            updateRequest: { id: taskId as TaskId, dueDate: targetDate },
          })

          toast({
            title: "Task moved",
            description: `Updated task due date`,
          })
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
