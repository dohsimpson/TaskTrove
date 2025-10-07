"use client"

import type React from "react"
import type { TaskId } from "@/lib/types"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TaskCheckbox } from "@/components/ui/custom/task-checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  CheckSquare,
  Trash2,
  Calendar,
  Tag,
  Flag,
  Archive,
  Copy,
  Move,
  MoreHorizontal,
} from "lucide-react"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"

interface Task {
  id: TaskId
  title: string
  completed: boolean
  priority: number
  dueDate?: Date
  labels: string[]
  projectId: string
}

interface BulkTaskSelectorProps {
  tasks: Task[]
  selectedTasks: TaskId[]
  onSelectionChange: (selectedIds: TaskId[]) => void
  onBulkAction: (action: string, taskIds: TaskId[]) => void
}

export function BulkTaskSelector({
  tasks,
  selectedTasks,
  onSelectionChange,
  onBulkAction,
}: BulkTaskSelectorProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    if (isSelectionMode) {
      onSelectionChange([])
    }
  }

  const selectAll = () => {
    onSelectionChange(tasks.map((task) => task.id))
  }

  const deselectAll = () => {
    onSelectionChange([])
  }

  const handleBulkAction = (action: string) => {
    if (action === "delete") {
      setShowDeleteConfirm(true)
      return
    }
    onBulkAction(action, selectedTasks)
    if (action === "complete" || action === "archive") {
      onSelectionChange([])
    }
  }

  const handleConfirmDelete = () => {
    // For bulk task deletion, we don't currently use deleteContainedResources
    // but we need to match the new DeleteConfirmDialog signature
    onBulkAction("delete", selectedTasks)
    onSelectionChange([])
  }

  if (!isSelectionMode) {
    return (
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{tasks.length} tasks</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSelectionMode}
          className="text-gray-600 bg-transparent"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Select
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <TaskCheckbox
            checked={selectedTasks.length === tasks.length && tasks.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                selectAll()
              } else {
                deselectAll()
              }
            }}
          />
          <span className="text-sm font-medium text-blue-900">
            {selectedTasks.length} of {tasks.length} selected
          </span>
        </div>

        {selectedTasks.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("complete")}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Complete
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction("schedule-today")}>
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("schedule-tomorrow")}>
                  Tomorrow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("schedule-next-week")}>
                  Next week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("schedule-custom")}>
                  Custom date...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Flag className="h-4 w-4 mr-1" />
                  Priority
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction("priority-1")}>
                  <Flag className="h-4 w-4 mr-2 text-red-500" />
                  Priority 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("priority-2")}>
                  <Flag className="h-4 w-4 mr-2 text-orange-500" />
                  Priority 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("priority-3")}>
                  <Flag className="h-4 w-4 mr-2 text-blue-500" />
                  Priority 3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("priority-4")}>
                  <Flag className="h-4 w-4 mr-2 text-gray-400" />
                  Priority 4
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction("add-label")}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add label
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("move-project")}>
                  <Move className="h-4 w-4 mr-2" />
                  Move to project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("duplicate")}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction("archive")}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkAction("delete")}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <Button variant="ghost" size="sm" onClick={toggleSelectionMode} className="text-blue-700">
        Cancel
      </Button>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        entityType="bulk"
        entityCount={selectedTasks.length}
      />
    </div>
  )
}

export function BulkSelectableTaskItem({
  task,
  isSelected,
  isSelectionMode,
  onToggleSelection,
  children,
}: {
  task: Task
  isSelected: boolean
  isSelectionMode: boolean
  onToggleSelection: (taskId: TaskId) => void
  children: React.ReactNode
}) {
  return (
    <div className={`flex items-start gap-3 ${isSelectionMode ? "pl-2" : ""}`}>
      {isSelectionMode && (
        <TaskCheckbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(task.id)}
          className="mt-1"
        />
      )}
      <div className={`flex-1 ${isSelected ? "bg-blue-50 rounded-lg p-2" : ""}`}>{children}</div>
    </div>
  )
}
