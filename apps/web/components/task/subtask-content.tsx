"use client"

import React, { useState, useRef, useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { v4 as uuidv4 } from "uuid"
import { TaskItem } from "./task-item"
import { DraggableTaskElement } from "./draggable-task-element"
import { DropTargetElement } from "./project-sections-view-helper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TimeEstimationPopover } from "./time-estimation-popover"
import { CheckSquare, Plus, ClockFading, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/utils/time-estimation"
import { extractDropPayload, reorderItems } from "@tasktrove/dom-utils"
import { updateTaskAtom, tasksAtom } from "@tasktrove/atoms"
import { quickAddTaskAtom, updateQuickAddTaskAtom } from "@tasktrove/atoms"
import { useTranslation } from "@tasktrove/i18n"
import type { Task, Subtask, CreateTaskRequest } from "@/lib/types"
import { createSubtaskId, createTaskId } from "@/lib/types"
import type { ElementDropTargetEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"

interface SubtaskContentProps {
  taskId?: string // Optional for quick-add mode
  task?: Task // Deprecated - use taskId instead
  mode?: "inline" | "popover"
  className?: string
  persistEstimationOnAdd?: boolean // If true, keeps the estimation value after adding a subtask
  scrollToBottomKey?: number // When this changes, triggers scroll to bottom
}

export function SubtaskContent({
  taskId,
  task: legacyTask,
  mode = "inline",
  className,
  persistEstimationOnAdd = true,
  scrollToBottomKey,
}: SubtaskContentProps) {
  // Translation setup
  const { t } = useTranslation("task")

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
  const [newSubtaskEstimation, setNewSubtaskEstimation] = useState(0)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false)
  const subtasksContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when a new subtask is added
  useEffect(() => {
    if (shouldScrollToBottom && subtasksContainerRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      const scrollWithAnimation = () => {
        if (subtasksContainerRef.current) {
          subtasksContainerRef.current.scrollTo({
            top: subtasksContainerRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
        setShouldScrollToBottom(false)
      }

      // Use requestAnimationFrame to ensure the next paint cycle
      requestAnimationFrame(scrollWithAnimation)
    }
  }, [task?.subtasks?.length, shouldScrollToBottom])

  // Scroll to bottom when popover opens (triggered by scrollToBottomKey change)
  useEffect(() => {
    if (scrollToBottomKey !== undefined && scrollToBottomKey > 0 && subtasksContainerRef.current) {
      // Use requestAnimationFrame for immediate popover opening scroll
      const scrollWithAnimation = () => {
        if (subtasksContainerRef.current) {
          subtasksContainerRef.current.scrollTo({
            top: subtasksContainerRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
      }

      // Use requestAnimationFrame to ensure immediate smooth animation
      requestAnimationFrame(scrollWithAnimation)
    }
  }, [scrollToBottomKey])

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
      estimation: newSubtaskEstimation > 0 ? newSubtaskEstimation : undefined,
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
    if (!persistEstimationOnAdd) {
      setNewSubtaskEstimation(0)
    }
    setShouldScrollToBottom(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddSubtask()
    }
  }

  // Handle subtask reordering
  const handleSubtaskDrop = (args: ElementDropTargetEventBasePayload) => {
    // Extract and validate drop payload
    const payload = extractDropPayload(args)
    if (!payload) return

    const { draggedIds, instruction, targetId } = payload

    // Get current subtasks
    const currentSubtasks = task.subtasks || []

    // Reorder subtasks using the utility function
    const reorderedSubtasks = reorderItems(
      currentSubtasks,
      draggedIds,
      targetId,
      instruction,
      (subtask) => String(subtask.id),
    )

    if (!reorderedSubtasks) return

    // Update order values
    const subtasksWithOrder = reorderedSubtasks.map((subtask, index) => ({
      ...subtask,
      order: index,
    }))

    // Update appropriate atom based on context
    if (isNewTask) {
      updateQuickAddTask({ updateRequest: { subtasks: subtasksWithOrder } })
    } else if (legacyTask) {
      updateTask({ updateRequest: { id: legacyTask.id, subtasks: subtasksWithOrder } })
    } else if (taskId) {
      updateTask({ updateRequest: { id: createTaskId(taskId), subtasks: subtasksWithOrder } })
    }
  }

  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0
  const totalSubtasks = task.subtasks?.length || 0

  return (
    <div className={cn("space-y-3", mode === "popover" && "p-3", className)}>
      {/* Header - only show in popover mode */}
      {mode === "popover" && (
        <div className="flex items-center justify-between border-b pb-2 mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="font-medium text-sm">{t("subtasks.title", "Subtasks")}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => {
              /* Close handled by ContentPopover */
            }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header - Show title for inline mode only */}
      {mode !== "popover" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">
              {totalSubtasks > 0
                ? t("subtasks.title", "Subtasks")
                : t("subtasks.addSubtask", "Add Subtask")}
            </span>
          </div>
          {totalSubtasks > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedSubtasks}/{totalSubtasks} completed
            </span>
          )}
        </div>
      )}

      {/* Subtasks List */}
      {totalSubtasks > 0 && (
        <div ref={subtasksContainerRef} className="space-y-1 max-h-64 overflow-y-auto py-1.5">
          {task.subtasks
            ?.sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((subtask) => (
              <DropTargetElement
                key={subtask.id}
                id={`${subtask.id}`}
                options={{
                  type: "list-item",
                  indicator: { lineGap: "0.25rem" },
                  testId: `subtask-drop-${subtask.id}`,
                }}
                onDrop={handleSubtaskDrop}
              >
                <div data-subtask-id={String(subtask.id)}>
                  <DraggableTaskElement taskId={createTaskId(String(subtask.id))}>
                    <TaskItem
                      taskId={createTaskId(String(subtask.id))}
                      variant="subtask"
                      parentTask={isNewTask ? undefined : task} // Don't pass parentTask for new tasks (quick-add will use quickAddTaskAtom)
                    />
                  </DraggableTaskElement>
                </div>
              </DropTargetElement>
            ))}
        </div>
      )}

      {/* Add New Subtask Section - Always visible input with button */}
      <div className="flex gap-1">
        <Input
          placeholder={
            totalSubtasks > 0
              ? t("subtasks.addAnotherSubtask", "Add another subtask...")
              : t("subtasks.addSubtasks", "Add subtasks...")
          }
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm flex-1"
          data-testid="subtask-input"
        />
        <TimeEstimationPopover
          value={newSubtaskEstimation}
          onChange={(estimation) => setNewSubtaskEstimation(estimation || 0)}
        >
          <div className="h-9 min-w-9 px-2 hover:no-underline flex items-center justify-center cursor-pointer rounded-md border border-input hover:bg-accent hover:text-accent-foreground transition-colors">
            {newSubtaskEstimation === 0 && (
              <ClockFading className="h-4 w-4 text-muted-foreground" />
            )}
            {newSubtaskEstimation > 0 && (
              <div className="flex items-center gap-1">
                <ClockFading className="h-3 w-3 opacity-70" />
                <span className="text-xs font-medium leading-none">
                  {formatTime(newSubtaskEstimation)}
                </span>
              </div>
            )}
          </div>
        </TimeEstimationPopover>
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
