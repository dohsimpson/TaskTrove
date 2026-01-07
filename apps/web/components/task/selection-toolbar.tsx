"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { v4 as uuidv4 } from "uuid"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SimpleInputDialog } from "@/components/ui/custom/simple-input-dialog"
import {
  CheckSquare,
  Trash2,
  Flag,
  MoreHorizontal,
  X,
  MessageSquare,
  ListTodo,
  CheckCircle,
  XCircle,
  Plus,
  Folder,
  GripVertical,
} from "lucide-react"
import { selectedTasksAtom, clearSelectedTasksAtom } from "@tasktrove/atoms/ui/selection"
import { tasksAtom } from "@tasktrove/atoms/data/base/atoms"
import { deleteTasksAtom, updateTasksAtom } from "@tasktrove/atoms/core/tasks"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"
import { PriorityPopover } from "@/components/task/priority-popover"
import { TaskSchedulePopover } from "@/components/task/task-schedule-popover"
import { TaskScheduleTrigger } from "@/components/task/task-schedule-trigger"
import { ProjectPopover } from "@/components/task/project-popover"
import { TaskSearchDialog } from "@/components/task/task-search-dialog"
import { cn } from "@/lib/utils"
import { createCommentId, createSubtaskId, createTaskId, createUserId } from "@tasktrove/types/id"
import { DraggableTaskElement } from "./draggable-task-element"
import { BulkAssigneeButton } from "@/components/task/bulk-assignee-button"
import { DEFAULT_UUID } from "@tasktrove/constants"
import type { TaskComment, Subtask } from "@tasktrove/types/core"
import type { TaskId } from "@tasktrove/types/id"

interface SelectionToolbarProps {
  className?: string
}

