"use client"

import React from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { v4 as uuidv4 } from "uuid"
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
  Calendar,
  Flag,
  MoreHorizontal,
  X,
  Square,
  MessageSquare,
  ListTodo,
  CheckCircle,
  XCircle,
  Plus,
  Folder,
} from "lucide-react"
import {
  selectionModeAtom,
  selectedTasksAtom,
  exitSelectionModeAtom,
  clearSelectionAtom,
  selectAllVisibleTasksAtom,
  allVisibleTasksSelectedAtom,
} from "@/lib/atoms"
import { tasksAtom, deleteTasksAtom } from "@/lib/atoms"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"
import { PriorityPopover } from "@/components/task/priority-popover"
import { TaskSchedulePopover } from "@/components/task/task-schedule-popover"
import { ProjectPopover } from "@/components/task/project-popover"
import { cn } from "@/lib/utils"
import { createCommentId, createSubtaskId } from "@/lib/types"
import type { TaskComment, Subtask } from "@/lib/types"

interface SelectionToolbarProps {
  className?: string
}

export function SelectionToolbar({ className }: SelectionToolbarProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false)
  const [showAddCommentDialog, setShowAddCommentDialog] = React.useState(false)
  const [showAddSubtaskDialog, setShowAddSubtaskDialog] = React.useState(false)
  const [commentInput, setCommentInput] = React.useState("")
  const [subtaskInput, setSubtaskInput] = React.useState("")

  // Selection state
  const selectionMode = useAtomValue(selectionModeAtom)
  const selectedTaskIds = useAtomValue(selectedTasksAtom)
  const allVisibleSelected = useAtomValue(allVisibleTasksSelectedAtom)

  // Get all tasks to map IDs to Task objects
  const allTasks = useAtomValue(tasksAtom)
  const selectedTasks = React.useMemo(
    () => allTasks.filter((task) => selectedTaskIds.includes(task.id)),
    [allTasks, selectedTaskIds],
  )

  // Selection actions
  const exitSelectionMode = useSetAtom(exitSelectionModeAtom)
  const clearSelection = useSetAtom(clearSelectionAtom)
  const selectAllVisible = useSetAtom(selectAllVisibleTasksAtom)

  // Bulk actions - use tasksAtom directly
  const updateTasks = useSetAtom(tasksAtom)
  const deleteTasks = useSetAtom(deleteTasksAtom)

  // Handle Escape key to exit selection mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectionMode) {
        exitSelectionMode()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectionMode, exitSelectionMode])

  // Don't render if not in selection mode
  if (!selectionMode) {
    return null
  }

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      clearSelection()
    } else {
      selectAllVisible()
    }
  }

  const handleBulkComplete = () => {
    // Complete all selected tasks
    const updates = selectedTaskIds.map((id) => ({ id, completed: true }))
    updateTasks(updates)
    // Exit selection mode after completing
    exitSelectionMode()
  }

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (deleteContainedResources?: boolean) => {
    // For bulk task deletion, we don't currently use deleteContainedResources
    // but we need to match the new DeleteConfirmDialog signature
    deleteTasks(selectedTaskIds)
    setShowDeleteConfirm(false)
    // Exit selection mode after deleting
    exitSelectionMode()
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

  return (
    <>
      <div className={cn("flex items-center justify-between pb-3 mb-3 border-b", className)}>
        <div className="flex items-center gap-3">
          {/* Selection count and select all toggle */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8">
              {allVisibleSelected ? (
                <CheckSquare className="h-4 w-4 mr-1.5" />
              ) : (
                <Square className="h-4 w-4 mr-1.5" />
              )}
              {allVisibleSelected ? "Deselect All" : "Select All"}
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {selectedTasks.length} selected
            </span>
          </div>

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
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Schedule
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
        <Button variant="ghost" size="sm" onClick={exitSelectionMode} className="h-8">
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
    </>
  )
}
