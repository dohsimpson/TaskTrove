"use client"

import React, { useState, useRef, useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { v4 as uuidv4 } from "uuid"
import { TaskItem } from "./task-item"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckSquare, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateTaskAtom, tasksAtom } from "@/lib/atoms"
import { quickAddTaskAtom, updateQuickAddTaskAtom } from "@/lib/atoms/ui/dialogs"
import type { Task, Subtask, CreateTaskRequest } from "@/lib/types"
import { createSubtaskId, createTaskId } from "@/lib/types"

interface SubtaskContentProps {
  taskId?: string // Optional for quick-add mode
  task?: Task // Deprecated - use taskId instead
  mode?: "inline" | "popover"
  className?: string
}

export function SubtaskContent({
  taskId,
  task: legacyTask,
  mode = "inline",
  className,
}: SubtaskContentProps) {
  const allTasks = useAtomValue(tasksAtom)
  const updateTask = useSetAtom(updateTaskAtom)
  const updateQuickAddTask = useSetAtom(updateQuickAddTaskAtom)
  const newTask = useAtomValue(quickAddTaskAtom)
  const isNewTask = !taskId && !legacyTask

  // Get the task data - either from quick-add atom, legacy prop, or find by ID
  const task: Task | CreateTaskRequest | undefined = (() => {
    if (legacyTask) return legacyTask // Legacy prop support
    if (isNewTask) return newTask // Quick-add mode
    return allTasks.find((t: Task) => t.id === taskId) // Existing task mode
  })()

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)
  const subtasksContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when a new subtask is added
  useEffect(() => {
    if (shouldScrollToBottom && subtasksContainerRef.current) {
      // Use longer timeout to ensure DOM is fully updated on slower devices
      setTimeout(() => {
        if (subtasksContainerRef.current) {
          // Smooth animated scroll to bottom
          subtasksContainerRef.current.scrollTo({
            top: subtasksContainerRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
        setShouldScrollToBottom(false)
      }, 100)
    }
  }, [task?.subtasks?.length, shouldScrollToBottom])

  if (!task) {
    console.warn("Task not found", taskId)
    return null
  }

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return

    const newSubtask: Subtask = {
      id: createSubtaskId(uuidv4()),
      title: newSubtaskTitle.trim(),
      completed: false,
      order: task.subtasks?.length || 0,
    }

    const updatedSubtasks = [...(task.subtasks || []), newSubtask]

    // Update appropriate atom based on context
    if (isNewTask) {
      updateQuickAddTask({ updateRequest: { subtasks: updatedSubtasks } })
    } else if (legacyTask) {
      updateTask({ updateRequest: { id: legacyTask.id, subtasks: updatedSubtasks } })
    } else if (taskId) {
      updateTask({ updateRequest: { id: createTaskId(taskId), subtasks: updatedSubtasks } })
    }

    setNewSubtaskTitle("")
    setShouldScrollToBottom(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddSubtask()
    }
  }

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0
  const totalSubtasks = task.subtasks?.length || 0
  const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

  return (
    <div className={cn("space-y-3", mode === "popover" && "p-4", className)}>
      {/* Header - Show title for popover header only */}
      {mode !== "inline" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {totalSubtasks > 0 ? "Subtasks" : "Add Subtask"}
            </span>
          </div>
          {totalSubtasks > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedSubtasks}/{totalSubtasks} completed
            </span>
          )}
        </div>
      )}

      {/* Progress Bar - Only show if there are subtasks */}
      {totalSubtasks > 0 && (
        <div className="space-y-1">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {Math.round(progressPercentage)}% complete
          </p>
        </div>
      )}

      {/* Subtasks List */}
      {totalSubtasks > 0 && (
        <div ref={subtasksContainerRef} className="space-y-1 max-h-64 overflow-y-auto">
          {task.subtasks
            ?.sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((subtask) => (
              <TaskItem
                key={subtask.id}
                taskId={createTaskId(String(subtask.id))}
                variant="subtask"
                parentTask={isNewTask ? undefined : task} // Don't pass parentTask for new tasks (quick-add will use quickAddTaskAtom)
              />
            ))}
        </div>
      )}

      {/* Add New Subtask Section - Always visible input with button */}
      <div className="flex gap-2">
        <Input
          placeholder={totalSubtasks > 0 ? "Add another subtask..." : "Add subtasks..."}
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm flex-1"
          data-testid="subtask-input"
        />
        <Button
          onClick={handleAddSubtask}
          disabled={!newSubtaskTitle.trim()}
          size="sm"
          className="h-9 px-3"
          data-testid="subtask-submit-button"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