export function SelectionToolbar({ className }: SelectionToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [showAddCommentDialog, setShowAddCommentDialog] = React.useState(false)
  const [showAddSubtaskDialog, setShowAddSubtaskDialog] = React.useState(false)
  const [showConvertToSubtasks, setShowConvertToSubtasks] = React.useState(false)
  const [commentInput, setCommentInput] = React.useState("")
  const [subtaskInput, setSubtaskInput] = React.useState("")

  // Selection state - simplified to use only selectedTasksAtom
  const selectedTaskIds = useAtomValue(selectedTasksAtom)

  // Get all tasks to map IDs to Task objects
  const allTasks = useAtomValue(tasksAtom)

  // Note: currentUser can be obtained from userAtom if needed for future features
  const selectedTasks = React.useMemo(
    () => allTasks.filter((task) => selectedTaskIds.includes(task.id)),
    [allTasks, selectedTaskIds],
  )

  // Simplified selection state - show toolbar when there are selected tasks
  const hasSelection = selectedTaskIds.length > 0

  // Bulk actions - use tasksAtom directly
  const updateTasks = useSetAtom(updateTasksAtom)
  const deleteTasks = useSetAtom(deleteTasksAtom)

  // Selection actions
  const clearSelection = useSetAtom(clearSelectedTasksAtom)

  // Register Escape key to clear selection - hook now handles unstable dependencies gracefully
  useKeyboardShortcuts(
    {
      Escape: () => {
        clearSelection()
        return true
      },
    },
    {
      componentId: "selection-toolbar",
      priority: 30, // High priority - selection clearing is important
      excludeDialogs: true, // Don't interfere with open dialogs
      enabled: hasSelection, // Only active when there are selected tasks
    },
  )

  // Don't render if no tasks are selected
  if (!hasSelection) {
    return null
  }

  const handleClearSelection = () => {
    clearSelection()
  }

  const handleBulkComplete = () => {
    // Complete all selected tasks
    const updates = selectedTaskIds.map((id) => ({ id, completed: true }))
    updateTasks(updates)
    // Clear selection after completing
    handleClearSelection()
  }

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    // For bulk task deletion, we don't currently use deleteContainedResources
    // but we need to match the new DeleteConfirmDialog signature
    deleteTasks(selectedTaskIds)
    setShowDeleteConfirm(false)
    // Clear selection after deleting
    handleClearSelection()
  }

  const handleClearComments = () => {
    const updates = selectedTaskIds.map((id) => ({ id, comments: [] }))
    updateTasks(updates)
  }

  const handleClearSubtasks = () => {
    const updates = selectedTaskIds.map((id) => ({ id, subtasks: [] }))
    updateTasks(updates)
  }

  const handleCompleteSubtasks = () => {
    const updates = selectedTasks.map((task) => ({
      id: task.id,
      subtasks: task.subtasks.map((subtask) => ({ ...subtask, completed: true })),
    }))
    updateTasks(updates)
  }

  const handleUncompleteSubtasks = () => {
    const updates = selectedTasks.map((task) => ({
      id: task.id,
      subtasks: task.subtasks.map((subtask) => ({ ...subtask, completed: false })),
    }))
    updateTasks(updates)
  }

  const handleAddComment = () => {
    if (!commentInput.trim()) return

    const newComment: TaskComment = {
      id: createCommentId(uuidv4()),
      userId: createUserId(DEFAULT_UUID),
      content: commentInput.trim(),
      createdAt: new Date(),
    }

    const updates = selectedTasks.map((task) => ({
      id: task.id,
      comments: [...task.comments, newComment],
    }))

    updateTasks(updates)
    setCommentInput("")
    setShowAddCommentDialog(false)
  }

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return

    const newSubtask: Subtask = {
      id: createSubtaskId(uuidv4()),
      title: subtaskInput.trim(),
      completed: false,
    }

    const updates = selectedTasks.map((task) => ({
      id: task.id,
      subtasks: [...task.subtasks, newSubtask],
    }))

    updateTasks(updates)
    setSubtaskInput("")
    setShowAddSubtaskDialog(false)
  }

  const handleConvertToSubtasks = (parentTaskId: TaskId) => {
    // Convert selected tasks to subtasks of the chosen parent task
    const newSubtasks: Subtask[] = selectedTasks.map((task) => ({
      id: createSubtaskId(uuidv4()),
      title: task.title,
      completed: task.completed,
      order: task.subtasks.length, // Will be set properly when updating parent
    }))

    // Update parent task to add new subtasks
    updateTasks([
      {
        id: parentTaskId,
        subtasks: [
          ...(allTasks.find((t) => t.id === parentTaskId)?.subtasks || []),
          ...newSubtasks,
        ],
      },
    ])

    // Delete the original tasks (they're now subtasks)
    deleteTasks(selectedTaskIds)

    // Clear selection - dialog will close automatically via TaskSearchDialog
    handleClearSelection()
  }

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-20 bg-background flex items-center justify-between py-3",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          {/* Draggable selection count - reuses DraggableTaskElement for multi-select drag, passing a placeholder ID */}
          <DraggableTaskElement taskId={createTaskId(DEFAULT_UUID)}>
            <div className="flex items-center gap-2 px-2 py-1 rounded cursor-grab hover:bg-muted/50 transition-colors border-1 bg-muted/5">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {selectedTasks.length} selected
              </span>
            </div>
          </DraggableTaskElement>

          {/* Quick actions */}
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2 ml-2">
              {/* Complete tasks */}
              <Button size="sm" variant="ghost" onClick={handleBulkComplete} className="h-8">
                <CheckSquare className="h-4 w-4 mr-1.5" />
                Complete
              </Button>

              {/* Schedule popover */}
              <TaskSchedulePopover taskId={selectedTaskIds}>
                <Button size="sm" variant="ghost" className="h-8">
                  <TaskScheduleTrigger variant="button" fallbackLabel="Schedule" />
                </Button>
              </TaskSchedulePopover>

              {/* Priority popover */}
              <PriorityPopover task={selectedTasks}>
                <Button size="sm" variant="ghost" className="h-8">
                  <Flag className="h-4 w-4 mr-1.5" />
                  Priority
                </Button>
              </PriorityPopover>

              {/* Project popover */}
              <ProjectPopover task={selectedTasks}>
                <Button size="sm" variant="ghost" className="h-8">
                  <Folder className="h-4 w-4 mr-1.5" />
                  Project
                </Button>
              </ProjectPopover>

              {/* Bulk Assignee Button */}
              <BulkAssigneeButton taskIds={selectedTaskIds} />

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 px-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setShowAddCommentDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add comment
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddSubtaskDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add subtask
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowConvertToSubtasks(true)}>
                    <ListTodo className="h-4 w-4 mr-2" />
                    Convert to subtasks
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCompleteSubtasks}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete all subtasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleUncompleteSubtasks}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Uncomplete all subtasks
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleClearComments}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Clear all comments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleClearSubtasks}>
                    <ListTodo className="h-4 w-4 mr-2" />
                    Clear all subtasks
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleBulkDelete}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Cancel button */}
        <Button variant="ghost" size="sm" onClick={handleClearSelection} className="h-8">
          <X className="h-4 w-4 mr-1.5" />
          Cancel
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        entityType="bulk"
        entityCount={selectedTasks.length}
      />

      {/* Add comment dialog */}
      <SimpleInputDialog
        open={showAddCommentDialog}
        onOpenChange={setShowAddCommentDialog}
        title={`Add comment to ${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""}`}
        placeholder="Enter comment..."
        value={commentInput}
        onChange={setCommentInput}
        onSubmit={handleAddComment}
      />

      {/* Add subtask dialog */}
      <SimpleInputDialog
        open={showAddSubtaskDialog}
        onOpenChange={setShowAddSubtaskDialog}
        title={`Add subtask to ${selectedTasks.length} task${selectedTasks.length !== 1 ? "s" : ""}`}
        placeholder="Enter subtask title..."
        value={subtaskInput}
        onChange={setSubtaskInput}
        onSubmit={handleAddSubtask}
      />

      {/* Convert to subtasks dialog */}
      <TaskSearchDialog
        open={showConvertToSubtasks}
        onOpenChange={setShowConvertToSubtasks}
        title={`Convert ${selectedTasks.length} selected task${selectedTasks.length !== 1 ? "s" : ""} to subtasks`}
        onTaskSelect={handleConvertToSubtasks}
        excludeTaskIds={selectedTaskIds}
        placeholder="Search for parent task..."
      />
    </>
  )
}
