"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog"
import {
  MoreHorizontal,
  Trash2,
  // Timer, // Commented out since pomodoro timer is disabled
  Edit3,
  ClockFading,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/types"
// import { openPomodoroAtom } from "@/lib/atoms/ui/dialogs" // Commented out since pomodoro timer is disabled

interface TaskActionsMenuProps {
  task: Task
  isVisible: boolean
  onDeleteClick: () => void
  onEditClick?: () => void
  onEstimationClick?: () => void
  variant?: "full" | "compact" | "kanban" | "subtask"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TaskActionsMenu({
  task,
  isVisible,
  onDeleteClick,
  onEditClick,
  onEstimationClick,
  variant = "full",
  open,
  onOpenChange,
}: TaskActionsMenuProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [internalOpen, setInternalOpen] = useState(false)
  // const openPomodoro = useSetAtom(openPomodoroAtom) // Commented out since pomodoro timer is disabled

  // Use controlled or uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  // Fix Radix UI pointer-events bug where body gets stuck with pointer-events: none
  // When Radix components (DropdownMenu, Dialog, etc.) open, they set pointer-events: none
  // on the body to prevent interactions outside the modal. However, this can sometimes
  // persist after the component closes, making the entire page uninteractive.
  // This affects third-party modals (like Stripe) and general page interactions.
  // For fix, see: https://github.com/radix-ui/primitives/issues/2122#issuecomment-1666753771
  useEffect(() => {
    if (isOpen) {
      // Pushing the change to the end of the call stack to ensure pointer events are restored
      // after Radix has finished its setup, preventing the body from staying locked
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = ""
      }, 0)

      return () => clearTimeout(timer)
    } else {
      // Explicitly restore pointer events when dropdown closes
      document.body.style.pointerEvents = "auto"
    }
  }, [isOpen])

  const handleDeleteClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    setShowDeleteConfirm(true)
    // setIsOpen(false)
  }

  const handleConfirmDelete = (deleteContainedResources?: boolean) => {
    // For task deletion, we don't currently use deleteContainedResources
    // but we need to match the new DeleteConfirmDialog signature
    onDeleteClick()
    setShowDeleteConfirm(false)
  }

  const handleEditClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onEditClick?.()
    // setIsOpen(false)
  }

  const handleEstimationClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    onEstimationClick?.()
    // setIsOpen(false) // NOTE: Must not close menu when opening estimation modal, otherwise estimation modal is closed too
  }

  // const handleTimerClick = () => {
  //   openPomodoro(task)
  //   setIsOpen(false)
  // } // Commented out since pomodoro timer is disabled

  if (variant === "compact" || variant === "kanban" || variant === "subtask") {
    return (
      <>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-5 w-5 p-0 m-0 flex-shrink-0 flex items-center justify-center",
                isVisible ? "flex" : "hidden",
              )}
              data-action="menu"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={cn("w-32", variant === "subtask" && "w-36")}>
            {onEditClick && (
              <DropdownMenuItem onClick={handleEditClick}>
                <Edit3 className="h-3.5 w-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {variant === "subtask" && onEstimationClick && (
              <DropdownMenuItem onClick={handleEstimationClick}>
                <ClockFading className="h-3.5 w-3.5 mr-2" />
                Estimation
              </DropdownMenuItem>
            )}
            {/* <DropdownMenuItem onClick={handleTimerClick}>
              <Timer className="h-3.5 w-3.5 mr-2" />
              Start timer
            </DropdownMenuItem> */}
            <DropdownMenuItem
              onClick={handleDeleteClick}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DeleteConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleConfirmDelete}
          entityType="task"
          entityName={task.title}
        />
      </>
    )
  }

  // Full variant (original implementation)
  return (
    <>
      <div className={cn("flex items-center gap-1 h-5", isVisible ? "block" : "hidden")}>
        {/* Delete Button */}
        <Button
          variant="ghost"
          className="text-red-600 hover:text-red-700 cursor-pointer h-full w-5"
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        {/* More Actions Menu */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="cursor-pointer h-full w-5">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEditClick && (
              <DropdownMenuItem onClick={handleEditClick}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {/* <DropdownMenuItem onClick={handleTimerClick}>
              <Timer className="h-4 w-4 mr-2" />
              Start timer
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleConfirmDelete}
        entityType="task"
        entityName={task.title}
      />
    </>
  )
}
